import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MAP_SOURCE_URL, BUNDLED_MAP_PATH } from "../src/map-source.js";

// Bundle the user-selected image during deployment. The published site serves
// this file itself; browsers need neither a map API nor cross-origin image access.
export async function downloadMap(fetcher = fetch) {
  const response = await fetcher(MAP_SOURCE_URL, {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(`Map image download failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (
    bytes.length < 33 ||
    bytes.length > 20 * 1024 * 1024 ||
    !bytes.subarray(0, 8).equals(pngSignature) ||
    bytes.toString("ascii", 12, 16) !== "IHDR" ||
    !bytes.readUInt32BE(16) ||
    !bytes.readUInt32BE(20)
  ) {
    throw new Error(
      "The selected map URL did not return a valid PNG image under 20 MB.",
    );
  }
  return bytes;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const bytes = await downloadMap();
  const target = new URL(`../public/${BUNDLED_MAP_PATH}`, import.meta.url);
  await mkdir(new URL(".", target), { recursive: true });
  await writeFile(target, bytes);
  console.log(
    `Bundled the selected map image: ${bytes.length} bytes at ${fileURLToPath(target)}`,
  );
}
