import { useTheme } from "../lib/theme";

/**
 * Theme switch: a 52x28 pill. Light: day sky, sun knob on the left. Dark: night sky with stars,
 * moon knob on the right. The knob slides in 350 ms; instant under prefers-reduced-motion.
 * The button is the hit box around the pill: on touch screens it grows to 68x44 without moving the layout.
 */
export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark theme"
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="theme-switch"
      data-on={dark}
    >
      <span className="theme-switch-pill">
        <svg aria-hidden="true" viewBox="0 0 52 28" width="52" height="28">
          <defs>
            <linearGradient id="ts-day" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7fb3ea" />
              <stop offset="100%" stopColor="#c7e0f6" />
            </linearGradient>
            <linearGradient id="ts-night" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a1124" />
              <stop offset="100%" stopColor="#1b2648" />
            </linearGradient>
            <clipPath id="ts-clip">
              <rect width="52" height="28" rx="14" />
            </clipPath>
          </defs>
          <g clipPath="url(#ts-clip)">
            <g className="ts-day">
              <rect width="52" height="28" fill="url(#ts-day)" />
              <g fill="#fff" opacity="0.9">
                <ellipse cx="36" cy="17" rx="6" ry="2.4" />
                <ellipse cx="39" cy="15.4" rx="3.6" ry="2.3" />
              </g>
            </g>
            <g className="ts-night">
              <rect width="52" height="28" fill="url(#ts-night)" />
              <g fill="#eceef4">
                <circle cx="9" cy="8" r="0.8" />
                <circle cx="15" cy="18" r="0.6" />
                <circle cx="20" cy="9.5" r="0.5" />
                <circle cx="7" cy="20" r="0.5" />
              </g>
            </g>
            <g className="ts-knob">
              <circle cx="14" cy="14" r="10" fill={dark ? "#e7e9f0" : "#ffd36b"} style={{ transition: "fill 350ms ease" }} />
              <g style={{ opacity: dark ? 1 : 0, transition: "opacity 350ms ease" }} fill="#c4c8d4">
                <circle cx="10.5" cy="11.5" r="2" />
                <circle cx="16.5" cy="16.5" r="1.4" />
                <circle cx="16" cy="9.5" r="1" />
              </g>
            </g>
          </g>
        </svg>
      </span>
    </button>
  );
}
