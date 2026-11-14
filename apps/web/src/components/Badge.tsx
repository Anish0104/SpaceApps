import type { EvidenceType } from "@flameatlas/engine";

const STYLE: Record<EvidenceType, string> = {
  MEASURED: "bg-measured/10 text-measured",
  COMPUTED: "bg-computed/10 text-computed",
  ASSUMED: "bg-assumed/15 text-assumed",
  INFERRED: "bg-ink/10 text-ink/70",
  UNKNOWN: "bg-gap/10 text-gap",
};

export function EvidenceBadge({ type }: { type: EvidenceType }) {
  return <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${STYLE[type]}`}>{type}</span>;
}

export function Tag({ children, tone = "ink" }: { children: React.ReactNode; tone?: "ink" | "gap" | "match" | "measured" | "assumed" }) {
  const t = { ink: "border-line text-ink/70", gap: "border-gap/40 text-gap", match: "border-match/40 text-match", measured: "border-measured/40 text-measured", assumed: "border-assumed/40 text-assumed" }[tone];
  return <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${t}`}>{children}</span>;
}
