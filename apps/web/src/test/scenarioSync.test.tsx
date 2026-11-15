import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Scenario, rankInvestigations } from "@flameatlas/engine";
import App from "../App";
import { evidenceSegments } from "../components/CoveragePreview";
import { dataset, runsFor, scenarios } from "../lib/data";

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const navPicker = () => screen.getByRole("combobox", { name: "Crew environment" }) as HTMLSelectElement;
const heroSelector = () => screen.getByRole("radiogroup", { name: "Crew environment" });
const checked = () => within(heroSelector()).getByRole("radio", { checked: true });
const checkedName = () => checked().getAttribute("aria-label");

describe("one global scenario: nav picker and hero selector stay in sync", () => {
  it("starts on the same scenario in both", () => {
    renderAt("/");
    expect(navPicker().value).toBe("moon-challenge");
    expect(checkedName()).toBe("Moon base");
  });

  it("choosing in the hero selector updates the nav picker", () => {
    renderAt("/");
    fireEvent.click(within(heroSelector()).getByRole("radio", { name: "Moon habitat" }));
    expect(navPicker().value).toBe("moon-fm2");
    expect(checkedName()).toBe("Moon habitat");
  });

  it("choosing in the nav picker updates the hero selector", () => {
    renderAt("/");
    fireEvent.change(navPicker(), { target: { value: "mars" } });
    expect(checkedName()).toBe("Mars");
    expect(within(heroSelector()).getByRole("radio", { name: "Moon base" }).getAttribute("aria-checked")).toBe("false");
  });

  it("arrow keys move and select within the hero selector, and the picker follows", () => {
    renderAt("/");
    fireEvent.keyDown(checked(), { key: "ArrowRight" });
    expect(navPicker().value).toBe("moon-fm2");
    fireEvent.keyDown(checked(), { key: "Home" });
    expect(navPicker().value).toBe(scenarios[0].id);
  });

  it("changes the scene photo with the environment and credits the real NASA image", () => {
    renderAt("/");
    const hero = screen.getByRole("region", { name: /how does fire behave/i });
    fireEvent.change(navPicker(), { target: { value: "rover" } });
    expect(within(hero).getByRole("link", { name: /as17-147-22527/ }).getAttribute("href")).toBe("https://images.nasa.gov/details/as17-147-22527");
    fireEvent.change(navPicker(), { target: { value: "earth" } });
    expect(within(hero).getByRole("link", { name: /GRC-1998-C-00486/ })).toBeTruthy();
    expect(within(hero).queryByRole("link", { name: /as17-147-22527/ })).toBeNull();
  });

  it("the selection carries into other pages", () => {
    renderAt("/");
    fireEvent.change(navPicker(), { target: { value: "iss" } });
    fireEvent.click(screen.getAllByRole("link", { name: "Atlas" })[0]);
    expect(navPicker().value).toBe("iss");
    expect(screen.getByText(/Ranked for/).textContent).toContain("ISS / spacecraft cabin");
  });
});

describe("where the evidence ends", () => {
  const segs = (id: string) => {
    const sc = Scenario.parse(scenarios.find((s) => s.id === id));
    const ranked = rankInvestigations(dataset.investigations.map((inv) => ({ investigation: inv, runs: runsFor(inv.psiId), questionScore: 0 })), sc);
    return Object.fromEntries(evidenceSegments(sc, ranked).map((s) => [s.id, s.count]));
  };

  it("counts only what the ranking documents: no lunar-gravity records, many at ~0 g", () => {
    expect(segs("moon-fm2").gravity).toBe(0);
    expect(segs("iss").gravity).toBeGreaterThan(0);
  });

  it("a hatched (Unknown) segment opens Missing experiment with the scenario kept", () => {
    renderAt("/");
    fireEvent.change(navPicker(), { target: { value: "moon-fm2" } });
    fireEvent.click(screen.getByRole("link", { name: /Gravity 0\.165 g: Unknown/ }));
    expect(navPicker().value).toBe("moon-fm2");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/missing experiment/i);
  });
});
