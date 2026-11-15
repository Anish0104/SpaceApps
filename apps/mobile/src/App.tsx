import { useState } from "react";
import { StoreProvider } from "./store";
import { Launch } from "./components/Launch";
import { TopBar } from "./components/TopBar";
import { Dock, type Tab } from "./components/Dock";
import { FlightView } from "./components/FlightView";
import { Brief } from "./screens/Brief";
import { Lab } from "./screens/Lab";
import { Atlas } from "./screens/Atlas";
import { Ask } from "./screens/Ask";
import { Saved } from "./screens/Saved";
import { useOffline } from "./useOffline";

function Shell() {
  const [tab, setTab] = useState<Tab>("brief");
  const [flight, setFlight] = useState(false);
  const offline = useOffline();

  return (
    <div className="app">
      <TopBar />
      <main className="scroll" key={tab}>
        <div className="fade">
          {offline && <div className="banner">Offline — the archive, Lab and saved records still work</div>}
          {tab === "brief" && <Brief onOpenLab={() => setTab("lab")} onFlight={() => setFlight(true)} />}
          {tab === "atlas" && <Atlas />}
          {tab === "lab" && <Lab />}
          {tab === "ask" && <Ask />}
          {tab === "saved" && <Saved onOpenAtlas={() => setTab("atlas")} />}
        </div>
      </main>
      <Dock tab={tab} onTab={setTab} />
      {flight && <FlightView onExit={() => setFlight(false)} onOpenLab={() => setTab("lab")} />}
    </div>
  );
}

export function App() {
  const [launched, setLaunched] = useState(false);
  return (
    <StoreProvider>
      {!launched && <Launch onEnter={() => setLaunched(true)} />}
      <Shell />
    </StoreProvider>
  );
}
