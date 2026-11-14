import { Link } from "react-router-dom";
import { dataset, invById } from "../lib/data";
import { Tag } from "./Badge";

const SCENARIO_PREFIX = "SCENARIO:";
const SCENARIO_TOOLTIP = "Assumed scenario input, not evidence";

/** The investigation a cited id belongs to: the id itself for a PSI id, the parent for a run id. */
function investigationOf(id: string): string | undefined {
  if (invById(id)) return id;
  const psiId = dataset.runs.find((r) => r.id === id)?.psiId;
  return psiId && invById(psiId) ? psiId : undefined;
}

/**
 * A receipt on an answer sentence. Record ids link to their investigation page; "SCENARIO:<id>"
 * marks an ASSUMED scenario input (dashed, never evidence); ids we cannot resolve stay plain.
 */
export function RecordTag({ id }: { id: string }) {
  if (id.startsWith(SCENARIO_PREFIX)) {
    return <Tag variant="dashed" title={SCENARIO_TOOLTIP}>{id}<span className="sr-only"> ({SCENARIO_TOOLTIP})</span></Tag>;
  }
  const psiId = investigationOf(id);
  if (!psiId) return <Tag>{id}</Tag>;
  return (
    <Link to={`/investigation/${encodeURIComponent(psiId)}`} title={`Open investigation ${psiId}`} className="inline-flex rounded-[2px]">
      <Tag variant="link">{id}<span className="sr-only">, open investigation {psiId}</span></Tag>
    </Link>
  );
}
