/**
 * Adversarial regression tests for the citation validator: the scientific traps that must never
 * slip through, and the legitimate numbers that must never be dropped. These check behaviour the
 * science must have, not the current implementation.
 */
import { describe, it, expect } from "vitest";
import real from "../../../data/dataset.json";
import scenarios from "../../../data/scenarios.json";
import { Dataset, Scenario } from "@flameatlas/engine";
import { numbersIn, validateSentences } from "../src/validator";

const ds = Dataset.parse(real);
const moon = Scenario.parse(scenarios.find((s) => s.id === "moon-challenge"));

describe("citation validator: run identifiers are labels, not measurements", () => {
  it("does not read a run label's trailing number as a quantity", () => {
    // the bug: "VI-2", "SAF-IV-1", "I-1" were validated as the numbers 2, 1, 1
    expect(numbersIn("Saffire VI-2 (PSI-98) and SAF-IV-1 and run I-1")).toEqual([]);
    expect(numbersIn("BASS2-CF-conc and BASS2-CF-opp")).toEqual([]);
  });
  it("still checks the real measurements in the same sentence", () => {
    expect(numbersIn("SAF-IV-1 ran at 22 mol% and 100 kPa")).toEqual([22, 100]);
  });
  it("keeps a true measurement sentence and drops a fabricated one, both naming runs", () => {
    const run = ds.runs.find((r) => r.id === "SAF-VI-3")!;
    const good = { text: `SAF-VI-3 burned at ${run.o2MolPct.value} mol% oxygen.`, recordIds: ["SAF-VI-3"] };
    const bad = { text: "SAF-VI-3 burned at 999 mol% oxygen.", recordIds: ["SAF-VI-3"] };
    const { kept, dropped } = validateSentences(ds, [good, bad], moon);
    expect(kept.map((s) => s.text)).toEqual([good.text]);
    expect(dropped.map((d) => d.sentence.text)).toEqual([bad.text]);
  });
});

describe("citation validator: numbers must trace to a cited record", () => {
  it("drops a pressure the cited run does not document (Saffire I-1 has no pressure)", () => {
    const { dropped } = validateSentences(ds, [{ text: "Saffire I-1 burned at 101.3 kPa.", recordIds: ["SAF-I-1"] }], moon);
    expect(dropped).toHaveLength(1);
  });
  it("accepts the scenario's own assumed inputs when the scenario id is cited", () => {
    const { kept } = validateSentences(ds, [{ text: "The scenario assumes 30 mol% oxygen.", recordIds: ["SCENARIO:moon-challenge"] }], moon);
    expect(kept).toHaveLength(1);
  });
});
