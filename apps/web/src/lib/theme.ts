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

type ViewTransitionDoc = Document & { startViewTransition?: (update: () => void) => { finished: Promise<void> } };

/**
 * Switch the theme. With `animate`, every element changes in the same frame (CSS transitions are paused
 * during the swap, so text and backgrounds never disagree), and where the browser supports View
 * Transitions the whole page cross-fades once. Without it, or under reduced motion, it swaps instantly.
 */
export function applyTheme(t: Theme, animate = false) {
  const root = document.documentElement;
  if (root.dataset.theme === t && root.style.colorScheme === t) return;
  const set = () => {
    root.dataset.theme = t;
    root.style.colorScheme = t;
  };
  if (!animate) {
    set();
    return;
  }
  root.classList.add("theme-switching");
  const done = () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
  const doc = document as ViewTransitionDoc;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (typeof doc.startViewTransition === "function" && !reduce) {
    doc.startViewTransition(set).finished.finally(done);
  } else {
    set();
    done();
  }
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
    applyTheme(t, true);
    try {
      window.localStorage.setItem(THEME_KEY, t);
    } catch {
      /* the choice still applies for this visit */
    }
    setThemeState(t);
  }, []);

  return { theme, setTheme };
}
