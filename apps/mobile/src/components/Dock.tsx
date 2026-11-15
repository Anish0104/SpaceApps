export type Tab = "brief" | "atlas" | "lab" | "ask" | "saved";

const ITEMS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: "brief", label: "Brief", icon: <path d="M4 5h16v14H4zM4 9h16M8 13h8M8 16h5" /> },
  { id: "atlas", label: "Atlas", icon: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></> },
  { id: "lab", label: "Lab", icon: <path d="M12 3c3 4 3 6 0 9s-3 5 0 8M9 3c-2 3-2 5 0 7M15 3c2 3 2 5 0 7" /> },
  { id: "ask", label: "Ask", icon: <path d="M4 5h16v11H9l-4 3V5z" /> },
  { id: "saved", label: "Saved", icon: <path d="M6 3h12v18l-6-4-6 4z" /> },
];

/** Floating glass dock. Lab is raised, copper-lit. The current tab shows an animated blue indicator.
 *  The whole tab (icon + label) is tappable and at least 44px. */
export function Dock({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const idx = ITEMS.findIndex((i) => i.id === tab);
  return (
    <nav className="dock glass" aria-label="Primary">
      <span className="ind" style={{ left: `calc(${idx * 20}% + 10% - 9px)` }} aria-hidden="true" />
      {ITEMS.map((i) => (
        <button key={i.id} className={i.id === "lab" ? "lab" : ""} aria-current={tab === i.id} onClick={() => onTab(i.id)}>
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{i.icon}</svg>
          </span>
          {i.label}
        </button>
      ))}
    </nav>
  );
}
