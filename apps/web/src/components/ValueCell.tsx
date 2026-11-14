import type { NumValue, StrValue } from "@flameatlas/engine";
import { EvidenceBadge } from "./Badge";
import { sourceById } from "../lib/data";

/** Every value shows its evidence type and a receipt (source + page). Missing = reason, never 0. */
export function ValueCell({ v }: { v: NumValue | StrValue }) {
  if (v.value === null) {
    return <span className="text-xs text-gap">{v.missingReason === "not_applicable" ? "n/a" : "not documented"}</span>;
  }
  const src = sourceById(v.sourceId);
  const title = [src?.title, src?.page && `p. ${src.page}`, v.formula].filter(Boolean).join(" · ");
  return (
    <span className="inline-flex items-center gap-1" title={title}>
      <span className="font-mono">{String(v.value)}{v.unit ? ` ${v.unit}` : ""}</span>
      <EvidenceBadge type={v.type} />
      {src && src.url !== "about:blank" && (
        <a href={src.url} target="_blank" rel="noreferrer" className="text-[10px] text-measured underline">src</a>
      )}
    </span>
  );
}
