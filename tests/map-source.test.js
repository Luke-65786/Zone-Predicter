import test from "node:test";
import assert from "node:assert/strict";
import { loadCurrentMap, MAP_IMAGE_URL } from "../src/map-source.js";

test("latest map requests the maintained provider image without credentials or stale cache", async () => {
  const signal = new AbortController().signal;
  let request;
  const map = await loadCurrentMap({
    signal,
    fetcher: async (url, options) => {
      request = { url, options };
      return new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "image/png" },
      });
    },
  });
  assert.equal(request.url, MAP_IMAGE_URL);
  assert.equal(request.options.cache, "no-cache");
  assert.equal(request.options.credentials, "omit");
  assert.equal(request.options.signal, signal);
  assert.equal(map.blob.type, "image/png");
  assert.equal(map.blob.size, 3);
  assert.ok(Number.isFinite(Date.parse(map.loadedAt)));
});

test("provider HTTP failures and non-image responses remain errors", async () => {
  await assert.rejects(
    loadCurrentMap({
      fetcher: async () => new Response("Unavailable", { status: 503 }),
    }),
    /HTTP 503/,
  );
  await assert.rejects(
    loadCurrentMap({
      fetcher: async () =>
        new Response("<html>Error</html>", {
          headers: { "content-type": "text/html" },
        }),
    }),
    /supported image/,
  );
  await assert.rejects(
    loadCurrentMap({
      fetcher: async () =>
        new Response("", { headers: { "content-type": "image/png" } }),
    }),
    /empty or too large/,
  );
});
