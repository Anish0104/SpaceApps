/**
 * Render tests for the two science pages, on the released dataset and the default scenario
 * (Moon Base, challenge boundary). They check what a judge reads: the non-claims and the gaps.
 */
import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { ScenarioProvider } from "../lib/scenario";
import { dataset } from "../lib/data";
import MissingExperiment from "./MissingExperiment";
import MissionLab from "./MissionLab";

const render = (page: ReactElement) =>
  renderToString(<MemoryRouter><ScenarioProvider>{page}</ScenarioProvider></MemoryRouter>)
    .replace(/<!-- -->/g, "")   // React's text-node separators
    .replace(/<[^>]+>/g, " ")   // tags
    .replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

const NO_SAFETY_VERDICT = /\bis safe\b|\bunsafe\b|\bsafe to (use|fly)\b/i;

describe("Missing experiment page", () => {
  const text = render(<MissingExperiment />);

  it("lists every scenario condition and marks the uncovered side with words, not colour alone", () => {
    for (const name of ["Gravity", "O2 fraction", "O2 partial pressure", "Pressure", "Material"]) expect(text).toContain(name);
    expect(text).toContain("What no run covers");
    expect(text).toContain("No curated run covers it");   // gravity
    expect(text).toContain("No curated run above");       // nothing tested above orbit gravity
    expect(text).toContain("No curated run covers gravity for this scenario");
  });
  it("shows the closest runs with their verification state", () => {
    expect(text).toMatch(/imported, not yet cross-checked|verified/);
    expect(dataset.runs.some((r) => text.includes(r.id))).toBe(true);
  });
  it("proposes a lunar-gravity run and stamps it as illustrative", () => {
    expect(text).toContain("Proposal 1");
    expect(text).toContain("does changing only gravity change how");
    expect(text).toContain("0.165 g");
    expect(text).toContain("Control checks passed (feasibility and safety not assessed)");
    expect(text).not.toContain("Rules-verified");
    expect(text).toContain("Illustrative research proposal, not an approved NASA protocol.");
    expect(text).toContain("Lines up with FM2's design");
    expect(text).not.toMatch(/predict/i);
  });
  it("is honest about what is not sourced", () => {
    expect(text).toContain("Uncertainty and cost are counted as zero: no NASA source provides them.");
    expect(text).toMatch(/Candidates the rules refused \(\d+\)/);
  });
  it("hides the skeptic row until the skeptic AI is connected", () => {
    expect(text).not.toContain("Skeptic's objection");
    expect(text).not.toContain("the skeptic AI is not connected");
  });
  it("never words coverage as a safety verdict", () => {
    expect(text).toContain("Lights rate evidence coverage, not safety.");
    expect(text).not.toMatch(NO_SAFETY_VERDICT);
  });
});

describe("Mission lab page", () => {
  const text = render(<MissionLab />);

  it("shows the readout as coverage, never a safety rating", () => {
    expect(text).toContain("Evidence coverage, not a safety rating");
    expect(text).toContain("Not in our curated data.");
    expect(text).not.toMatch(NO_SAFETY_VERDICT);
  });
  it("matches the nearest run two ways and says when they disagree", () => {
    expect(text).toContain("Matched on oxygen percentage (scenario 30 mol%)");
    expect(text).toContain("Matched on O2 partial pressure (computed)");
    expect(text).toContain("The two ways of matching point at different runs.");
  });
  it("says what does not transfer and links the gap to the missing experiment", () => {
    expect(text).toContain("are reference points, not bounds, for 0.165 g");
    expect(text).toContain("No curated run covers gravity at 0.165 g.");
    expect(text).toContain("See the experiment that would close it");
  });
  it("describes the evidence map in words", () => {
    expect(text).toContain("Hatched columns have no curated run");
    expect(text).toContain("Earth and orbit are reference points, not bounds for the Moon or Mars.");
  });
});
