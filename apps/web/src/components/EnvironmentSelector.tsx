import { useEffect, useRef, type KeyboardEvent } from "react";
import { scenarios } from "../lib/data";
import { useScenario } from "../lib/scenario";
import { prefetchScene, sceneFor } from "../lib/scenes";

/**
 * The environment selector along the bottom of the hero: one glass card per crew environment with its
 * gravity. It reads and writes the one global scenario, so it always agrees with the header picker.
 * A radio group: Tab enters at the selected option, arrow keys move and select. Hover or focus warms
 * that scene's image so the switch is instant. Scrolls sideways on narrow screens.
 */
export function EnvironmentSelector({ className = "" }: { className?: string }) {
  const { scenario, setScenarioId } = useScenario();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keep the selected card in view on narrow screens (horizontal only; never scrolls the page).
  useEffect(() => {
    const el = refs.current[scenarios.findIndex((s) => s.id === scenario.id)];
    const row = el?.parentElement;
    if (!el || !row || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo?.({ left: el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }, [scenario.id]);

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const n = scenarios.length;
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    const to = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : step ? (i + step + n) % n : -1;
    if (to < 0) return;
    e.preventDefault();
    setScenarioId(scenarios[to]!.id);
    refs.current[to]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Crew environment"
      className={`relative -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:justify-between ${className}`}
    >
      {scenarios.map((s, i) => {
        const scene = sceneFor(s);
        const checked = s.id === scenario.id;
        return (
          <button
            key={s.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={scene.label}
            tabIndex={checked ? 0 : -1}
            title={s.name}
            onClick={() => setScenarioId(s.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            onMouseEnter={() => prefetchScene(scene)}
            onFocus={() => prefetchScene(scene)}
            className="env-option snap-start lg:flex-1"
          >
            <span className="text-[0.9375rem] font-medium">{scene.label}</span>
            <span className="env-meta font-mono text-[11px]">
              {s.gravityG} g · {s.o2MolPct}% O₂
            </span>
          </button>
        );
      })}
    </div>
  );
}
