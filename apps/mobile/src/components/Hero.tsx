import { SpacecraftWindow } from "./SpacecraftWindow";

/** The landing / hero screen: a spacecraft porthole onto real NASA flight imagery, with the challenge
 *  name and one call to action into the app overlaid on the glass. */
export function Hero({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="hero-screen" role="dialog" aria-label="Welcome to Oxyflame">
      <SpacecraftWindow>
        <p className="hero-eyebrow">NASA Space Apps 2026</p>
        <h1 className="hero-title">Oxyflame</h1>
        <p className="hero-tag">NASA's microgravity combustion archive, read for your crew's environment.</p>
        <button className="btn primary" onClick={onEnter}>Enter Oxyflame</button>
      </SpacecraftWindow>
    </div>
  );
}
