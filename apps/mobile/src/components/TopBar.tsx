import { useState } from "react";
import { useStore } from "../store";
import { scenarios } from "../data";
import { sceneFor } from "../scenes";
import { useTheme } from "../theme";
import { Sheet } from "./Sheet";

const SunMoon = ({ dark }: { dark: boolean }) =>
  dark
    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" /></svg>
    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>;

/** Floating glass top bar: brand, crew-environment picker, and theme switch. The picker opens a sheet
 *  with every preset; it changes the one shared scenario across the whole app. */
export function TopBar() {
  const { scenario: sc, setScenarioId } = useStore();
  const [theme, toggle] = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar-in">
        <div className="brand"><img src="/icon.svg" alt="" aria-hidden="true" />Flame<b>Atlas</b></div>
        <button className="tb-env" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`Crew environment: ${sc.name}. Change`}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: sceneFor(sc).heroAccent }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sceneFor(sc).label}</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        <button className="icon-btn" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}><SunMoon dark={theme === "dark"} /></button>
      </div>

      {open && (
        <Sheet title="Crew environment" onClose={() => setOpen(false)}>
          {scenarios.map((s) => (
            <button key={s.id} className="opt" aria-pressed={sc.id === s.id} onClick={() => { setScenarioId(s.id); setOpen(false); }}>
              <span className="row" style={{ gap: 10 }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: sceneFor(s).heroAccent }} />
                {s.name}
              </span>
              <small>{Number(s.o2MolPct)}% O₂ · {Number(s.gravityG)} g</small>
            </button>
          ))}
          <p className="small faint" style={{ marginTop: 4 }}>One shared scenario across Brief, Lab, Atlas and Ask.</p>
        </Sheet>
      )}
    </header>
  );
}
