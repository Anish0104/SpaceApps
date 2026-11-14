/** Display labels for engine codes. Presentation only: the codes themselves are never changed. */

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
