import { useState, type FormEvent } from "react";
import type { AskResponse, Scenario } from "@flameatlas/engine";
import questionsJson from "../../../../data/eval/questions.json";
import { MOCK_ASK, api } from "../lib/api";
import { scenarios } from "../lib/data";
import { useScenario } from "../lib/scenario";
import { AnswerCard } from "../components/AnswerCard";
import { ScenarioStrip } from "../components/ScenarioStrip";

/** One-click demo questions (text from data/eval/questions.json), each with the scenario it is asked against. */
const DEMO_BUTTONS = [
  { id: "q2", label: "Nearest tested condition?", scenarioId: "moon-challenge" },
  { id: "q3", label: "Is it just scale?", scenarioId: "moon-fm2" },
  { id: "q4", label: "Biggest lunar gap?", scenarioId: "moon-fm2" },
] as const;

const DEMOS = DEMO_BUTTONS.flatMap((b) => {
  const question = questionsJson.questions.find((q) => q.id === b.id)?.question;
  const scenario = scenarios.find((s) => s.id === b.scenarioId);
  return question && scenario ? [{ ...b, question, scenario }] : [];
});

export default function Ask() {
  const { scenario, setScenarioId } = useScenario();
  const [q, setQ] = useState("Where is the biggest evidence gap for a lunar habitat?");
  // The scenario is kept with its answer so the strip always describes what was actually asked.
  const [result, setResult] = useState<{ answer: AskResponse; scenario: Scenario } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(question: string, sc: Scenario) {
    if (busy || !question.trim()) return;
    setBusy(true); setErr(null); setResult(null);
    try { setResult({ answer: await api.ask(question, sc.id), scenario: sc }); } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  }

  function askDemo(demo: (typeof DEMOS)[number]) {
    setQ(demo.question);
    setScenarioId(demo.scenario.id);
    void submit(demo.question, demo.scenario); // the scenario is passed explicitly: the context updates on the next render
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit(q, scenario);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-2xl sm:text-3xl">Ask the archive</h1>
        <p className="measure mt-2">Every sentence in an answer is checked against the records it cites. The light rates evidence strength, not safety.</p>
      </div>

      {MOCK_ASK && (
        <p role="note" className="measure rounded-[6px] border border-dashed border-ink px-4 py-2 text-sm font-semibold">
          Mock mode: canned answers for UI development. The worker is not called; nothing below is a real result.
        </p>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Demo questions">
          <span className="text-sm text-ink/70">Try a demo question:</span>
          {DEMOS.map((d) => (
            <button key={d.id} type="button" onClick={() => askDemo(d)} disabled={busy} title={`${d.question} (scenario: ${d.scenario.name})`}
              className="btn btn-secondary btn-sm">
              {d.label}
              <span className="sr-only">: {d.question} Asked for scenario {d.scenario.name}.</span>
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex flex-wrap gap-2">
          <label htmlFor="ask-question" className="sr-only">Your question</label>
          <input id="ask-question" value={q} onChange={(e) => setQ(e.target.value)} className="field min-w-0 flex-1 basis-64" />
          <button type="submit" disabled={busy || !q.trim()} className="btn btn-primary">
            {busy ? "Asking…" : "Ask"}
          </button>
        </form>
      </div>

      <ScenarioStrip scenario={result?.scenario ?? scenario} />

      <div aria-live="polite">
        {busy && <p className="text-ink/70">Checking NASA records… this can take up to a minute.</p>}
      </div>
      {err && (
        <p role="alert" className="measure rounded-[6px] border border-ink px-4 py-3">
          <b className="font-semibold">The answer service did not respond.</b> Start the worker with pnpm dev:worker, then ask again. Details: {err}
        </p>
      )}

      {result && <AnswerCard a={result.answer} />}
    </div>
  );
}
