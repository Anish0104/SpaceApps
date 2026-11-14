export const KPA_PER_PSI = 6.894757;
export const KPA_PER_ATM = 101.325;

export const psiToKPa = (psi: number) => psi * KPA_PER_PSI;
export const atmToKPa = (atm: number) => atm * KPA_PER_ATM;
export const kPaToPsi = (kPa: number) => kPa / KPA_PER_PSI;

/** Accepts a mole fraction (0-1) or a percent (0-100) and returns percent. */
export function toMolPct(x: number): number {
  if (x < 0) throw new Error("negative O2 value");
  return x <= 1 ? x * 100 : x;
}

/** O2 partial pressure (kPa) = O2 fraction x total pressure. Always labeled COMPUTED. */
export function o2PartialKPa(o2MolPct: number, pressureKPa: number): number {
  return (toMolPct(o2MolPct) / 100) * pressureKPa;
}

export const O2_PARTIAL_FORMULA = "pO2 = (O2 mol% / 100) x total pressure (kPa)";

export type GravityRegime = "orbit" | "moon" | "mars" | "earth";

export function gravityRegime(g: number): GravityRegime {
  if (g < 0.05) return "orbit";
  if (g < 0.27) return "moon"; // ~0.165 g
  if (g < 0.7) return "mars"; // ~0.38 g
  return "earth";
}

const ORDER: GravityRegime[] = ["orbit", "moon", "mars", "earth"];

/**
 * Similarity heuristic for finding the nearest tested condition: same regime 1,
 * adjacent 0.5, else 0. NOT a bound: the Moon may be more flammable than Earth or orbit.
 */
export function gravitySimilarity(a: number, b: number): number {
  const d = Math.abs(ORDER.indexOf(gravityRegime(a)) - ORDER.indexOf(gravityRegime(b)));
  return d === 0 ? 1 : d === 1 ? 0.5 : 0;
}
