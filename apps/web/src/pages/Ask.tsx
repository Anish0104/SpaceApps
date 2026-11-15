import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AskResponse, Scenario } from "@flameatlas/engine";
import questionsJson from "../../../../data/eval/questions.json";
import { MOCK_ASK, api } from "../lib/api";
import { scenarios } from "../lib/data";
import { useScenario } from "../lib/scenario";
import { AnswerCard } from "../components/AnswerCard";
import { ScenarioStrip } from "../components/ScenarioStrip";
import { SourceDrawer } from "../components/SourceDrawer";

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

const LOADING_STEPS = [
  "Finding records",
  "Checking citations",
  "Writing answer",
] as const;

export default function Ask() {
  const { scenario, setScenarioId } = useScenario();
  const [q, setQ] = useState("Where is the biggest evidence gap for a lunar habitat?");
  const [result, setResult] = useState<{ answer: AskResponse; scenario: Scenario } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Source drawer state
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const tagFocusRef = useRef<HTMLElement | null>(null);

  // Calm loading step cycle
  useEffect(() => {
    if (!busy) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((s) => (s < LOADING_STEPS.length - 1 ? s + 1 : s));
    }, 600);
    return () => clearInterval(interval);
  }, [busy]);

  async function submit(question: string, sc: Scenario) {
    if (busy || !question.trim()) return;
    setBusy(true);
    setErr(null);
    setLoadingStep(0);
    try {
      const answer = await api.ask(question, sc.id);
      setResult({ answer, scenario: sc });
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  function askDemo(demo: (typeof DEMOS)[number]) {
    setQ(demo.question);
    setScenarioId(demo.scenario.id);
    void submit(demo.question, demo.scenario);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit(q, scenario);
  }

  const scenarioChanged = result && result.scenario.id !== scenario.id;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="eyebrow">Evidence Q&amp;A</p>
        <h1 className="page-title">
          Ask the archive
        </h1>
        <p className="page-lede">
          Ask about flame behaviour for the active crew environment. Each sentence cites the NASA records it relies on,
          and every number is checked against those records; if a check fails, you get a plain template answer instead.
        </p>
      </div>

      <ScenarioStrip scenario={scenario} />

      {MOCK_ASK && (
        <div
          role="note"
          className="measure rounded-[6px] border border-dashed border-[var(--brand)] bg-[var(--surface)] p-3 text-xs text-[var(--text)]"
        >
          <span className="font-semibold text-[var(--brand)]">Mock mode: </span>
          Using canned test answers for UI development. No Gemini API quota is spent.
        </div>
      )}

      {/* Large Question Input */}
      <div className="space-y-4">
        <form onSubmit={onSubmit} className="panel flex flex-col gap-2 p-2 focus-within:border-[var(--focus)] sm:flex-row">
          <label htmlFor="ask-question" className="sr-only">
            Your combustion question
          </label>
          <input
            id="ask-question"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. Would fabric burn differently in a lunar habitat?"
            className="min-h-12 min-w-0 flex-1 bg-transparent px-3 text-base text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
          />
          <button
            type="submit"
            disabled={busy || !q.trim()}
            className="btn btn-primary h-12 min-w-[120px]"
          >
            {busy ? "Asking…" : "Ask"}
          </button>
        </form>

        {/* Demo question chips under the input */}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Demo questions">
          <span className="text-xs text-[var(--text-muted)]">Try a demo question:</span>
          {DEMOS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => askDemo(d)}
              disabled={busy}
              title={`${d.question} (scenario: ${d.scenario.name})`}
              className="chip chip-quiet cursor-pointer px-2.5 py-1 transition-colors hover:border-[var(--accent)] hover:text-[var(--text)] disabled:opacity-50"
            >
              {d.label}
              <span className="sr-only">: {d.question} for {d.scenario.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading state: 3 calm steps */}
      {busy && (
        <div aria-live="polite" className="panel route-enter space-y-4 p-6 sm:p-8">
          <p className="eyebrow">
            Working
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {LOADING_STEPS.map((step, idx) => {
                const isCurrent = idx === loadingStep;
                const isDone = idx < loadingStep;
                return (
                  <div
                    key={step}
                    className={`rounded-[6px] border p-3 transition-colors ${
                      isCurrent
                        ? "border-[var(--accent)] bg-[var(--surface-2)] text-[var(--text)]"
                        : isDone
                        ? "border-[var(--verdict-green)] bg-[var(--surface)] text-[var(--text-muted)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] opacity-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-medium">
                      {isDone ? (
                        <span className="text-[var(--verdict-green)]">✓</span>
                      ) : isCurrent ? (
                        <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
                      ) : (
                        <span className="inline-block h-2 w-2 rounded-full bg-[var(--border)]" />
                      )}
                      <span>{step}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Cross-referencing pressure, oxygen, gravity, and material limits against test runs…
            </p>
          </div>
        </div>
      )}

      {/* Error / AI unavailable fallback */}
      {err && (
        <div
          role="alert"
          className="panel space-y-3 border-[var(--verdict-red)] p-6"
        >
          <h2 className="text-base font-medium text-[var(--verdict-red)]">
            The answer service is currently unavailable
          </h2>
          <p className="measure text-sm text-[var(--text)]">
            We could not complete the live request ({err}). You can re-try your question or inspect the verified NASA test runs directly in the Atlas.
          </p>
          <button
            type="button"
            onClick={() => void submit(q, scenario)}
            className="btn btn-secondary btn-sm"
          >
            Retry question
          </button>
        </div>
      )}

      {/* Scenario changed notification */}
      {scenarioChanged && (
        <div className="route-enter flex flex-col items-start justify-between gap-3 rounded-xl border border-[var(--accent)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center">
          <div className="text-sm">
            <span className="font-semibold text-[var(--text)]">
              Answered for {result.scenario.name}.
            </span>{" "}
            <span className="text-[var(--text-muted)]">
              Your active scenario is now {scenario.name}.
            </span>
          </div>
          <button
            type="button"
            onClick={() => void submit(q, scenario)}
            className="btn btn-primary btn-sm shrink-0"
          >
            Ask again for {scenario.name}
          </button>
        </div>
      )}

      {/* Result Answer Card */}
      {result && (
        <AnswerCard
          a={result.answer}
          onSelectRecord={(id, el) => {
            tagFocusRef.current = el;
            setSelectedRecordId(id);
          }}
        />
      )}

      {/* Empty State */}
      {!busy && !result && !err && (
        <div className="panel space-y-4 p-8 text-center sm:p-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--accent)]">
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
          </div>
          <h2 className="text-lg font-normal text-[var(--text)]">
            Ask any question about flame spread in space
          </h2>
          <p className="measure mx-auto text-sm text-[var(--text-muted)]">
            Select a demo query above or formulate your own question about flammability, extinction limits, or analog test data for {scenario.name}.
          </p>
        </div>
      )}

      {/* 480px Slide-in Source Drawer */}
      <SourceDrawer
        recordId={selectedRecordId}
        onClose={() => setSelectedRecordId(null)}
        returnFocusRef={tagFocusRef as React.RefObject<HTMLElement>}
      />
    </div>
  );
}
