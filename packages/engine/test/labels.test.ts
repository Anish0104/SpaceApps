import { describe, it, expect } from "vitest";
import { fieldLabel, humanizeField, matchPhrase, reasonLabel } from "../src";

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
});
