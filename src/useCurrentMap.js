import { useCallback, useEffect, useState } from "react";
import { loadCurrentMap } from "./map-source.js";

export default function useCurrentMap() {
  const [revision, setRevision] = useState(0);
  const [map, setMap] = useState({
    status: "loading",
    url: null,
    loadedAt: null,
  });
  useEffect(() => {
    const controller = new AbortController();
    let url;
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setMap({ status: "loading", url: null, loadedAt: null });
    loadCurrentMap({ signal: controller.signal })
      .then(async (result) => {
        if (!active) return;
        url = URL.createObjectURL(result.blob);
        const image = new Image();
        image.src = url;
        await image.decode();
        if (active) setMap({ status: "ready", url, loadedAt: result.loadedAt });
      })
      .catch(() => {
        if (active) setMap({ status: "error", url: null, loadedAt: null });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
      if (url) URL.revokeObjectURL(url);
    };
  }, [revision]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  return { ...map, refresh };
}
