import { useRef } from "react";
import { Tag } from "./Badge";

const SCENARIO_PREFIX = "SCENARIO:";
const SCENARIO_TOOLTIP = "Assumed scenario input, not evidence";

/**
 * A receipt on an answer sentence. Clicking it opens the source drawer.
 * "SCENARIO:<id>" marks an ASSUMED scenario input (dashed, never evidence).
 */
export function RecordTag({
  id,
  onSelect,
}: {
  id: string;
  onSelect?: (id: string, el: HTMLElement) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);

  if (id.startsWith(SCENARIO_PREFIX)) {
    return (
      <Tag variant="dashed" title={SCENARIO_TOOLTIP}>
        {id}
        <span className="sr-only"> ({SCENARIO_TOOLTIP})</span>
      </Tag>
    );
  }

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={() => {
        if (btnRef.current && onSelect) {
          onSelect(id, btnRef.current);
        }
      }}
      title={`View record details for ${id}`}
      className="tap-target inline-flex cursor-pointer rounded-[4px] focus-visible:outline-2 focus-visible:outline-[var(--focus)]"
    >
      <Tag variant="link">
        {id}
        <span className="sr-only">, open record details for {id}</span>
      </Tag>
    </button>
  );
}
