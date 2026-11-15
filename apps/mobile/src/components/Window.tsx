import { sceneFor, sceneSrcSet, sceneSrc, photoUrl } from "../scenes";
import type { Scenario } from "@flameatlas/engine";

/** The spacecraft window: a real NASA photograph for the environment, framed with corner marks, a
 *  scrim for legible text, and a credit that links to the original NASA image. Photos set the scene;
 *  they are never evidence. */
export function Window({ scenario, height = 250, sizes = "100vw", children }: {
  scenario: Pick<Scenario, "id" | "environment">; height?: number; sizes?: string; children?: React.ReactNode;
}) {
  const s = sceneFor(scenario);
  return (
    <div className="window" style={{ height }}>
      <img src={sceneSrc(s)} srcSet={sceneSrcSet(s)} sizes={sizes} alt={s.photo.caption} style={{ objectPosition: s.focus }} loading="eager" decoding="async" />
      <span className="corner c-tl" /><span className="corner c-tr" /><span className="corner c-bl" /><span className="corner c-br" />
      <div className="ov">
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <span className="place">{s.label}</span>
          {children}
        </div>
        <span className="credit mono">
          {s.photo.caption} · <a href={photoUrl(s.photo.nasaId)} target="_blank" rel="noreferrer">{s.photo.credit} ↗</a>
        </span>
      </div>
    </div>
  );
}
