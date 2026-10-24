import { test, expect } from "@playwright/test";

// These are synthetic test images, not the original chat attachment. OCR is
// real in these tests: the worker, WASM, and English model are not mocked.
async function screenshotFile(
  page,
  { dark = true, rows = 50, elimination = false, blank = false } = {},
) {
  const encoded = await page.evaluate(
    ({ dark, rows, elimination, blank }) => {
      const canvas = document.createElement("canvas");
      canvas.width = dark ? 155 : 400;
      canvas.height = dark ? 790 : 220;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = dark ? "#181818" : "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = dark ? "white" : "#111";
      ctx.font = dark ? "bold 9px Arial" : "bold 16px Arial";
      if (!blank) {
        ctx.fillText("Placement", 8, dark ? 16 : 24);
        ctx.fillText("Points", dark ? 112 : 220, dark ? 16 : 24);
        for (let rank = 1; rank <= rows; rank++) {
          const suffix =
            rank % 100 >= 11 && rank % 100 <= 13
              ? "th"
              : ({ 1: "st", 2: "nd", 3: "rd" }[rank % 10] ?? "th");
          const points = rank < 4 ? [60, 53, 49][rank - 1] : 51 - rank;
          const bonus = rank < 4 ? [7, 4, 2][rank - 1] : 1;
          ctx.fillText(
            `${rank}${suffix}`,
            25,
            (dark ? 37 : 65) + (rank - 1) * (dark ? 15 : 32),
          );
          ctx.fillText(
            `${points} (+${bonus})`,
            dark ? 111 : 220,
            (dark ? 37 : 65) + (rank - 1) * (dark ? 15 : 32),
          );
        }
        if (elimination) ctx.fillText("Points per elimination: 3", 8, 195);
      }
      return canvas.toDataURL("image/png").split(",")[1];
    },
    { dark, rows, elimination, blank },
  );
  return {
    name: "synthetic-scoring-table.png",
    mimeType: "image/png",
    buffer: Buffer.from(encoded, "base64"),
  };
}

test("real OCR reads the narrow 50-row dark format, preserves totals, and supports undo", async ({
  page,
}) => {
  test.setTimeout(90000);
  const external = [];
  const ocrRequests = [];
  page.on("request", (request) => {
    if (
      !request.url().startsWith("http://127.0.0.1:5173/") &&
      !request.url().startsWith("blob:")
    )
      external.push(request.url());
    if (request.url().includes("/ocr/")) ocrRequests.push(request.url());
  });
  await page.goto("/#scoring");
  expect(ocrRequests).toEqual([]);
  await page.getByLabel("Points per elimination", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Add placement tier", exact: true })
    .click();
  await page.getByLabel("Tier 1 top finish", { exact: true }).fill("1");
  await page.getByLabel("Tier 1 total points", { exact: true }).fill("20");
  await page.getByLabel("Scoring finish", { exact: true }).fill("1");
  await page.getByLabel("Scoring eliminations", { exact: true }).fill("3");
  await page
    .getByLabel("Upload scoring screenshot", { exact: true })
    .setInputFiles(await screenshotFile(page));
  await expect(
    page.getByRole("heading", {
      name: "Review 50 placement rows",
      exact: true,
    }),
  ).toBeVisible({ timeout: 60000 });
  for (let rank = 1; rank <= 50; rank++) {
    await expect(
      page.getByLabel(`Read row ${rank} finish`, { exact: true }),
    ).toHaveValue(String(rank));
    await expect(
      page.getByLabel(`Read row ${rank} points`, { exact: true }),
    ).toHaveValue(String(rank < 4 ? [60, 53, 49][rank - 1] : 51 - rank));
  }
  await expect(page.getByTestId("match-score")).toHaveText("26");
  await page.getByLabel("Read row 1 points", { exact: true }).fill("61");
  await page
    .getByRole("button", { name: "Apply screenshot numbers", exact: true })
    .click();
  await expect(
    page.getByLabel("Tier 1 total points", { exact: true }),
  ).toHaveValue("61");
  await expect(
    page.getByLabel("Points per elimination", { exact: true }),
  ).toHaveValue("2");
  await expect(page.getByTestId("match-score")).toHaveText("67");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("compiq-scoring-v1")),
  );
  expect(saved.tiers).toHaveLength(50);
  expect(saved.tiers[49].points).toBe("1");
  expect(JSON.stringify(saved)).not.toContain("data:image");
  await page
    .getByRole("button", { name: "Undo screenshot import", exact: true })
    .click();
  await expect(page.getByTestId("match-score")).toHaveText("26");
  expect(ocrRequests.some((url) => url.endsWith("eng.traineddata.gz"))).toBe(
    true,
  );
  expect(external).toEqual([]);
});

test("light screenshots read explicit elimination points and fit a small mobile screen", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/#scoring");
  await page
    .getByLabel("Upload scoring screenshot", { exact: true })
    .setInputFiles(
      await screenshotFile(page, { dark: false, rows: 3, elimination: true }),
    );
  await expect(
    page.getByRole("heading", { name: "Review 3 placement rows", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await expect(
    page.getByLabel("Imported points per elimination (optional)", {
      exact: true,
    }),
  ).toHaveValue("3");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Apply screenshot numbers", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByLabel("Tier 1 total points", { exact: true }),
  ).toHaveValue("60");
  await expect(
    page.getByLabel("Points per elimination", { exact: true }),
  ).toHaveValue("3");
});

test("invalid files, cancellation, and unreadable images leave existing scores intact", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/#scoring");
  await page.getByLabel("Points per elimination", { exact: true }).fill("4");
  const upload = page.getByLabel("Upload scoring screenshot", { exact: true });
  await upload.setInputFiles({
    name: "not-an-image.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("1st 60"),
  });
  await expect(page.getByRole("alert")).toContainText("PNG, JPG, or WebP");
  await upload.setInputFiles(await screenshotFile(page));
  await page
    .getByRole("button", { name: "Cancel reading", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Apply screenshot numbers", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Points per elimination", { exact: true }),
  ).toHaveValue("4");
  await upload.setInputFiles(
    await screenshotFile(page, { dark: false, rows: 0, blank: true }),
  );
  await expect(
    page.getByRole("heading", { name: "Review 0 placement rows", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await expect(
    page.getByRole("button", { name: "Apply screenshot numbers", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Points per elimination", { exact: true }),
  ).toHaveValue("4");
});

test("reader download failures show a retryable error without replacing the form", async ({
  page,
}) => {
  await page.route("**/ocr/worker.min.js", (route) => route.abort());
  await page.goto("/#scoring");
  await page.getByLabel("Points per elimination", { exact: true }).fill("5");
  await page
    .getByLabel("Upload scoring screenshot", { exact: true })
    .setInputFiles(await screenshotFile(page));
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByLabel("Points per elimination", { exact: true }),
  ).toHaveValue("5");
});
