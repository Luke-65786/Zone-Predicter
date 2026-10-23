// Fortnite-API's maintained Battle Royale map, without an API key or upload.
export const MAP_IMAGE_URL = "https://media.fortnite-api.com/map_with_pois.png";
export const MAP_SOURCE_URL = "https://fortnite-api.com/";

export async function loadCurrentMap({ signal, fetcher = fetch } = {}) {
  const response = await fetcher(MAP_IMAGE_URL, {
    signal,
    cache: "no-cache",
    credentials: "omit",
  });
  if (!response.ok)
    throw new Error(`The map provider returned HTTP ${response.status}.`);
  const contentType = response.headers.get("content-type") || "";
  if (!/^image\/(png|jpeg|webp)(;|$)/i.test(contentType)) {
    throw new Error("The map provider did not return a supported image.");
  }
  const blob = await response.blob();
  if (!blob.size || blob.size > 20 * 1024 * 1024)
    throw new Error("The map image was empty or too large.");
  return { blob, loadedAt: new Date().toISOString() };
}
