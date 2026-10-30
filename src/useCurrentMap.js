import { useCallback, useEffect, useState } from "react";
import { getMap, DEFAULT_MAP_ID } from "./map-source.js";

export default function useCurrentMap(mapId = DEFAULT_MAP_ID) {
  const [revision, setRevision] = useState(0);
  const [map, setMap] = useState({
    mapId,
    status: "loading",
    url: null,
    loadedAt: null,
  });
  useEffect(() => {
    let active = true;
    const selected = getMap(mapId);
    const urls = [
      import.meta.env.BASE_URL + selected.path,
      selected.source,
    ].filter(Boolean);
    let currentImage;
    let timeout;
    setMap({ mapId, status: "loading", url: null, loadedAt: null });
    function load(index) {
      if (!active) return;
      if (index >= urls.length) {
        setMap({ mapId, status: "error", url: null, loadedAt: null });
        return;
      }
      const image = new Image();
      currentImage = image;
      let settled = false;
      function done(success) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        image.onload = image.onerror = null;
        if (!active) return;
        if (success && image.naturalWidth && image.naturalHeight) {
          setMap({
            mapId,
            status: "ready",
            url: urls[index],
            loadedAt: new Date().toISOString(),
          });
        } else load(index + 1);
      }
      image.onload = () => done(true);
      image.onerror = () => done(false);
      timeout = setTimeout(() => done(false), 15000);
      image.src = urls[index];
    }
    load(0);
    return () => {
      active = false;
      clearTimeout(timeout);
      if (currentImage) currentImage.onload = currentImage.onerror = null;
    };
  }, [revision, mapId]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  return {
    ...map,
    ...(map.mapId !== mapId ? { status: "loading", url: null } : {}),
    refresh,
  };
}
