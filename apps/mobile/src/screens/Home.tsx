import { coverage } from "../data";

export function Home({ onOpenLab, onOpenSms }: { onOpenLab: () => void; onOpenSms: () => void }) {
  return (
    <>
      <h1>Fire safety from<br />NASA's microgravity data</h1>
      <p className="lead">
        FlameAtlas ranks real NASA combustion investigations for a crew environment, shows which
        results can fairly be compared, and names the experiment that would close the gap.
      </p>
      <p className="small faint">We show what the evidence supports — never whether a material is safe.</p>

      <h2>Coverage</h2>
      <div className="grid2">
        <div className="tile"><div className="n">{coverage.investigations}</div><div className="l">Investigations</div></div>
        <div className="tile"><div className="n">{coverage.runs}</div><div className="l">Runs imported</div></div>
        <div className="tile"><div className="n">{coverage.verified}</div><div className="l">Runs verified</div></div>
        <div className="tile"><div className="n">{coverage.sources}</div><div className="l">NASA sources</div></div>
      </div>

      <h2>Start</h2>
      <div className="card">
        <h3>Mission Lab</h3>
        <p className="small">Dial a habitat's gravity, oxygen and pressure. Watch the flame change and read what the evidence covers.</p>
        <button className="btn" onClick={onOpenLab}>Open Mission Lab</button>
      </div>
      <div className="card">
        <h3>Text the archive</h3>
        <p className="small">Any phone can ask FlameAtlas by SMS — a cited answer, no app needed.</p>
        <button className="btn ghost" onClick={onOpenSms}>See the SMS interface</button>
      </div>

      <p className="small faint" style={{ marginTop: 18 }}>
        Every number traces to a NASA source. Missing values are shown as unknown, never as zero.
      </p>
    </>
  );
}
