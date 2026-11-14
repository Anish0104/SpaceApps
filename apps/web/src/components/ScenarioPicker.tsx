import { scenarios } from "../lib/data";
import { useScenario } from "../lib/scenario";

export function ScenarioPicker() {
  const { scenario, setScenarioId } = useScenario();
  return (
    <label className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className="text-ink/70">Crew environment</span>
      <select value={scenario.id} onChange={(e) => setScenarioId(e.target.value)} className="field field-sm max-w-full font-semibold">
        {scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </label>
  );
}
