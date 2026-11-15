export type Tab = "home" | "atlas" | "lab" | "ask" | "settings";

const ITEMS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: "home", label: "Home", icon: <path d="M4 11.5 12 4l8 7.5M6 10v10h12V10" /> },
  { id: "atlas", label: "Atlas", icon: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></> },
  { id: "lab", label: "Lab", icon: <path d="M9 3h6M10 3v6l-5 8.5A2 2 0 0 0 6.7 21h10.6a2 2 0 0 0 1.7-3L14 9V3" /> },
  { id: "ask", label: "Ask", icon: <path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 20l1.8-5.1A7.5 7.5 0 1 1 20 11.5Z" /> },
  { id: "settings", label: "Settings", icon: <><circle cx="12" cy="12" r="3.2" /><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-1.7-1l-.3-2.6h-4l-.3 2.6a7.6 7.6 0 0 0-1.7 1l-2.3-1-2 3.4L4.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7.6 7.6 0 0 0 1.7-1l2.3 1 2-3.4z" /></> },
];

/** The single navigation surface: a compact floating dock. A coral pill slides to the active tab;
 *  there is no top chrome anywhere in the app. */
export function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const idx = ITEMS.findIndex((i) => i.id === tab);
  return (
    <nav className="tabbar" aria-label="Primary">
      <span className="tab-slide" style={{ transform: `translateX(${idx * 100}%)` }} aria-hidden="true">
        <i key={tab} className="tab-jelly" />
      </span>
      {ITEMS.map((i) => (
        <button key={i.id} aria-current={tab === i.id} onClick={() => onTab(i.id)}>
          <span className="ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{i.icon}</svg>
          </span>
          <span className="lbl">{i.label}</span>
        </button>
      ))}
    </nav>
  );
}
