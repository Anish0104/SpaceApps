/**
 * Display labels for engine codes, shared by the web app and the worker's template answer.
 * Presentation only: the codes themselves are never changed.
 */

const FIELD: Record<string, string> = {
  material: "Material",
  geometry: "Geometry",
  thicknessMm: "Thickness",
  sizeMm: "Size",
  flowCmS: "Flow speed",
  flowDirection: "Flow direction",
  pressureKPa: "Pressure",
  o2MolPct: "Oxygen",
  gravityG: "Gravity",
  ductSize: "Duct size",
  apparatus: "Apparatus",
  method: "Method",
  o2PartialKPa: "O2 partial pressure",
  diluent: "Diluent",
  fuelPhase: "Fuel phase",
};

const REASON: Record<string, string> = {
  O2_WITHIN_5PCT: "Oxygen within 5 mol%",
  PO2_CLOSE: "O2 partial pressure close",
  GRAVITY_DIFFERS: "Gravity differs",
  CANNOT_ASSESS_APPLICABILITY: "Cannot assess applicability",
};

export const sentenceCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/** "gravityG" -> "Gravity". Unknown fields are shown as they are. */
export const fieldLabel = (field: string) => FIELD[field] ?? field;

/** "GRAVITY_DIFFERS" -> "Gravity differs", "SOLID_FUEL_MATCH" -> "Solid fuel match". */
export const reasonLabel = (code: string) => REASON[code] ?? sentenceCase(code.replace(/_/g, " "));

/**
 * What a "match" reason says matched, for prose ("matches on oxygen and material"). Undefined for
 * reasons that are not a match (GRAVITY_DIFFERS, DIFFERENT_FUEL_PHASE, CANNOT_ASSESS_APPLICABILITY).
 * No phrase carries a number: the ranking tolerances are rules, not values on a record.
 */
export function matchPhrase(code: string): string | undefined {
  if (code === "O2_WITHIN_5PCT") return "oxygen";
  if (code === "PO2_CLOSE") return "O2 partial pressure";
  if (code === "SAME_MATERIAL") return "material";
  if (/^[A-Z]+_FUEL_MATCH$/.test(code)) return "fuel phase";
  return undefined;
}

/**
 * Makes free text from an answer readable: field codes become labels ("o2MolPct at 25-35%" ->
 * "Oxygen at 25-35%") and reason codes become reason labels. Numbers and other words are untouched.
 */
export function humanizeField(text: string): string {
  const out = text
    .replace(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g, (code) => reasonLabel(code))
    .replace(/\b[a-z][a-zA-Z0-9]*\b/g, (w, at: number) => (FIELD[w] ? (at === 0 ? FIELD[w] : lowerLabel(FIELD[w])) : w))
    .trim();
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** "Flow speed" -> "flow speed" mid-sentence; "O2 partial pressure" keeps its capitals. */
const lowerLabel = (label: string) => (/^[A-Z][a-z]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label);

/** True when the record has a real acronym: not blank and not just its PSI id ("PSI-62"). */
export const hasAcronym = (inv: { psiId: string; acronym: string }) => {
  const a = inv.acronym.trim();
  return a !== "" && a.toLowerCase() !== inv.psiId.trim().toLowerCase();
};

/** Shortens a title to at most `max` characters at a word break, ending in "…". */
export function shortTitle(name: string, max = 40): string {
  const s = name.trim().replace(/\s+/g, " ");
  if (s.length <= max) return s;
  // Look one character past the room left for "…": a space there means the last word fits whole.
  const room = s.slice(0, max);
  const space = room.lastIndexOf(" ");
  const atWord = space > max / 2 ? room.slice(0, space) : room.slice(0, max - 1);
  return `${atWord.replace(/[\s,;:/–-]+$/, "")}…`;
}

/** Short label for an investigation: its acronym, or a shortened title when it has none. */
export const investigationLabel = (inv: { psiId: string; acronym: string; name: string }) =>
  hasAcronym(inv) ? inv.acronym.trim() : shortTitle(inv.name || inv.psiId);
