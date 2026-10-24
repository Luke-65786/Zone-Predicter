import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = resolve(root, "public/ocr");
await mkdir(destination, { recursive: true });
// Keep the worker, both CPU variants, and English model on our own origin.
// These are generated from locked npm dependencies, not remote runtime CDNs.
const assets = [
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["tesseract.js/LICENSE.md", "tesseract-js-LICENSE.md"],
  ["tesseract.js-core/LICENSE", "tesseract-core-LICENSE"],
  ["@tesseract.js-data/eng/package.json", "english-model-package.json"],
  ...["tesseract-core-lstm", "tesseract-core-simd-lstm"].flatMap((name) => [
    [`tesseract.js-core/${name}.wasm.js`, `${name}.wasm.js`],
    [`tesseract.js-core/${name}.wasm`, `${name}.wasm`],
  ]),
  [
    "@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz",
    "eng.traineddata.gz",
  ],
];
for (const [source, name] of assets)
  await copyFile(
    resolve(root, "node_modules", source),
    resolve(destination, name),
  );
console.log("Prepared local screenshot reader assets.");
