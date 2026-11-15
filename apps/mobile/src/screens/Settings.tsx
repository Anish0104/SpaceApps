import { useStore } from "../store";
import { scenarios, coverage, invById } from "../data";
import { sceneFor, orbStyle } from "../scenes";
import { useTheme } from "../theme";

const Check = () => (
  <svg className="check" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>
);

/** Settings: appearance, crew environment, saved records, and the honest scope of the app. */
export function Settings({ onOpenAtlas }: { onOpenAtlas: () => void }) {
  const { scenario: sc, setScenarioId, saved, toggleSave } = useStore();
  const [theme, toggle] = useTheme();

  return (
    <div className="page">
      <h1 className="title">Settings</h1>

      <div className="sec">Appearance</div>
      <div className="card">
        <div className="row between">
          <div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>Theme</div>
            <div className="cell-s">{theme === "dark" ? "Dark" : "Light"}</div>
          </div>
          <div className="seg" role="group" aria-label="Theme">
            <button className={theme === "light" ? "on" : ""} aria-pressed={theme === "light"} onClick={() => theme === "dark" && toggle()}>Light</button>
            <button className={theme === "dark" ? "on" : ""} aria-pressed={theme === "dark"} onClick={() => theme === "light" && toggle()}>Dark</button>
          </div>
        </div>
      </div>

      <div className="sec">Crew environment</div>
      <div className="group">
        {scenarios.map((s) => {
          const on = sc.id === s.id;
          return (
            <button key={s.id} className={`cell${on ? " sel" : ""}`} aria-pressed={on} onClick={() => setScenarioId(s.id)}>
              <span className="orb" style={orbStyle(sceneFor(s).heroAccent)} />
              <span className="cell-t">{sceneFor(s).pickerLabel ?? s.name}</span>
              {on && <Check />}
            </button>
          );
        })}
      </div>

      <div className="sec">Saved records · {saved.length}</div>
      <div className="group">
        {saved.length === 0 ? (
          <p className="caption" style={{ padding: 16, margin: 0 }}>
            Save investigations from the <button className="src" style={{ background: "none", border: 0, padding: 0 }} onClick={onOpenAtlas}>Atlas</button> to keep them here, offline.
          </p>
        ) : (
          saved.map((id) => {
            const inv = invById(id); if (!inv) return null;
            return (
              <div key={id} className="cell">
                <span className="cell-t"><b style={{ fontWeight: 600 }}>{inv.acronym}</b> <span className="item-id num">{id}</span></span>
                <button className="toggle" onClick={() => toggleSave(id)} aria-label={`Remove ${inv.acronym}`}>Remove</button>
              </div>
            );
          })
        )}
      </div>

      <div className="sec">About</div>
      <div className="card">
        <p className="caption" style={{ marginTop: 0 }}>
          Oxyflame reads NASA's microgravity combustion archive for a crew environment. Evidence strength and relevance
          describe the archive — never whether a material is safe. Data version {coverage.version}; {coverage.investigations} investigations,
          {" "}{coverage.verified} of {coverage.runs} runs verified.
        </p>
        <p className="caption" style={{ marginBottom: 0 }}>Built for NASA Space Apps 2026.</p>
      </div>
    </div>
  );
}
