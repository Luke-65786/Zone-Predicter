import { useEffect, useState } from "react";
import {
  APPEARANCE_KEY,
  DEFAULT_APPEARANCE,
  readAppearance,
  normalizeAppearance,
  applyAppearance,
} from "./appearance.js";

export default function useAppearance() {
  const [settings, setSettings] = useState(readAppearance);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = (event) => setSystemDark(event.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    applyAppearance(settings, systemDark);
    try {
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify(settings));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [settings, systemDark]);
  return {
    settings,
    saved,
    update: (patch) =>
      setSettings((previous) => normalizeAppearance({ ...previous, ...patch })),
    reset: () => setSettings({ ...DEFAULT_APPEARANCE }),
  };
}
