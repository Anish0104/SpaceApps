/**
 * The semantic-search corpus: one plain-text document per investigation and one per run, built only
 * from the released dataset (and its validated summaries, when there are any). Ids are stable across
 * releases (inv:PSI-98, run:SAF-VI-3); metadata carries the data version so a query can be filtered
 * to the release the worker serves.
 */
import { fieldLabel, summaryKey, type Dataset, type Investigation, type NumValue, type Run, type StrValue, type SummaryEntry } from "@flameatlas/engine";

export type DocKind = "investigation" | "run";

export interface CorpusDoc {
  id: string;
  text: string;
  metadata: { psiId: string; kind: DocKind; dataVersion: string };
}

export const invDocId = (psiId: string) => `inv:${psiId}`;
export const runDocId = (runId: string) => `run:${runId}`;

const has = (s?: string | null | false): s is string => typeof s === "string" && s.trim().length > 0;
const str = (v: StrValue) => (v.value === null ? null : String(v.value));
const num = (v: NumValue, unit: string) => (v.value === null ? null : `${v.value} ${unit}`);

function investigationText(inv: Investigation, runs: Run[], summary?: SummaryEntry): string {
  const materials = [...new Set(runs.map((r) => str(r.material)).filter(has))];
  const label = has(inv.acronym) && inv.acronym.trim() !== inv.name ? `${inv.name} (${inv.acronym.trim()})` : inv.name;
  return [
    `Investigation ${inv.psiId}: ${label}.`,
    `Safety role: ${inv.safetyRole}.`,
    inv.fuelPhase && `Fuel phase: ${inv.fuelPhase}.`,
    materials.length ? `Materials burned: ${materials.join("; ")}.` : null,
    has(inv.hardware) && `Hardware: ${inv.hardware}.`,
    has(inv.platform) && `Platform: ${inv.platform}.`,
    `Objectives: ${inv.objectives}`,
    has(inv.approach) && `Approach: ${inv.approach}`,
    summary?.sentences.length ? `Summary: ${summary.sentences.map((s) => s.text).join(" ")}` : null,
  ].filter(has).join("\n");
}

function runText(run: Run, inv?: Investigation): string {
  const conditions = [
    ["o2MolPct", num(run.o2MolPct, "mol%")],
    ["pressureKPa", num(run.pressureKPa, "kPa")],
    ["o2PartialKPa", num(run.o2PartialKPa, "kPa")],
    ["flowCmS", num(run.flowCmS, "cm/s")],
    ["flowDirection", str(run.flowDirection)],
    ["gravityG", num(run.gravityG, "g")],
    ["thicknessMm", num(run.thicknessMm, "mm")],
    ["sizeMm", num(run.sizeMm, "mm")],
  ] as const;
  const measured = run.outcomes.map((o) => (o.value.value === null ? null : `${o.label}: ${o.value.value}${o.value.unit ? ` ${o.value.unit}` : ""}`)).filter(has);
  return [
    `Run ${run.id} of ${inv ? `${inv.acronym.trim() || inv.name} (${run.psiId})` : run.psiId}.`,
    `Material: ${str(run.material) ?? "not documented"}, ${run.fuelPhase} fuel${has(str(run.geometry)) ? `, ${str(run.geometry)}` : ""}.`,
    `Conditions: ${conditions.filter(([, v]) => v).map(([f, v]) => `${fieldLabel(f)} ${v}`).join("; ") || "not documented"}.`,
    has(str(run.apparatus)) && `Apparatus: ${str(run.apparatus)}.`,
    has(str(run.method)) && `Method: ${str(run.method)}.`,
    measured.length ? `Measured: ${measured.join("; ")}.` : null,
  ].filter(has).join("\n");
}

export function buildCorpus(ds: Dataset, summaries: Record<string, SummaryEntry> = {}): CorpusDoc[] {
  const meta = (psiId: string, kind: DocKind) => ({ psiId, kind, dataVersion: ds.version });
  const invs = ds.investigations.map((inv) => ({
    id: invDocId(inv.psiId),
    text: investigationText(inv, ds.runs.filter((r) => r.psiId === inv.psiId), summaries[summaryKey(inv.psiId, ds.version)]),
    metadata: meta(inv.psiId, "investigation"),
  }));
  const runs = ds.runs.map((run) => ({
    id: runDocId(run.id),
    text: runText(run, ds.investigations.find((i) => i.psiId === run.psiId)),
    metadata: meta(run.psiId, "run"),
  }));
  return [...invs, ...runs];
}

/** The investigation a document id belongs to (run ids are mapped through the dataset); undefined if unknown. */
export function psiIdOfDoc(ds: Dataset, id: string): string | undefined {
  if (id.startsWith("inv:")) {
    const psiId = id.slice(4);
    return ds.investigations.some((i) => i.psiId === psiId) ? psiId : undefined;
  }
  if (id.startsWith("run:")) return ds.runs.find((r) => r.id === id.slice(4))?.psiId;
  return undefined;
}
