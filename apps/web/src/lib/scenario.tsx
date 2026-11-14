import { createContext, useContext, useState, type ReactNode } from "react";
import type { Scenario } from "@flameatlas/engine";
import { scenarios } from "./data";

const Ctx = createContext<{ scenario: Scenario; setScenarioId: (id: string) => void } | null>(null);

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [id, setScenarioId] = useState("moon-challenge");
  const scenario = scenarios.find((s) => s.id === id) ?? scenarios[0];
  return <Ctx.Provider value={{ scenario, setScenarioId }}>{children}</Ctx.Provider>;
}

export function useScenario() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useScenario outside ScenarioProvider");
  return v;
}
