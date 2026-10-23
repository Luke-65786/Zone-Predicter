import { useCallback, useEffect, useState } from "react";
import { BUNDLED_MAP_PATH, MAP_SOURCE_URL } from "./map-source.js";

export default function useCurrentMap() {
  const [revision, setRevision] = useState(0);
  const [map, setMap] = useState({
    status: "loading",
    url: null,
    loadedAt: null,
  });
  useEffect(() => {
    let active = true;
    const urls = [import.meta.env.BASE_URL + BUNDLED_MAP_PATH, MAP_SOURCE_URL];
    let currentImage;
    let timeout;
    setMap({ status: "loading", url: null, loadedAt: null });
    function load(index) {
      if (!active) return;
      if (index >= urls.length) {
        setMap({ status: "error", url: null, loadedAt: null });
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
  }, [revision]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  return { ...map, refresh };
}
