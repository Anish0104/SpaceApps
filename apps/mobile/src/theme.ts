import { useCallback, useEffect, useState } from "react";

/** Light/dark theme, remembered on the device. The inline script in index.html applies the same rule
 *  before first paint (keep THEME_KEY in sync). Storage is wrapped — it can throw in private windows. */
export type Theme = "light" | "dark";
export const THEME_KEY = "flameatlas-theme";
const isTheme = (v: unknown): v is Theme => v === "light" || v === "dark";

function current(): Theme {
  const a = document.documentElement.getAttribute("data-theme");
  return isTheme(a) ? a : "dark";
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(current);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage may be blocked */ }
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return [theme, toggle];
}
