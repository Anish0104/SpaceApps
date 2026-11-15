import { useCallback, useEffect, useState } from "react";

/**
 * Light / dark theme. The inline script in index.html applies the same rule before first paint, so
 * the page never flashes the wrong theme: an explicit saved choice wins, otherwise the system
 * preference. Storage access is wrapped because it can throw (private windows, blocked site data).
 * Keep THEME_KEY and the rule in sync with that script.
 */
export type Theme = "light" | "dark";
export const THEME_KEY = "flameatlas-theme";

const isTheme = (v: unknown): v is Theme => v === "light" || v === "dark";

export function storedTheme(): Theme | null {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return isTheme(v) ? v : null;
  } catch {
    return null;
  }
}

export function systemTheme(): Theme {
  try {
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.dataset.theme = t;
  root.style.colorScheme = t;
}

function initialTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  return isTheme(set) ? set : storedTheme() ?? systemTheme();
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  useEffect(() => applyTheme(theme), [theme]);

  // Until the visitor chooses, follow the system preference live.
  useEffect(() => {
    if (storedTheme() || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => { if (!storedTheme()) setThemeState(mq.matches ? "light" : "dark"); };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    try {
      window.localStorage.setItem(THEME_KEY, t);
    } catch {
      /* the choice still applies for this visit */
    }
    setThemeState(t);
  }, []);

  return { theme, setTheme };
}
