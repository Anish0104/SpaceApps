import { describe, it, expect } from "vitest";
import { fieldLabel, hasAcronym, humanizeField, investigationLabel, matchPhrase, reasonLabel, shortTitle } from "../src";
import datasetJson from "../../../data/dataset.json";

describe("labels", () => {
  it("maps codes to display labels", () => {
    expect(fieldLabel("o2MolPct")).toBe("Oxygen");
    expect(fieldLabel("unknownField")).toBe("unknownField");
    expect(reasonLabel("PO2_CLOSE")).toBe("O2 partial pressure close");
    expect(reasonLabel("SOLID_FUEL_MATCH")).toBe("Solid fuel match");
  });

  it("gives number-free match phrases only for match reasons", () => {
    expect(["O2_WITHIN_5PCT", "PO2_CLOSE", "SAME_MATERIAL", "SOLID_FUEL_MATCH"].map(matchPhrase)).toEqual(["oxygen", "O2 partial pressure", "material", "fuel phase"]);
    expect(["GRAVITY_DIFFERS", "DIFFERENT_FUEL_PHASE", "CANNOT_ASSESS_APPLICABILITY"].map(matchPhrase)).toEqual([undefined, undefined, undefined]);
  });

  it("humanizes field and reason codes in free text, leaving numbers alone", () => {
    expect(humanizeField("o2MolPct at 25-35%")).toBe("Oxygen at 25-35%");
    expect(humanizeField("gravityG 0.165")).toBe("Gravity 0.165");
    expect(humanizeField("missing o2PartialKPa and flowCmS")).toBe("Missing O2 partial pressure and flow speed");
    expect(humanizeField("gravity")).toBe("Gravity");
    expect(humanizeField("GRAVITY_DIFFERS")).toBe("Gravity differs");
    expect(humanizeField("Oxygen not documented")).toBe("Oxygen not documented");
  });

  it("labels an investigation by acronym, or by a short title when the acronym is missing or is the PSI id", () => {
    expect(investigationLabel({ psiId: "PSI-98", acronym: "SAFFIRE-I", name: "Spacecraft Fire Safety Experiment-I" })).toBe("SAFFIRE-I");
    expect(investigationLabel({ psiId: "PSI-62", acronym: "PSI-62", name: "Short title" })).toBe("Short title");
    expect(investigationLabel({ psiId: "PSI-62", acronym: " ", name: "Short title" })).toBe("Short title");
    expect(hasAcronym({ psiId: "PSI-62", acronym: "psi-62" })).toBe(false);
    expect(shortTitle("Computational and Experimental Analysis of SPICE Data Sets")).toBe("Computational and Experimental Analysis…");
    expect(shortTitle("Effect of External Thermo-Convective Perturbation on Cool Flame Dynamics: A Multidimensional")).toBe("Effect of External Thermo-Convective…");
  });

  it("no investigation in dataset.json is labelled with its PSI id, and every label fits in 40 characters", () => {
    for (const inv of datasetJson.investigations) {
      const label = investigationLabel(inv);
      expect(label.toLowerCase(), inv.psiId).not.toBe(inv.psiId.toLowerCase());
      if (!hasAcronym(inv)) expect(label.length, inv.psiId).toBeLessThanOrEqual(40);
    }
  });
});
