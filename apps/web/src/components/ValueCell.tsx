import type { NumValue, StrValue } from "@flameatlas/engine";
import { EvidenceBadge, Tag } from "./Badge";
import { sourceById, sourceKind } from "../lib/data";

/** A bare page number reads "p. 31"; a table, figure or slide reference is shown as written. */
const pageRef = (page: string) => (/^\d+$/.test(page) ? `p. ${page}` : page);

/** Every value shows its evidence type and a receipt (source + page). Missing = reason, never 0. */
export function ValueCell({ v }: { v: NumValue | StrValue }) {
  if (v.value === null) {
    return v.missingReason === "not_applicable"
      ? <span className="text-ink/70">n/a</span>
      : <Tag variant="hatch">Not documented</Tag>;
  }
  const src = sourceById(v.sourceId);
  const kind = src && sourceKind(src);
  const title = [kind?.ref, src?.title, src?.page && pageRef(src.page), v.formula].filter(Boolean).join(", ");
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5" title={title}>
      <span className="whitespace-nowrap">{String(v.value)}{v.unit ? ` ${v.unit}` : ""}</span>
      <EvidenceBadge type={v.type} />
      {src && kind && src.url !== "about:blank" && (
        <a href={src.url} target="_blank" rel="noreferrer" className="link whitespace-nowrap text-sm">{kind.label}</a>
      )}
    </span>
  );
}
