import { NavLink, Route, Routes } from "react-router-dom";
import { ScenarioProvider } from "./lib/scenario";
import { ScenarioPicker } from "./components/ScenarioPicker";
import Home from "./pages/Home";
import Atlas from "./pages/Atlas";
import Investigation from "./pages/Investigation";
import Ask from "./pages/Ask";
import MissionLab from "./pages/MissionLab";
import Referee from "./pages/Referee";
import MissingExperiment from "./pages/MissingExperiment";
import Limits from "./pages/Limits";
import { dataset } from "./lib/data";

const NAV = [
  ["/", "Home"],
  ["/atlas", "Research atlas"],
  ["/ask", "Ask"],
  ["/mission-lab", "Mission lab"],
  ["/referee", "Referee"],
  ["/missing-experiment", "Missing experiment"],
  ["/limits", "Limits"],
] as const;

const NAV_LINK = "border-b-2 py-2";

export default function App() {
  return (
    <ScenarioProvider>
      <header className="border-b border-rule bg-panel">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pt-3">
            <span className="display text-lg">FlameAtlas</span>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <ScenarioPicker />
              <span className="text-sm text-ink/70">Data version {dataset.version}{dataset.fixture ? " (fixture)" : ""}</span>
            </div>
          </div>
          <nav aria-label="Main" className="mt-1 flex flex-wrap gap-x-5">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === "/"}
                className={({ isActive }) => (isActive ? `${NAV_LINK} border-ch-blue font-semibold` : `${NAV_LINK} border-transparent text-ink/70 hover:text-ink`)}>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/atlas" element={<Atlas />} />
          <Route path="/investigation/:psiId" element={<Investigation />} />
          <Route path="/ask" element={<Ask />} />
          <Route path="/mission-lab" element={<MissionLab />} />
          <Route path="/referee" element={<Referee />} />
          <Route path="/missing-experiment" element={<MissingExperiment />} />
          <Route path="/limits" element={<Limits />} />
        </Routes>
      </main>
    </ScenarioProvider>
  );
}
