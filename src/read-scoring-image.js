const abortError = () =>
  new DOMException("Screenshot reading cancelled.", "AbortError");

async function prepareImage(file, signal) {
  if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Choose a PNG, JPG, or WebP screenshot.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Choose a screenshot smaller than 10 MB.");
  const url = URL.createObjectURL(file);
  try {
    const source = new Image();
    source.src = url;
    await source.decode();
    if (signal.aborted) throw abortError();
    if (
      !source.naturalWidth ||
      !source.naturalHeight ||
      source.naturalWidth * source.naturalHeight > 20_000_000
    )
      throw new Error(
        "Crop the screenshot to the scoring table (up to 20 megapixels).",
      );
    const scale = Math.min(
      6,
      Math.max(1, 1200 / source.naturalWidth),
      6000 / source.naturalWidth,
      12000 / source.naturalHeight,
      Math.sqrt(10_000_000 / (source.naturalWidth * source.naturalHeight)),
    );
    const canvas = document.createElement("canvas");
    const padding = 24;
    canvas.width = Math.round(source.naturalWidth * scale) + padding * 2;
    canvas.height = Math.round(source.naturalHeight * scale) + padding * 2;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx)
      throw new Error(
        "This browser could not prepare the screenshot. Try another browser.",
      );
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      source,
      padding,
      padding,
      canvas.width - padding * 2,
      canvas.height - padding * 2,
    );
    const pixels = ctx.getImageData(
      padding,
      padding,
      canvas.width - padding * 2,
      canvas.height - padding * 2,
    );
    let dark = 0,
      samples = 0;
    for (let i = 0; i < pixels.data.length; i += 64) {
      dark +=
        pixels.data[i] * 0.299 +
          pixels.data[i + 1] * 0.587 +
          pixels.data[i + 2] * 0.114 <
        128;
      samples++;
    }
    const invert = dark > samples / 2;
    for (let i = 0; i < pixels.data.length; i += 4) {
      let gray =
        pixels.data[i] * 0.299 +
        pixels.data[i + 1] * 0.587 +
        pixels.data[i + 2] * 0.114;
      if (invert) gray = 255 - gray;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = gray;
    }
    ctx.putImageData(pixels, padding, padding);
    return canvas;
  } catch (error) {
    if (error.name === "EncodingError")
      throw new Error(
        "This file could not be read as an image. Try another screenshot.",
      );
    throw error;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function readScoringImage(
  file,
  { signal, onProgress = () => {} },
) {
  let worker;
  let timeout;
  let rejectStopped;
  let finished = false;
  const stopped = new Promise((_, reject) => {
    rejectStopped = reject;
  });
  // Cancellation also covers initialization and broken asset/model requests.
  const stop = () => {
    rejectStopped(abortError());
    worker?.terminate();
  };
  signal.addEventListener("abort", stop, { once: true });
  timeout = setTimeout(
    () =>
      rejectStopped(
        new Error(
          "Reading took too long. Try a smaller, clearer crop of the table.",
        ),
      ),
    90000,
  );
  try {
    const task = (async () => {
      if (signal.aborted) throw abortError();
      onProgress({ message: "Preparing screenshot…", progress: 0 });
      const canvas = await prepareImage(file, signal);
      const { createWorker, PSM } = await import("tesseract.js");
      if (signal.aborted) throw abortError();
      const base = new URL(
        import.meta.env.BASE_URL + "ocr/",
        window.location.origin,
      ).href;
      const created = await createWorker("eng", 1, {
        workerPath: base + "worker.min.js",
        corePath: base,
        langPath: base,
        workerBlobURL: false,
        cacheMethod: "none",
        logger: (event) => {
          if (!finished)
            onProgress({
              message:
                event.status === "recognizing text"
                  ? "Reading placement rows…"
                  : "Loading screenshot reader…",
              progress:
                event.status === "recognizing text"
                  ? 0.3 + event.progress * 0.7
                  : 0.15,
            });
        },
        errorHandler: () =>
          rejectStopped(
            new Error(
              "The screenshot reader could not load. Check your connection and try again.",
            ),
          ),
      });
      worker = created;
      if (signal.aborted || finished) {
        await worker.terminate();
        throw abortError();
      }
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });
      const { data } = await worker.recognize(
        canvas,
        {},
        { text: true, blocks: true },
      );
      return data;
    })();
    return await Promise.race([task, stopped]);
  } catch (error) {
    if (error instanceof Error || error instanceof DOMException) throw error;
    throw new Error(
      "The screenshot reader could not load. Check your connection and try again.",
    );
  } finally {
    finished = true;
    clearTimeout(timeout);
    signal.removeEventListener("abort", stop);
    await worker?.terminate();
  }
}
