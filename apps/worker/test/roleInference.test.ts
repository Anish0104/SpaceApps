import { describe, it, expect } from "vitest";
import real from "../../../data/dataset.json";
import scenarios from "../../../data/scenarios.json";
import { Dataset, Scenario, SearchRequest } from "@flameatlas/engine";
import { buildIndex, search } from "../src/search";

const ds = Dataset.parse(real);
const index = buildIndex(ds);
const moon = Scenario.parse(scenarios.find((s) => s.id === "moon-challenge"));
const top = (query: string, filters = {}) => search(ds, index, moon, SearchRequest.parse({ query, scenarioId: moon.id, filters })).map((r) => r.psiId);

describe("search uses the safety role the question names", () => {
  it("a smoke-detection question surfaces SAME even though its atmosphere is undocumented", () => {
    const ids = top("How does microgravity smoke-particle size differ from Earth, and what does that mean for detector thresholds?");
    expect(ids.indexOf("PSI-102")).toBeLessThan(3);
  });
  it("a suppression question surfaces FLEX-2", () => {
    const ids = top("What do suppression tests say about extinguishing a low-flow microgravity flame?");
    expect(ids.indexOf("PSI-68")).toBeLessThan(3);
  });
  it("an explicit filter still wins over the question", () => {
    const q = "How does smoke-particle size affect detector thresholds?";
    expect(top(q, { safetyRole: "suppression" })).not.toEqual(top(q));
  });
});
