import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { scenarios } from "../lib/data";
import { useScenario } from "../lib/scenario";
import { prefetchScene, sceneFor } from "../lib/scenes";

/**
 * Scenario picker:
 * - Replaces unstyled native select with an accessible custom listbox button.
 * - Shows scenario name + accent dot.
 * - Keyboard: arrow keys, Enter/Space selects, Escape closes and returns focus to button.
 * - Menu uses --surface with 1px border and soft shadow.
 * - Synchronized with underlying select for form / test compatibility.
 */
export function ScenarioPicker() {
  const { scenario, setScenarioId } = useScenario();
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(() =>
    scenarios.findIndex((s) => s.id === scenario.id)
  );

  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const idx = scenarios.findIndex((s) => s.id === scenario.id);
    if (idx !== -1) setHighlightedIndex(idx);
  }, [scenario.id]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        listboxRef.current &&
        !listboxRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const selectScenario = (id: string) => {
    setScenarioId(id);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const currentScene = sceneFor(scenario);

  const onButtonKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      scenarios.forEach((s) => prefetchScene(sceneFor(s)));
      const step = e.key === "ArrowDown" ? 1 : -1;
      const next = (highlightedIndex + step + scenarios.length) % scenarios.length;
      setHighlightedIndex(next);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open) {
        selectScenario(scenarios[highlightedIndex].id);
      } else {
        setOpen(true);
        scenarios.forEach((s) => prefetchScene(sceneFor(s)));
      }
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  const onListboxKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % scenarios.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i - 1 + scenarios.length) % scenarios.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectScenario(scenarios[highlightedIndex].id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      {/* Hidden native select for standard combobox contract and test sync */}
      <select
        aria-label="Crew environment"
        value={scenario.id}
        onChange={(e) => setScenarioId(e.target.value)}
        tabIndex={-1}
        className="sr-only pointer-events-none"
      >
        {scenarios.map((s) => {
          const sc = sceneFor(s);
          return (
            <option key={s.id} value={s.id}>
              {sc.pickerLabel ?? sc.label}
            </option>
          );
        })}
      </select>

      {/* Accessible custom listbox button */}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="scenario-listbox"
        aria-label={`Crew environment: ${currentScene.pickerLabel ?? currentScene.label}`}
        title={scenario.name}
        onClick={() => {
          setOpen((o) => !o);
          scenarios.forEach((s) => prefetchScene(sceneFor(s)));
        }}
        onKeyDown={onButtonKeyDown}
        className="field field-sm flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] pl-3 pr-2.5 text-sm text-[var(--text)] backdrop-blur"
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: currentScene.accent }}
          aria-hidden="true"
        />
        <span className="truncate max-w-[7.5rem] sm:max-w-[10rem]">
          {currentScene.pickerLabel ?? currentScene.label}
        </span>
        <svg
          aria-hidden="true"
          className={`h-3 w-3 shrink-0 text-[var(--text-muted)] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M2.5 4.5L6 8L9.5 4.5" />
        </svg>
      </button>

      {/* Custom listbox overlay */}
      {open && (
        <ul
          id="scenario-listbox"
          ref={listboxRef}
          role="listbox"
          tabIndex={0}
          aria-label="Crew environment options"
          onKeyDown={onListboxKeyDown}
          className="route-enter absolute right-0 z-50 mt-2 max-h-80 w-64 overflow-auto menu-surface rounded-xl border p-1.5 shadow-[var(--shadow-lift)] outline-none"
        >
          {scenarios.map((s, index) => {
            const sc = sceneFor(s);
            const isSelected = s.id === scenario.id;
            const isHighlighted = index === highlightedIndex;
            return (
              <li
                key={s.id}
                role="option"
                id={`scenario-option-${s.id}`}
                aria-selected={isSelected}
                onClick={() => selectScenario(s.id)}
                onMouseEnter={() => {
                  setHighlightedIndex(index);
                  prefetchScene(sc);
                }}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors ${
                  isHighlighted
                    ? "bg-[var(--surface-2)] text-[var(--text)]"
                    : isSelected
                    ? "text-[var(--text)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: sc.accent }}
                    aria-hidden="true"
                  />
                  <span className={isSelected ? "font-medium" : ""}>
                    {sc.pickerLabel ?? sc.label}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--text-faint)]">{s.gravityG} g</span>
                </div>
                {isSelected && (
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-[var(--accent)]"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
