import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { AskResponse, Scenario } from "@flameatlas/engine";
import questionsJson from "../../../../data/eval/questions.json";
import { MOCK_ASK, api } from "../lib/api";
import { scenarios } from "../lib/data";
import { useScenario } from "../lib/scenario";
import { sceneFor } from "../lib/scenes";
import { AnswerCard } from "../components/AnswerCard";
import { AnswerSkeleton, ANSWER_STEPS } from "../components/AnswerSkeleton";
import { AskComposer } from "../components/AskComposer";
import { ScenarioStrip } from "../components/ScenarioStrip";
import { SourceDrawer } from "../components/SourceDrawer";
import { IconArrowRight } from "../components/Icons";

/** Demo questions from data/eval/questions.json */
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
  const scene = sceneFor(scenario);
  const location = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState("Where is the biggest evidence gap for a lunar habitat?");
  const [result, setResult] = useState<{ answer: AskResponse; scenario: Scenario; question: string; id: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const tagFocusRef = useRef<HTMLElement | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  // Pipeline steps while waiting: finding records, checking citations, writing answer.
  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, ANSWER_STEPS.length - 1)), 700);
    return () => clearInterval(t);
  }, [busy]);

  async function submit(question: string, sc: Scenario) {
    if (busy || !question.trim()) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    requestAnimationFrame(() => answerRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" }));
    try {
      const answer = await api.ask(question, sc.id);
      setResult({ answer, scenario: sc, question, id: Date.now() });
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  // A question handed over from the dashboard overview: ask it once, then clear it from history state.
  useEffect(() => {
    const handed = (location.state as { q?: string } | null)?.q;
    if (handed) {
      setQ(handed);
      void submit(handed, scenario);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function askDemo(demo: (typeof DEMOS)[number]) {
    setQ(demo.question);
    setScenarioId(demo.scenario.id);
    void submit(demo.question, demo.scenario);
  }

  const scenarioChanged = result && result.scenario.id !== scenario.id;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Ask the archive</h1>
        <p className="page-lede">
          Ask about flame behaviour for the active crew environment. Each sentence cites the NASA records it relies on, and every
          number is checked against those records; if a check fails, you get a plain template answer instead.
        </p>
      </div>

      <div className="space-y-4">
        <AskComposer
          value={q}
          onChange={setQ}
          onSubmit={(v) => void submit(v, scenario)}
          busy={busy}
          scenarioLabel={scene.pickerLabel ?? scene.label}
          accent={scene.accent}
          autoFocus
          suggestions={DEMOS.map((d) => ({
            id: d.id,
            label: d.label,
            title: `${d.question} (scenario: ${d.scenario.name})`,
            srText: `${d.question} for ${d.scenario.name}`,
            onPick: () => askDemo(d),
          }))}
        />
        {MOCK_ASK && (
          <p role="note" className="text-xs text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--brand)]">Mock mode:</span> canned test answers for UI development. No Gemini
            quota is spent.
          </p>
        )}
      </div>

      <div ref={answerRef} className="scroll-mt-24 space-y-4">
        {busy && <AnswerSkeleton step={step} />}

        {err && (
          <div role="alert" className="panel route-enter space-y-3 border-[var(--verdict-red)] p-6">
            <h2 className="panel-title text-[var(--verdict-red)]">The answer service is unavailable right now</h2>
            <p className="measure text-sm text-[var(--text)]">
              The request did not complete ({err}). Try again, or browse the verified NASA runs directly in the Atlas.
            </p>
            <button type="button" onClick={() => void submit(q, scenario)} className="btn btn-secondary btn-sm">
              Retry question
            </button>
          </div>
        )}

        {scenarioChanged && (
          <div className="route-enter flex flex-col items-start justify-between gap-3 rounded-xl border border-[var(--accent)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center">
            <p className="text-sm">
              <span className="font-semibold text-[var(--text)]">Answered for {result.scenario.name}.</span>{" "}
              <span className="text-[var(--text-muted)]">Your active scenario is now {scenario.name}.</span>
            </p>
            <button type="button" onClick={() => void submit(q, scenario)} className="btn btn-primary btn-sm shrink-0">
              Ask again for {scenario.name}
            </button>
          </div>
        )}

        {result && !busy && (
          <AnswerCard
            key={result.id}
            a={result.answer}
            question={result.question}
            onSelectRecord={(id, el) => {
              tagFocusRef.current = el;
              setSelectedRecordId(id);
            }}
          />
        )}

        {!busy && !result && !err && (
          <section aria-labelledby="ask-start" className="space-y-3">
            <h2 id="ask-start" className="panel-title">Start with a demo question</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {DEMOS.map((d) => (
                <button key={d.id} type="button" onClick={() => askDemo(d)} className="panel panel-hover group p-4 text-left">
                  <span className="text-xs text-[var(--text-muted)]">{d.scenario.name}</span>
                  <span className="mt-1 block text-sm font-medium leading-snug text-[var(--text)]">{d.question}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs text-[var(--text-muted)] group-hover:text-[var(--text)]">
                    Ask this <IconArrowRight size={13} />
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <ScenarioStrip scenario={scenario} />

      <SourceDrawer
        recordId={selectedRecordId}
        onClose={() => setSelectedRecordId(null)}
        returnFocusRef={tagFocusRef as React.RefObject<HTMLElement>}
      />
    </div>
  );
}
