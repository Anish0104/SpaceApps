import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { scenarios } from "../data";
import { sceneFor } from "../scenes";
import { useTheme } from "../theme";

const SunMoon = ({ dark }: { dark: boolean }) =>
  dark
    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" /></svg>
    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>;

/** Floating glass top bar: brand, crew-environment dropdown, theme switch. The dropdown changes the one
 *  shared scenario; it closes on select, outside tap, or Escape. */
export function TopBar() {
  const { scenario: sc, setScenarioId } = useStore();
  const [theme, toggle] = useTheme();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <header className="topbar">
      <div className="topbar-in">
        <div className="brand"><img src="/icon.svg" alt="" aria-hidden="true" />Flame<b>Atlas</b></div>
        <div className="tb-picker" ref={wrap}>
          <button className="tb-env" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: sceneFor(sc).heroAccent, flex: "none" }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sceneFor(sc).label}</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {open && (
            <div className="dropdown" role="listbox" aria-label="Crew environment">
              {scenarios.map((s) => (
                <button key={s.id} role="option" aria-selected={sc.id === s.id} className={`dd-opt${sc.id === s.id ? " on" : ""}`} onClick={() => { setScenarioId(s.id); setOpen(false); }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: sceneFor(s).heroAccent, flex: "none" }} />
                  <span className="dd-name">{sceneFor(s).pickerLabel ?? s.name}</span>
                  {sc.id === s.id && <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m5 12 5 5L20 7" /></svg>}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="icon-btn" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}><SunMoon dark={theme === "dark"} /></button>
      </div>
    </header>
  );
}
