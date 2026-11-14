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
  ["/atlas", "Research Atlas"],
  ["/ask", "Ask"],
  ["/mission-lab", "Mission Lab"],
  ["/referee", "Referee"],
  ["/missing-experiment", "Missing Experiment"],
  ["/limits", "Limits"],
] as const;

export default function App() {
  return (
    <ScenarioProvider>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <span className="font-display text-lg font-bold">FlameAtlas</span>
          <nav className="flex flex-wrap gap-3 text-sm">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === "/"}
                className={({ isActive }) => (isActive ? "font-bold text-measured" : "text-ink/70 hover:text-ink")}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <ScenarioPicker />
            <span className="rounded border border-line px-2 py-0.5 font-mono text-xs">
              data {dataset.version}{dataset.fixture ? " · FIXTURE" : ""}
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
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
