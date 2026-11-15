import { useEffect, useState } from "react";
import { coverage } from "./data";
import { Home } from "./screens/Home";
import { Lab } from "./screens/Lab";
import { Atlas } from "./screens/Atlas";
import { Sms } from "./screens/Sms";

type Tab = "home" | "lab" | "atlas" | "sms";

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: "home", label: "Home", icon: <path d="M3 11 12 3l9 8M5 10v10h14V10" /> },
  { id: "lab", label: "Mission Lab", icon: <><circle cx="12" cy="13" r="6" /><path d="M9 3h6M12 3v4" /></> },
  { id: "atlas", label: "Atlas", icon: <><circle cx="11" cy="11" r="7" /><path d="m21 21-5-5" /></> },
  { id: "sms", label: "SMS", icon: <path d="M4 5h16v11H9l-4 3V5z" /> },
];

export function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false), off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  return (
    <div className="app">
      {offline && <div className="offline">Offline — the evidence browser still works from your device</div>}
      <header className="topbar">
        <img className="logo" src="/icon.svg" alt="" aria-hidden="true" />
        <div className="brand">FlameAtlas <span>· phoneSpaceApp</span></div>
        <div className="ver">data {coverage.version}</div>
      </header>

      <main className="main">
        {tab === "home" && <Home onOpenLab={() => setTab("lab")} onOpenSms={() => setTab("sms")} />}
        {tab === "lab" && <Lab />}
        {tab === "atlas" && <Atlas />}
        {tab === "sms" && <Sms />}
      </main>

      <nav className="nav" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
            <span className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
