import test from "node:test";
import assert from "node:assert/strict";
import { downloadMap } from "../scripts/download-map.mjs";
import { MAP_SOURCE_URL } from "../src/map-source.js";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE7sAAAAASUVORK5CYII=",
  "base64",
);

test("deployment bundles the image selected by the user without an API request", async () => {
  let requested;
  const bytes = await downloadMap(async (url) => {
    requested = url;
    return new Response(png, { headers: { "content-type": "image/png" } });
  });
  assert.equal(requested, MAP_SOURCE_URL);
  assert.equal(requested, "https://fortnite-api.com/images/map_en.png");
  assert.deepEqual(bytes, png);
});

test("failed or non-image downloads stop deployment instead of publishing a broken map", async () => {
  await assert.rejects(
    downloadMap(async () => new Response("Not found", { status: 404 })),
    /HTTP 404/,
  );
  await assert.rejects(
    downloadMap(async () => new Response("<html>Error</html>")),
    /valid PNG/,
  );
  const truncated = Buffer.from(png.subarray(0, 12));
  await assert.rejects(
    downloadMap(async () => new Response(truncated)),
    /valid PNG/,
  );
});
