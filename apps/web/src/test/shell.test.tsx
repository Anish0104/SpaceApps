import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

describe("app shell", () => {
  it("the menu opens, closes on Escape and returns focus to its button", () => {
    render(<MemoryRouter initialEntries={["/atlas"]}><App /></MemoryRouter>);
    const button = screen.getByRole("button", { name: "Menu" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("mobile-nav")).not.toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.getElementById("mobile-nav")).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("keeps Limits in the main navigation and every original route", () => {
    render(<MemoryRouter initialEntries={["/limits"]}><App /></MemoryRouter>);
    expect(screen.getAllByRole("link", { name: "Limits" }).length).toBeGreaterThan(0);
    for (const path of ["/", "/dashboard", "/atlas", "/ask", "/mission-lab", "/referee", "/missing-experiment", "/limits", "/investigation/PSI-98"]) {
      const { unmount } = render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
      expect(document.querySelector("main")?.textContent?.length, path).toBeGreaterThan(0);
      unmount();
    }
  });
});
