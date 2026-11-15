/** The FlameAtlas mark: a thin copper flame in two strokes. Brand only; copper never encodes data. */
export function FlameMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.6} viewBox="0 0 20 32" aria-hidden="true" className="shrink-0" fill="none" stroke="var(--brand)" strokeLinecap="round">
      <path strokeWidth="1.6" d="M11.5 1.5C9 6 15.5 9.5 15.5 17.5C15.5 24 12 29 7.5 30.5C9.5 27.5 10.5 24 9.5 20.5C8.5 17 5.5 15.5 5.5 11.5" />
      <path strokeWidth="1.3" d="M8 9.5C4 13 2.5 17.5 3.5 22C4.4 26 6.5 28.5 7.5 30.5" />
      <path strokeWidth="1.1" d="M13 12.5C13.5 16.5 12.5 19.5 10.5 22.5" />
    </svg>
  );
}
