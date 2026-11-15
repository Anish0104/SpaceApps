import { useState } from "react";
import { StoreProvider } from "./store";
import { Launch } from "./components/Launch";
import { Dock, type Tab } from "./components/Dock";
import { FlightView } from "./components/FlightView";
import { Brief } from "./screens/Brief";
import { Lab } from "./screens/Lab";
import { Atlas } from "./screens/Atlas";
import { Ask } from "./screens/Ask";
import { Settings } from "./screens/Settings";
import { useOffline } from "./useOffline";

function Shell() {
  const [tab, setTab] = useState<Tab>("home");
  const [flight, setFlight] = useState(false);
  const offline = useOffline();

  return (
    <div className="app">
      <main className="scroll" key={tab}>
        <div className="fade">
          {offline && <div className="banner">Offline — the archive, Lab and saved records still work</div>}
          {tab === "home" && <Brief onOpenLab={() => setTab("lab")} onFlight={() => setFlight(true)} />}
          {tab === "atlas" && <Atlas />}
          {tab === "lab" && <Lab />}
          {tab === "ask" && <Ask />}
          {tab === "settings" && <Settings onOpenAtlas={() => setTab("atlas")} />}
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
