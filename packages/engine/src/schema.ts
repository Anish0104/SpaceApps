/**
 * Contract 1: the dataset format. Mirrored in ingest/schema.py (Pydantic).
 * Change both together.
 */
import { z } from "zod";

export const EvidenceType = z.enum(["MEASURED", "COMPUTED", "ASSUMED", "INFERRED", "UNKNOWN"]);
export type EvidenceType = z.infer<typeof EvidenceType>;

export const MissingReason = z.enum(["not_documented", "not_applicable"]);

export const Source = z.object({
  id: z.string(),
  psiId: z.string().optional(),
  ntrsId: z.string().optional(),
  title: z.string(),
  url: z.string(),
  doi: z.string().optional(),
  version: z.string().optional(),
  page: z.string().optional(), // page / table / figure
});
export type Source = z.infer<typeof Source>;

const valueBase = {
  unit: z.string().optional(),
  type: EvidenceType,
  sourceId: z.string().optional(),
  formula: z.string().optional(), // required in spirit for COMPUTED
  missingReason: MissingReason.optional(),
  collectedBy: z.string().optional(),
  verifiedBy: z.string().optional(), // must differ from collectedBy
};

export const NumValue = z.object({ value: z.number().nullable(), ...valueBase });
export const StrValue = z.object({ value: z.string().nullable(), ...valueBase });
export type NumValue = z.infer<typeof NumValue>;
export type StrValue = z.infer<typeof StrValue>;

export const SafetyRole = z.enum(["prevention", "detection", "suppression", "physics"]);
export type SafetyRole = z.infer<typeof SafetyRole>;

export const FuelPhase = z.enum(["solid", "liquid", "gas", "aerosol"]);
export type FuelPhase = z.infer<typeof FuelPhase>;

export const Investigation = z.object({
  psiId: z.string(),
  name: z.string(),
  acronym: z.string(),
  projectType: z.enum(["Microgravity", "Ground"]),
  safetyRole: SafetyRole,
  fuelPhase: FuelPhase.optional(),
  hardware: z.string().optional(),
  platform: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  objectives: z.string(),
  approach: z.string().optional(),
  earthBenefits: z.string().optional(),
  doi: z.string().optional(),
  license: z.string().optional(),
  url: z.string(),
  relatedIds: z.array(z.string()),
  publications: z.array(z.object({ title: z.string(), authors: z.string().optional(), doi: z.string().optional() })),
  runIds: z.array(z.string()),
  /** documented ranges at investigation level, used when no run-level data exists */
  ranges: z
    .object({
      o2MolPct: z.tuple([z.number(), z.number()]).optional(),
      pressureKPa: z.tuple([z.number(), z.number()]).optional(),
      flowCmS: z.tuple([z.number(), z.number()]).optional(),
      gravityG: z.tuple([z.number(), z.number()]).optional(),
      sourceId: z.string().optional(),
    })
    .optional(),
  sensors: z.array(z.string()).default([]),
});
export type Investigation = z.infer<typeof Investigation>;

export const Run = z.object({
  id: z.string(),
  psiId: z.string(),
  testNumber: z.string().optional(),
  date: z.string().optional(),
  material: StrValue,
  fuelPhase: FuelPhase,
  geometry: StrValue,
  sizeMm: NumValue,
  thicknessMm: NumValue,
  o2MolPct: NumValue,
  pressureKPa: NumValue,
  o2PartialKPa: NumValue, // COMPUTED
  flowCmS: NumValue,
  flowDirection: StrValue, // opposed | concurrent | quiescent
  gravityG: NumValue,
  ductSize: StrValue,
  diluent: StrValue,
  apparatus: StrValue,
  method: StrValue,
  sensors: z.array(z.string()),
  outcomes: z.array(z.object({ label: z.string(), value: NumValue })),
  status: z.enum(["imported", "verified"]),
});
export type Run = z.infer<typeof Run>;

export const Edge = z.object({
  from: z.string(),
  to: z.string(),
  kind: z.enum(["nasa_related", "reuses_data", "shared_hardware"]),
  sourceId: z.string().optional(),
});
export type Edge = z.infer<typeof Edge>;

export const Scenario = z.object({
  id: z.string(),
  name: z.string(),
  environment: z.enum(["earth", "spacecraft", "station", "moon", "mars", "rover", "suit"]),
  o2MolPct: z.number(),
  pressureKPa: z.number(),
  gravityG: z.number(),
  flowCmS: z.number().nullable(),
  material: z.string().nullable(),
  fuelPhase: FuelPhase.nullable(),
  source: z.string(),
  note: z.string().optional(),
});
export type Scenario = z.infer<typeof Scenario>;

export const Dataset = z.object({
  version: z.string(),
  generatedAt: z.string(),
  fixture: z.boolean().default(false),
  investigations: z.array(Investigation),
  runs: z.array(Run),
  edges: z.array(Edge),
  sources: z.array(Source),
});
export type Dataset = z.infer<typeof Dataset>;
