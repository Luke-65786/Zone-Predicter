import { useEffect, useState } from "react";

export default function useSavedState(key, initial, normalize) {
  const [value, setValue] = useState(() => {
    try {
      return normalize(JSON.parse(localStorage.getItem(key)) ?? initial);
    } catch {
      return normalize(initial);
    }
  });
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [key, value]);
  return { value, setValue, saved };
}
