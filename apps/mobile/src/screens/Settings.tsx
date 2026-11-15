import { useStore } from "../store";
import { scenarios, coverage, invById } from "../data";
import { sceneFor } from "../scenes";
import { useTheme } from "../theme";

/** Settings: appearance, crew environment, saved records, and the honest scope of the app. */
export function Settings({ onOpenAtlas }: { onOpenAtlas: () => void }) {
  const { scenario: sc, setScenarioId, saved, toggleSave } = useStore();
  const [theme, toggle] = useTheme();

  return (
    <div className="page">
      <h1 className="title">Settings</h1>

      <h2 className="sec">Appearance</h2>
      <div className="card">
        <div className="srow">
          <div><div className="srow-t">Theme</div><div className="srow-s">{theme === "dark" ? "Dark" : "Light"} mode</div></div>
          <div className="seg" role="group" aria-label="Theme">
            <button className={theme === "light" ? "on" : ""} aria-pressed={theme === "light"} onClick={() => theme === "dark" && toggle()}>Light</button>
            <button className={theme === "dark" ? "on" : ""} aria-pressed={theme === "dark"} onClick={() => theme === "light" && toggle()}>Dark</button>
          </div>
        </div>
      </div>

      <h2 className="sec">Crew environment</h2>
      <div className="card" style={{ padding: 8 }}>
        {scenarios.map((s) => (
          <button key={s.id} className={`listrow${sc.id === s.id ? " on" : ""}`} aria-pressed={sc.id === s.id} onClick={() => setScenarioId(s.id)}>
            <span className="dotc" style={{ background: sceneFor(s).heroAccent }} />
            <span className="listrow-t">{sceneFor(s).pickerLabel ?? s.name}</span>
            {sc.id === s.id && <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m5 12 5 5L20 7" /></svg>}
          </button>
        ))}
      </div>

      <h2 className="sec">Saved records · {saved.length}</h2>
      <div className="card" style={{ padding: saved.length ? 8 : 16 }}>
        {saved.length === 0
          ? <p className="srow-s" style={{ margin: 0 }}>Save investigations from the <button className="inline-link" onClick={onOpenAtlas}>Atlas</button> to keep them here, offline.</p>
          : saved.map((id) => {
              const inv = invById(id); if (!inv) return null;
              return (
                <div key={id} className="listrow">
                  <span className="listrow-t"><b>{inv.acronym}</b> <span className="mono faint" style={{ fontSize: 12 }}>{id}</span></span>
                  <button className="rm" onClick={() => toggleSave(id)} aria-label={`Remove ${inv.acronym}`}>Remove</button>
                </div>
              );
            })}
      </div>

      <h2 className="sec">About</h2>
      <div className="card">
        <p className="srow-s" style={{ marginTop: 0 }}>
          FlameAtlas reads NASA's microgravity combustion archive for a crew environment. Evidence strength and
          relevance describe the archive — never whether a material is safe. Data version {coverage.version};
          {" "}{coverage.investigations} investigations, {coverage.verified} of {coverage.runs} runs verified.
        </p>
        <p className="srow-s" style={{ marginBottom: 0 }}>Photos are public-domain NASA imagery, credited where shown. Built for NASA Space Apps 2026.</p>
      </div>
    </div>
  );
}
