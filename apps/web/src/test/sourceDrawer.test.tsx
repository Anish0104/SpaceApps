import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { useState, useRef } from "react";
import { SourceDrawer } from "../components/SourceDrawer";
import { RecordTag } from "../components/RecordTag";

function TestDrawerHarness({ recordId = "PSI-1" }: { recordId?: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const tagRef = useRef<HTMLElement | null>(null);

  return (
    <div>
      <RecordTag
        id={recordId}
        onSelect={(id, el) => {
          tagRef.current = el;
          setSelected(id);
        }}
      />
      <SourceDrawer
        recordId={selected}
        onClose={() => setSelected(null)}
        returnFocusRef={tagRef as React.RefObject<HTMLElement>}
      />
    </div>
  );
}

describe("source drawer", () => {
  it("clicking a record tag opens the drawer with that record data", () => {
    render(<TestDrawerHarness recordId="PSI-1" />);

    // Initially drawer is not visible
    expect(screen.queryByRole("dialog")).toBeNull();

    // Click the record tag button
    const tag = screen.getByRole("button", { name: /open record details for PSI-1/i });
    fireEvent.click(tag);

    // Drawer is now open
    const drawer = screen.getByRole("dialog");
    expect(drawer).not.toBeNull();
    expect(within(drawer).getByRole("heading", { name: "PSI-1" })).not.toBeNull();
  });

  it("Escape closes the drawer and returns focus to the tag", () => {
    render(<TestDrawerHarness recordId="PSI-1" />);

    const tag = screen.getByRole("button", { name: /open record details for PSI-1/i });
    tag.focus();
    fireEvent.click(tag);

    expect(screen.getByRole("dialog")).not.toBeNull();

    // Press Escape
    fireEvent.keyDown(document, { key: "Escape" });

    // Drawer is closed
    expect(screen.queryByRole("dialog")).toBeNull();

    // Focus returns to the tag button
    expect(document.activeElement).toBe(tag);
  });

  it("clicking outside the drawer (backdrop) closes it", () => {
    render(<TestDrawerHarness recordId="PSI-1" />);

    const tag = screen.getByRole("button", { name: /open record details for PSI-1/i });
    fireEvent.click(tag);

    expect(screen.getByRole("dialog")).not.toBeNull();

    // The backdrop is the element with aria-hidden="true" and bg-black/40
    const backdrop = document.querySelector(".fixed.inset-0.z-40");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    // Drawer is closed
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
