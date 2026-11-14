import { scenarios } from "../lib/data";
import { useScenario } from "../lib/scenario";

export function ScenarioPicker() {
  const { scenario, setScenarioId } = useScenario();
  return (
    <select value={scenario.id} onChange={(e) => setScenarioId(e.target.value)}
      className="rounded border border-line bg-white px-2 py-1 text-sm" aria-label="Crew environment">
      {scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  );
}
