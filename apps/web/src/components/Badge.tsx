import type { ReactNode } from "react";
import { gravityRegime, type EvidenceType, type GravityRegime } from "@flameatlas/engine";

/**
 * Chip line styles. For evidence the line style IS the type, everywhere it appears:
 * solid fill = measured, solid outline = computed, dashed = assumed, dotted = inferred,
 * hatch = unknown / not documented. "quiet" and "link" are for plain labels and record links.
 */
export type ChipVariant = "quiet" | "solid" | "outline" | "dashed" | "dotted" | "hatch" | "link";

const EVIDENCE: Record<EvidenceType, { label: string; variant: ChipVariant }> = {
  MEASURED: { label: "Measured", variant: "solid" },
  COMPUTED: { label: "Computed", variant: "outline" },
  ASSUMED: { label: "Assumed", variant: "dashed" },
  INFERRED: { label: "Inferred", variant: "dotted" },
  UNKNOWN: { label: "Unknown", variant: "hatch" },
};

export function Tag({ children, variant = "quiet", title }: { children: ReactNode; variant?: ChipVariant; title?: string }) {
  // The hatch chip keeps its label on a clear background so the text stays readable.
  return <span title={title} className={`chip chip-${variant}`}>{variant === "hatch" ? <span>{children}</span> : children}</span>;
}

export function EvidenceBadge({ type }: { type: EvidenceType }) {
  const { label, variant } = EVIDENCE[type];
  return <Tag variant={variant}>{label}</Tag>;
}

/** A gravity regime always has the same colour. The square mark never appears without its name. */
const REGIME: Record<GravityRegime, { label: string; color: string }> = {
  earth: { label: "Earth", color: "var(--soot)" },
  mars: { label: "Mars", color: "var(--mars)" },
  moon: { label: "Moon", color: "var(--regolith)" },
  orbit: { label: "Orbit", color: "var(--ch-blue)" },
};

export function RegimeMark({ g }: { g: number }) {
  const { label, color } = REGIME[gravityRegime(g)];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: color }} />
      {label}
    </span>
  );
}

export type Light = "green" | "yellow" | "red" | "hatch" | "none";

/**
 * A 20px light that rates evidence coverage or strength, never safety. Always place words next to
 * it; pass `label` only when those words are not right beside it for a screen reader.
 */
export function VerdictLight({ light, label }: { light: Light; label?: string }) {
  return label
    ? <span role="img" aria-label={label} className={`light light-${light}`} />
    : <span aria-hidden="true" className={`light light-${light}`} />;
}
