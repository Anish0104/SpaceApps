import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { IconArrowUp, IconSparkle } from "./Icons";

export interface ComposerSuggestion {
  id: string;
  label: string;
  title?: string;
  srText?: string;
  onPick: () => void;
}

const EXAMPLES = [
  "Would fabric burn differently in a lunar habitat?",
  "What is the nearest tested condition to 30% O₂ at 70 kPa?",
  "Do Earth and orbit results bound the Moon?",
  "Which runs isolate gravity for cotton-fiberglass fabric?",
];

/**
 * The question box: a glowing, growing input. Enter asks, Shift+Enter adds a line. When empty and
 * unfocused, the placeholder cycles through example questions. The active crew environment and the
 * answer guarantee (cited NASA records, checked numbers) sit in its footer.
 */
export function AskComposer({
  value,
  onChange,
  onSubmit,
  busy = false,
  scenarioLabel,
  accent,
  suggestions = [],
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  busy?: boolean;
  scenarioLabel: string;
  accent: string;
  suggestions?: ComposerSuggestion[];
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const [example, setExample] = useState(0);

  // Grow with the content, up to a cap.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  // Cycle example questions in the placeholder while the box is empty and idle.
  useEffect(() => {
    if (value || focused) return;
    const t = setInterval(() => setExample((i) => (i + 1) % EXAMPLES.length), 3200);
    return () => clearInterval(t);
  }, [value, focused]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!busy && value.trim()) onSubmit(value.trim());
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Tab" && !value && !e.shiftKey) {
      // Tab on an empty box accepts the example shown
      e.preventDefault();
      onChange(EXAMPLES[example]!);
    }
  };

  return (
    <form onSubmit={submit} className="composer" data-busy={busy || undefined} style={{ ["--composer-accent" as string]: accent }}>
      <label htmlFor="ask-question" className="sr-only">
        Your combustion question
      </label>
      <div className="flex items-start gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <span aria-hidden="true" className="composer-icon">
          <IconSparkle size={16} />
        </span>
        <textarea
          id="ask-question"
          ref={ref}
          rows={1}
          value={value}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          placeholder={EXAMPLES[example]}
          className="composer-input"
        />
      </div>

      {suggestions.length > 0 && (
        <div role="group" aria-label="Demo questions" className="flex flex-wrap gap-2 px-4 pt-3 sm:px-5 sm:pl-[3.75rem]">
          {suggestions.map((s) => (
            <button key={s.id} type="button" onClick={s.onPick} disabled={busy} title={s.title} className="suggest-chip">
              {s.label}
              {s.srText && <span className="sr-only">: {s.srText}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)] px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="composer-chip" title="Answers are for this crew environment. Change it in the top bar.">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent }} />
            <span className="truncate">{scenarioLabel}</span>
          </span>
          <span className="hidden truncate text-xs text-[var(--text-faint)] md:inline">Cites NASA records · numbers checked</span>
        </div>
        <span className="flex shrink-0 items-center gap-3">
          <span className="hidden text-xs text-[var(--text-faint)] sm:inline">
            <kbd className="composer-kbd">Enter</kbd>
          </span>
          <button type="submit" aria-label="Ask" disabled={busy || !value.trim()} className="composer-send">
            {busy ? <span className="composer-spinner" aria-hidden="true" /> : <IconArrowUp size={16} />}
            <span aria-hidden="true">{busy ? "Asking" : "Ask"}</span>
          </button>
        </span>
      </div>
    </form>
  );
}
