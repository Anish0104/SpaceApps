import { useStore } from "../store";

export type Tab = "brief" | "atlas" | "lab" | "ask" | "saved";

const ITEMS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: "brief", label: "Brief", icon: <path d="M4 5h16v14H4zM4 9h16M8 13h8M8 16h5" /> },
  { id: "atlas", label: "Atlas", icon: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></> },
  { id: "lab", label: "Lab", icon: <path d="M12 3c3 4 3 6 0 9s-3 5 0 8M9 3c-2 3-2 5 0 7M15 3c2 3 2 5 0 7" /> },
  { id: "ask", label: "Ask", icon: <path d="M4 5h16v11H9l-4 3V5z" /> },
  { id: "saved", label: "Saved", icon: <path d="M6 3h12v18l-6-4-6 4z" /> },
];

/**
 * Bottom navigation dock, modelled on WhatsApp's modern glass bar: an iOS liquid-glass pill with a
 * smooth emerald active pill that slides between tabs, count badges and status dots. Full tab tappable,
 * 44px targets, visible focus, safe-area aware.
 */
export function Dock({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const { saved } = useStore();
  const idx = ITEMS.findIndex((i) => i.id === tab);
  const badge: Partial<Record<Tab, number>> = { saved: saved.length };

  return (
    <nav className="dock" aria-label="Primary">
      <span className="dock-slide" style={{ transform: `translateX(${idx * 100}%)` }} aria-hidden="true" />
      {ITEMS.map((i) => {
        const n = badge[i.id];
        return (
          <button key={i.id} aria-current={tab === i.id} onClick={() => onTab(i.id)}>
            <span className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{i.icon}</svg>
              {n ? <span className="badge" aria-label={`${n} saved`}>{n > 99 ? "99+" : n}</span> : null}
              {i.id === "ask" && <span className="status-dot" aria-hidden="true" />}
            </span>
            {i.label}
          </button>
        );
      })}
    </nav>
  );
}
