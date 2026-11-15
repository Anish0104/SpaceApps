import { afterEach, describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Scenario, rankInvestigations } from "@flameatlas/engine";
import App from "../App";
import { evidenceSegments } from "../components/CoveragePreview";
import { dataset, runsFor, scenarios } from "../lib/data";
import { JOURNEY, JOURNEY_SECONDS } from "../lib/journey";

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const navPicker = () => screen.getByRole("combobox", { name: "Crew environment" }) as HTMLSelectElement;
const openDashboard = () => fireEvent.click(screen.getAllByRole("link", { name: /Open the dashboard/ })[0]!);
const backHome = () => fireEvent.click(screen.getAllByRole("link", { name: /Back to home/ })[0]!);
const hero = () => screen.getByRole("region", { name: /how does fire behave/i });

afterEach(() => vi.useRealTimers());

describe("one global scenario across the landing page and the dashboard", () => {
  it("the dashboard opens on the default scenario", () => {
    renderAt("/");
    openDashboard();
    expect(navPicker().value).toBe("moon-challenge");
  });

  it("a scenario chosen in the dashboard shows on the landing page's live preview", () => {
    renderAt("/dashboard");
    fireEvent.change(navPicker(), { target: { value: "mars" } });
    backHome();
    expect(screen.getByRole("complementary", { name: "Evidence preview for Mars habitat" })).toBeTruthy();
  });

  it("the selection carries across dashboard pages", () => {
    renderAt("/dashboard");
    fireEvent.change(navPicker(), { target: { value: "iss" } });
    fireEvent.click(screen.getAllByRole("link", { name: "Atlas" })[0]!);
    expect(navPicker().value).toBe("iss");
    expect(screen.getByText(/Ranked for/).textContent).toContain("ISS / spacecraft cabin");
  });

  it("the landing page has no manual environment picker: the window changes on its own", () => {
    renderAt("/");
    expect(within(hero()).queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Crew environment" })).toBeNull();
  });
});

describe("spacecraft window (landing hero)", () => {
  const credit = () => within(hero()).getByRole("link", { name: /NASA [\w-]+$/ });

  it("starts in low Earth orbit and credits the real NASA photo", () => {
    renderAt("/");
    expect(credit().getAttribute("href")).toBe(`https://images.nasa.gov/details/${JOURNEY[0]!.nasaId}`);
    expect(within(hero()).getAllByText(/Low Earth orbit/).length).toBeGreaterThan(0);
    expect(within(hero()).getAllByRole("listitem")).toHaveLength(JOURNEY.length);
  });

  it("moves to the next view on its own, and stops while paused", () => {
    vi.useFakeTimers();
    renderAt("/");
    act(() => vi.advanceTimersByTime(JOURNEY_SECONDS * 1000 + 50));
    expect(credit().getAttribute("href")).toContain(JOURNEY[1]!.nasaId);

    fireEvent.click(within(hero()).getByRole("button", { name: "Pause the journey" }));
    act(() => vi.advanceTimersByTime(JOURNEY_SECONDS * 3000));
    expect(credit().getAttribute("href")).toContain(JOURNEY[1]!.nasaId);

    fireEvent.click(within(hero()).getByRole("button", { name: "Resume the journey" }));
    act(() => vi.advanceTimersByTime(JOURNEY_SECONDS * 1000 + 50));
    expect(credit().getAttribute("href")).toContain(JOURNEY[2]!.nasaId);
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

  it("a hatched (Unknown) segment on the overview opens Missing experiment with the scenario kept", () => {
    renderAt("/dashboard");
    fireEvent.change(navPicker(), { target: { value: "moon-fm2" } });
    fireEvent.click(screen.getByRole("link", { name: /Gravity 0\.165 g: Unknown/ }));
    expect(navPicker().value).toBe("moon-fm2");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/missing experiment/i);
  });
});

describe("dashboard overview", () => {
  it("a quick question hands off to the Ask page and is asked there", async () => {
    renderAt("/dashboard");
    const box = screen.getByLabelText("Your combustion question") as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "Would fabric burn differently on the Moon?" } });
    fireEvent.submit(box.closest("form")!);
    expect(await screen.findByRole("heading", { level: 1, name: "Ask the archive" })).toBeTruthy();
  });
});
