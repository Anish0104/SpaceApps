import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Scenario } from "@flameatlas/engine";
import { scenarios } from "./data";
import { sceneFor } from "./scenes";

const Ctx = createContext<{ scenario: Scenario; setScenarioId: (id: string) => void } | null>(null);

/** One global crew environment. Its accent colour is published on <html> as --accent for the whole UI. */
export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [id, setScenarioId] = useState("moon-challenge");
  const scenario = scenarios.find((s) => s.id === id) ?? scenarios[0]!;
  const accent = sceneFor(scenario).accent;

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent);
  }, [accent]);

  return <Ctx.Provider value={{ scenario, setScenarioId }}>{children}</Ctx.Provider>;
}

export function useScenario() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useScenario outside ScenarioProvider");
  return v;
}
