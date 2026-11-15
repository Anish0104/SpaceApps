import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { ScenarioProvider, useScenario } from "./lib/scenario";
import { ScenarioPicker } from "./components/ScenarioPicker";
import { FlameMark } from "./components/FlameMark";
import { ThemeSwitch } from "./components/ThemeSwitch";
import { SceneBackdrop } from "./components/SceneBackdrop";
import Home from "./pages/Home";
import Atlas from "./pages/Atlas";
import Investigation from "./pages/Investigation";
import Ask from "./pages/Ask";
import MissionLab from "./pages/MissionLab";
import Referee from "./pages/Referee";
import MissingExperiment from "./pages/MissingExperiment";
import Limits from "./pages/Limits";
import { dataset } from "./lib/data";
import { SCENES, photoUrl, sceneFor } from "./lib/scenes";

/** URLs are unchanged; deep links keep working. Sentence case everywhere. */
const NAV = [
  ["/atlas", "Atlas"],
  ["/ask", "Ask"],
  ["/mission-lab", "Mission lab"],
  ["/referee", "Referee"],
  ["/missing-experiment", "Missing experiment"],
  ["/limits", "Limits"],
] as const;

export default function App() {
  return (
    <ScenarioProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-[6px] bg-[var(--text)] px-3 py-2 text-[var(--bg)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <Header />
      <main id="main" tabIndex={-1} className="relative outline-none">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route element={<PageLayout />}>
            <Route path="/atlas" element={<Atlas />} />
            <Route path="/investigation/:psiId" element={<Investigation />} />
            <Route path="/ask" element={<Ask />} />
            <Route path="/mission-lab" element={<MissionLab />} />
            <Route path="/referee" element={<Referee />} />
            <Route path="/missing-experiment" element={<MissingExperiment />} />
            <Route path="/limits" element={<Limits />} />
          </Route>
        </Routes>
      </main>
      <Footer />
    </ScenarioProvider>
  );
}

/** New page, top of page (in-page #hash links keep their own scroll). */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash]);
  return null;
}

/** Every product page sits over a faint photo of the active environment, which changes with it. */
function PageLayout() {
  const { pathname } = useLocation();
  const { scenario } = useScenario();
  const scene = sceneFor(scenario);
  return (
    <div className="relative isolate">
      <SceneBackdrop scene={scene} variant="page" />
      <div key={pathname} className="page route-enter relative z-10">
        <Outlet />
      </div>
    </div>
  );
}

function Header() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const navPanelRef = useRef<HTMLElement>(null);
  const onHome = pathname === "/";

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape closes the menu; Tab stays inside it while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
        return;
      }
      if (e.key === "Tab" && navPanelRef.current) {
        const focusable = navPanelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const solid = scrolled || open || !onHome;
  const heroAccent = sceneFor(useScenario().scenario).heroAccent;

  return (
    <header
      className={`sticky top-0 z-30 h-16 border-b transition-[background-color,border-color] duration-300 ${
        solid
          ? "border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur-xl"
          : "header-over-hero border-transparent"
      }`}
      style={solid ? undefined : { ["--hero-accent" as string]: heroAccent }}
    >
      <div className="content-container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2.5 rounded-[4px] text-[var(--text)]">
          <FlameMark size={16} />
          <span className="text-[1.2rem] font-semibold tracking-tight">FlameAtlas</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-x-7 lg:flex">
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} className="nav-link">
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ScenarioPicker />
          <ThemeSwitch />
          <button
            ref={button}
            type="button"
            className="btn btn-secondary btn-sm btn-icon lg:hidden"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            <svg aria-hidden="true" width="16" height="12" viewBox="0 0 16 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {open ? <path d="M2 1l12 10M14 1L2 11" /> : <path d="M1 1h14M1 6h14M1 11h14" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          ref={navPanelRef}
          aria-label="Main"
          className="route-enter absolute inset-x-0 top-full border-b border-[var(--border)] bg-[var(--bg-elev)] shadow-[var(--shadow-lift)] lg:hidden"
        >
          <ul className="content-container py-2">
            {NAV.map(([to, label]) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center justify-between border-b border-[var(--border)] py-3.5 text-base last:border-0 ${
                      isActive ? "font-medium text-[var(--text)]" : "text-[var(--text-muted)]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {label}
                      {isActive && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  const { scenario } = useScenario();
  const photos = Object.values(SCENES);

  return (
    <footer className="relative z-10 border-t border-[var(--border)] bg-[var(--bg-elev)]">
      <div className="content-container grid gap-10 py-14 text-sm text-[var(--text-muted)] md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.5fr)_minmax(0,1.4fr)]">
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--text)]">
            <FlameMark size={14} /> FlameAtlas
          </p>
          <p>
            Data version <span className="font-mono text-[var(--text)]">{dataset.version}</span>
            {dataset.fixture ? " (fixture: fake values, not NASA data)" : ""}
          </p>
          <p className="measure">
            Verdicts rate the strength of evidence in our curated dataset. They are never a safety rating. Proposals are
            illustrative, not an approved NASA protocol.
          </p>
          <p className="text-xs text-[var(--text-faint)]">NASA Space Apps Challenge 2026, "Flame in Freefall".</p>
        </div>

        <nav aria-label="Footer">
          <h2 className="eyebrow">Explore</h2>
          <ul className="mt-3 space-y-2">
            {NAV.map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="link">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="eyebrow">Scene photos</h2>
          <p className="mt-3">
            Public-domain NASA photographs. They set the scene for each environment and are not evidence.
          </p>
          <ul className="mt-3 space-y-2 text-xs">
            {photos.map((s) => (
              <li
                key={s.id}
                className={`grid gap-x-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] ${s.id === sceneFor(scenario).id ? "text-[var(--text)]" : ""}`}
              >
                <span className="text-[var(--text-faint)]">{s.pickerLabel ?? s.label}</span>
                <span>
                  <a className="link" href={photoUrl(s.photo)} target="_blank" rel="noreferrer">
                    {s.photo.caption}
                  </a>
                  <span className="font-mono text-[var(--text-faint)]"> · {s.photo.nasaId}</span>
                  {s.photo.note && <span className="block text-[var(--text-faint)]">{s.photo.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

