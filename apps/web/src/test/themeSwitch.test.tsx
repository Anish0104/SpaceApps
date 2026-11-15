import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { ThemeSwitch } from "../components/ThemeSwitch";
import { THEME_KEY } from "../lib/theme";
import indexHtml from "../../index.html?raw";

const realMatchMedia = window.matchMedia;
function systemPrefers(theme: "light" | "dark") {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("light") ? theme === "light" : theme === "dark",
    media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const root = document.documentElement;
const theSwitch = () => screen.getByRole("switch", { name: "Dark theme" });

beforeEach(() => {
  window.localStorage.clear();
  root.removeAttribute("data-theme");
  root.style.colorScheme = "";
});
afterEach(() => {
  window.matchMedia = realMatchMedia;
  vi.restoreAllMocks();
});

describe("theme switch", () => {
  it("follows the system theme on a first visit", () => {
    systemPrefers("light");
    render(<ThemeSwitch />);
    expect(theSwitch().getAttribute("aria-checked")).toBe("false");
    expect(root.dataset.theme).toBe("light");
  });

  it("follows a dark system theme too", () => {
    systemPrefers("dark");
    render(<ThemeSwitch />);
    expect(theSwitch().getAttribute("aria-checked")).toBe("true");
    expect(root.dataset.theme).toBe("dark");
  });

  it("toggles on click, updates aria-checked and the page theme, and persists the choice", () => {
    systemPrefers("dark");
    render(<ThemeSwitch />);
    fireEvent.click(theSwitch());
    expect(theSwitch().getAttribute("aria-checked")).toBe("false");
    expect(root.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
  });

  it("an explicit choice wins over the system theme on the next visit", () => {
    window.localStorage.setItem(THEME_KEY, "light");
    systemPrefers("dark");
    render(<ThemeSwitch />);
    expect(theSwitch().getAttribute("aria-checked")).toBe("false");
    expect(root.dataset.theme).toBe("light");
  });

  it("works from the keyboard: Tab to focus, Enter and Space toggle", async () => {
    systemPrefers("dark");
    const user = userEvent.setup();
    render(<ThemeSwitch />);
    await user.tab();
    expect(document.activeElement).toBe(theSwitch());
    await user.keyboard("{Enter}");
    expect(theSwitch().getAttribute("aria-checked")).toBe("false");
    await user.keyboard(" ");
    expect(theSwitch().getAttribute("aria-checked")).toBe("true");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");
  });

  it("still switches when storage is unavailable", () => {
    systemPrefers("dark");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    render(<ThemeSwitch />);
    fireEvent.click(theSwitch());
    expect(root.dataset.theme).toBe("light");
  });

  it("changing the theme keeps the selected scenario", () => {
    systemPrefers("dark");
    render(<MemoryRouter initialEntries={["/dashboard"]}><App /></MemoryRouter>);
    const picker = screen.getByRole("combobox", { name: "Crew environment" }) as HTMLSelectElement;
    fireEvent.change(picker, { target: { value: "mars" } });
    fireEvent.click(theSwitch());
    expect(root.dataset.theme).toBe("light");
    expect(picker.value).toBe("mars");
  });
});

describe("no-flash script in index.html", () => {
  const html = indexHtml;
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";
  const run = () => new Function(script)();

  it("is inline in <head>, before the app bundle", () => {
    expect(script).toContain(THEME_KEY);
    expect(html.indexOf(script)).toBeLessThan(html.indexOf('src="/src/main.tsx"'));
  });

  it("applies the saved choice before first paint", () => {
    window.localStorage.setItem(THEME_KEY, "light");
    systemPrefers("dark");
    run();
    expect(root.dataset.theme).toBe("light");
  });

  it("falls back to the system theme, and to dark when storage throws", () => {
    systemPrefers("light");
    run();
    expect(root.dataset.theme).toBe("light");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    systemPrefers("dark");
    run();
    expect(root.dataset.theme).toBe("dark");
  });
});
