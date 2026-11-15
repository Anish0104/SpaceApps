import { useStore } from "../store";
import { invById, runsFor } from "../data";

/** Saved: records bookmarked on this device (localStorage), usable offline. Open the source or remove. */
export function Saved({ onOpenAtlas }: { onOpenAtlas: () => void }) {
  const { saved, toggleSave } = useStore();

  if (!saved.length) {
    return (
      <>
        <div className="eyebrow">Saved</div>
        <h1 className="h-xl">Your brief is empty</h1>
        <p className="small">Save investigations from the Atlas to keep them here — available offline, on this device.</p>
        <button className="btn primary" style={{ marginTop: 14 }} onClick={onOpenAtlas}>Browse the Atlas</button>
      </>
    );
  }

  return (
    <>
      <div className="eyebrow">Saved · {saved.length}</div>
      <h1 className="h-xl">Your brief</h1>
      <div className="card" style={{ marginTop: 10 }}>
        {saved.map((id) => {
          const inv = invById(id);
          if (!inv) return null;
          const runs = runsFor(id).length;
          return (
            <div className="item" key={id}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{inv.acronym} <span className="faint small mono">{id}</span></div>
                <p className="small" style={{ margin: "2px 0 0" }}>{inv.name}</p>
                <div className="row" style={{ gap: 10, marginTop: 6 }}>
                  <span className="small faint mono">{runs} run{runs === 1 ? "" : "s"}</span>
                  <a className="src" href={inv.url} target="_blank" rel="noreferrer">PSI ↗</a>
                </div>
              </div>
              <button className="btn ghost" style={{ width: "auto", minHeight: 36, padding: "0 12px", fontSize: 13 }} onClick={() => toggleSave(id)}>Remove</button>
            </div>
          );
        })}
      </div>
      <p className="small faint" style={{ marginTop: 12 }}>Saved on this device only. Record summaries are bundled and work offline; original NASA documents need a connection.</p>
    </>
  );
}
