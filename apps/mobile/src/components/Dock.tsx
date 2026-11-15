export type Tab = "home" | "atlas" | "lab" | "ask" | "settings";

const ITEMS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: "home", label: "Home", icon: <path d="M4 11.5 12 4l8 7.5M6 10v10h12V10" /> },
  { id: "atlas", label: "Atlas", icon: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></> },
  { id: "lab", label: "Lab", icon: <path d="M12 3c3 4 3 6 0 9s-3 5 0 8M9 3c-2 3-2 5 0 7M15 3c2 3 2 5 0 7" /> },
  { id: "ask", label: "Ask", icon: <path d="M4 5h16v11H9l-4 3V5z" /> },
  { id: "settings", label: "Settings", icon: <><circle cx="12" cy="12" r="3.2" /><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-1.7-1l-.3-2.6h-4l-.3 2.6a7.6 7.6 0 0 0-1.7 1l-2.3-1-2 3.4L4.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7.6 7.6 0 0 0 1.7-1l2.3 1 2-3.4z" /></> },
];

/** Bottom navigation — the only chrome. A copper active pill slides between tabs. Full tab tappable,
 *  44px targets, visible focus, safe-area aware. One accent colour, consistent across the app. */
export function Dock({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const idx = ITEMS.findIndex((i) => i.id === tab);
  return (
    <nav className="dock" aria-label="Primary">
      <span className="dock-slide" style={{ transform: `translateX(${idx * 100}%)` }} aria-hidden="true" />
      {ITEMS.map((i) => (
        <button key={i.id} aria-current={tab === i.id} onClick={() => onTab(i.id)}>
          <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{i.icon}</svg></span>
          {i.label}
        </button>
      ))}
    </nav>
  );
}
