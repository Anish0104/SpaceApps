import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Ask from "../pages/Ask";
import { ScenarioProvider, useScenario } from "../lib/scenario";
import { api } from "../lib/api";
import type { AskResponse } from "@flameatlas/engine";

const MOCK_RESPONSE: AskResponse = {
  status: "answered",
  verdict: "yellow",
  sentences: [
    { text: "NASA experiments show flame extinction limits under low gravity.", recordIds: ["PSI-1"] },
  ],
  differs: ["gravityG"],
  limit: "No direct tests at lunar pressure.",
  next: { kind: "missing_experiment", target: "Test fabric flammability under partial pressure." },
  scope: "In our curated dataset.",
  missingFields: [],
  source: "llm",
  dataVersion: "1.3.0",
};

// Component helper to switch scenarios externally
function ScenarioChanger() {
  const { setScenarioId } = useScenario();
  return (
    <button type="button" onClick={() => setScenarioId("mars")}>
      Switch to Mars
    </button>
  );
}

describe("scenario change after an answer", () => {
  it("shows 'Answered for <scenario>' and clicking 'Ask again' re-queries with the new scenario", async () => {
    const askSpy = vi.spyOn(api, "ask").mockResolvedValue(MOCK_RESPONSE);

    render(
      <MemoryRouter>
        <ScenarioProvider>
          <ScenarioChanger />
          <Ask />
        </ScenarioProvider>
      </MemoryRouter>
    );

    // Initial submit via form submission
    const form = screen.getByRole("button", { name: "Ask" }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/NASA experiments show flame extinction limits/i)).not.toBeNull();
    });

    // The answer was for default scenario (moon-challenge)
    expect(askSpy).toHaveBeenCalledWith(expect.any(String), "moon-challenge");

    // Now switch scenario to Mars
    const switchBtn = screen.getByRole("button", { name: "Switch to Mars" });
    fireEvent.click(switchBtn);

    // Should display the banner "Answered for Moon Base"
    await waitFor(() => {
      expect(screen.getByText(/Answered for Moon Base/i)).not.toBeNull();
    });

    // Should display button "Ask again for Mars habitat"
    const askAgainBtn = screen.getByRole("button", { name: /Ask again for Mars habitat/i });
    expect(askAgainBtn).not.toBeNull();

    // Click "Ask again for Mars habitat"
    fireEvent.click(askAgainBtn);

    await waitFor(() => {
      expect(askSpy).toHaveBeenCalledWith(expect.any(String), "mars");
    });
  });
});
