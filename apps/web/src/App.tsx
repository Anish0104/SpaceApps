import { useEffect, useRef, useState, type ComponentType } from "react";
import { Link, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { ScenarioProvider, useScenario } from "./lib/scenario";
import { ScenarioPicker } from "./components/ScenarioPicker";
import { FlameMark } from "./components/FlameMark";
import { ThemeSwitch } from "./components/ThemeSwitch";
import { PhotoCredit, SceneBackdrop } from "./components/SceneBackdrop";
import { IconArrowRight, IconAsk, IconAtlas, IconExperiment, IconHome, IconLab, IconLimits, IconOverview, IconReferee } from "./components/Icons";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Atlas from "./pages/Atlas";
import Investigation from "./pages/Investigation";
import Ask from "./pages/Ask";
import MissionLab from "./pages/MissionLab";
import Referee from "./pages/Referee";
import MissingExperiment from "./pages/MissingExperiment";
import Limits from "./pages/Limits";
import { dataset } from "./lib/data";
import { SCENES, photoUrl, sceneFor } from "./lib/scenes";
import { JOURNEY, journeyUrl } from "./lib/journey";

/**
 * Two layouts. "/" is the landing page. Everything else is the dashboard: a sidebar, a top bar with the
 * crew-environment picker, and the tools. Tool URLs are unchanged, so deep links keep working.
 */
export const DASHBOARD_NAV: { to: string; label: string; icon: ComponentType<{ size?: number }>; end?: boolean }[] = [
  { to: "/dashboard", label: "Overview", icon: IconOverview, end: true },
  { to: "/ask", label: "Ask", icon: IconAsk },
  { to: "/atlas", label: "Atlas", icon: IconAtlas },
  { to: "/mission-lab", label: "Mission lab", icon: IconLab },
  { to: "/referee", label: "Referee", icon: IconReferee },
  { to: "/missing-experiment", label: "Missing experiment", icon: IconExperiment },
  { to: "/limits", label: "Limits", icon: IconLimits },
];

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
      <Routes>
        <Route element={<LandingLayout />}>
          <Route path="/" element={<Home />} />
        </Route>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/atlas" element={<Atlas />} />
          <Route path="/investigation/:psiId" element={<Investigation />} />
          <Route path="/ask" element={<Ask />} />
          <Route path="/mission-lab" element={<MissionLab />} />
          <Route path="/referee" element={<Referee />} />
          <Route path="/missing-experiment" element={<MissingExperiment />} />
          <Route path="/limits" element={<Limits />} />
        </Route>
      </Routes>
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

/* ------------------------------------------------------------------ landing */

function LandingLayout() {
  // Transparent over the starfield at the top (no divider line); frosted once the page scrolls.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <>
      <header className={`landing-header sticky top-0 z-30 h-16 ${scrolled ? "is-scrolled" : ""}`}>
        <div className="content-container flex h-16 items-center justify-between gap-3">
          <Brand compact />
          <nav aria-label="Landing" className="hidden items-center gap-7 md:flex">
            <a href="#inside" className="nav-link">What's inside</a>
            <a href="#how" className="nav-link">How it works</a>
            <a href="#flame" className="nav-link">The science</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeSwitch />
            <Link to="/dashboard" className="btn btn-primary btn-sm whitespace-nowrap" aria-label="Open dashboard">
              <span className="sm:hidden">Dashboard</span>
              <span className="hidden sm:inline">Open dashboard</span>
              <IconArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="relative outline-none">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5 rounded-[4px] text-[var(--text)]">
      <FlameMark size={16} />
      <span className={`text-[1.2rem] font-semibold tracking-tight ${compact ? "max-[359px]:sr-only" : ""}`}>FlameAtlas</span>
    </Link>
  );
}

/* ---------------------------------------------------------------- dashboard */

function DashboardLayout() {
  const { pathname } = useLocation();
  const { scenario } = useScenario();
  const scene = sceneFor(scenario);
  return (
    <div className="dash">
      <SceneBackdrop scene={scene} variant="page" />
      <aside className="dash-sidebar" aria-label="Dashboard">
        <div className="flex h-16 items-center px-6">
          <Brand />
        </div>
        <SideNav />
        <div className="mt-auto space-y-2 border-t border-[var(--glass-line)] px-6 py-4 text-xs text-[var(--text-muted)]">
          <p>
            Data <span className="font-mono text-[var(--text)]">{dataset.version}</span>
            {dataset.fixture ? " (fixture: fake values, not NASA data)" : ""}
          </p>
          <Link to="/" className="inline-flex items-center gap-1.5 hover:text-[var(--text)]">
            <IconHome size={14} /> Back to home
          </Link>
        </div>
      </aside>

      <div className="dash-main">
        <DashTopBar />
        <main id="main" tabIndex={-1} className="relative outline-none">
          <div key={pathname} className="page route-enter relative z-10">
            <Outlet />
          </div>
        </main>
        <footer className="relative z-10 border-t border-[var(--border)]">
          <div className="dash-footer-inner flex flex-col gap-2 py-4 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
            <p>Verdicts rate the strength of evidence in our curated dataset, never safety. Proposals are illustrative, not an approved NASA protocol.</p>
            <PhotoCredit scene={scene} className="shrink-0 text-[var(--text-muted)]" />
          </div>
        </footer>
      </div>
    </div>
  );
}

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="px-3 py-2">
      <ul className="space-y-0.5">
        {DASHBOARD_NAV.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} onClick={onNavigate} className="side-link">
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function DashTopBar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const current = DASHBOARD_NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)));
  const title = current?.label ?? (pathname.startsWith("/investigation") ? "Investigation" : "Dashboard");

  useEffect(() => setOpen(false), [pathname]);

  // Escape closes the menu; Tab stays inside it while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
        return;
      }
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
        if (!f.length) return;
        const first = f[0]!;
        const last = f[f.length - 1]!;
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

  return (
    <header className="dash-topbar">
      <div className="dash-topbar-inner flex h-14 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
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
          <span className="lg:hidden">
            <Brand compact />
          </span>
          <p className="hidden truncate text-sm text-[var(--text-muted)] lg:block">
            Dashboard <span aria-hidden="true">/</span> <span className="text-[var(--text)]">{title}</span>
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <ScenarioPicker />
          <ThemeSwitch />
        </div>
      </div>

      {open && (
        <div
          id="mobile-nav"
          ref={panel}
          className="route-enter absolute inset-x-0 top-full mt-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] py-2 shadow-[var(--shadow-lift)] lg:hidden"
        >
          <SideNav onNavigate={() => setOpen(false)} />
          <Link to="/" className="mx-6 mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
            <IconHome size={14} /> Back to home
          </Link>
        </div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------- footer */

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
          <h2 className="eyebrow">Dashboard</h2>
          <ul className="mt-3 space-y-2">
            {DASHBOARD_NAV.map(({ to, label }) => (
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
          <p className="mt-3">Public-domain NASA photographs. They set the scene for each environment and are not evidence.</p>
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
          <h2 className="eyebrow mt-6">Spacecraft window views</h2>
          <ul className="mt-3 space-y-2 text-xs">
            {JOURNEY.filter((f) => f.src.startsWith("/journey/")).map((f) => (
              <li key={f.key} className="grid gap-x-3 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
                <span className="text-[var(--text-faint)]">{f.stage}</span>
                <span>
                  <a className="link" href={journeyUrl(f)} target="_blank" rel="noreferrer">
                    {f.caption}
                  </a>
                  <span className="font-mono text-[var(--text-faint)]"> · {f.nasaId}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
