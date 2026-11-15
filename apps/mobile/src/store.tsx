import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Scenario } from "@flameatlas/engine";
import { scenarios } from "./data";

/**
 * Shared app state: the active crew environment (one scenario, from the backend list — never a
 * user-invented atmosphere) and the on-device saved records. Saved ids persist in localStorage so
 * the Saved tab and its bundled records work offline. Every read/write is wrapped so a private
 * window or blocked storage never breaks the app.
 */
interface Store {
  scenario: Scenario;
  setScenarioId: (id: string) => void;
  saved: string[];
  toggleSave: (psiId: string) => void;
  isSaved: (psiId: string) => boolean;
}

const Ctx = createContext<Store | null>(null);
const SAVE_KEY = "flameatlas.saved.v1";

function readSaved(): string[] {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch { return []; }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState("moon-challenge");
  const [saved, setSaved] = useState<string[]>(() => readSaved());

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch { /* storage may be blocked */ }
  }, [saved]);

  const value = useMemo<Store>(() => ({
    scenario: scenarios.find((s) => s.id === id) ?? scenarios[0],
    setScenarioId: setId,
    saved,
    toggleSave: (psiId) => setSaved((cur) => (cur.includes(psiId) ? cur.filter((x) => x !== psiId) : [...cur, psiId])),
    isSaved: (psiId) => saved.includes(psiId),
  }), [id, saved]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}
