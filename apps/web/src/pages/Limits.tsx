const LIMITS = [
  "Not a safety rating: FlameAtlas never says a material is safe or unsafe.",
  "No bounds from endpoints: Earth and orbit are reference points, not limits for the Moon.",
  "No cross-material or cross-apparatus transfer without evidence.",
  "Gaps are dataset gaps: \"not in our curated data,\" never \"nobody has studied it.\"",
  "Proposals are illustrative, not approved NASA protocols.",
  "No invented numbers: uncertainty and cost stay at zero until sourced; pixels are never a spread rate without calibration.",
  "No superintelligence claim: SI-powered and AI agents only.",
  "No FM2 predictions: \"lines up with FM2's design,\" never \"predicted.\"",
];

export default function Limits() {
  return (
    <div className="space-y-6">
      <h1 className="display text-2xl sm:text-3xl">What FlameAtlas does not claim</h1>
      <ol className="measure list-decimal space-y-3 pl-6">{LIMITS.map((l) => <li key={l} className="pl-1">{l}</li>)}</ol>
    </div>
  );
}
