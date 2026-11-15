import { useState } from "react";
import { StoreProvider } from "./store";
import { coverage } from "./data";
import { Launch } from "./components/Launch";
import { Dock, type Tab } from "./components/Dock";
import { Brief } from "./screens/Brief";
import { Lab } from "./screens/Lab";
import { Atlas } from "./screens/Atlas";
import { Ask } from "./screens/Ask";
import { Saved } from "./screens/Saved";
import { useOffline } from "./useOffline";

function Shell() {
  const [tab, setTab] = useState<Tab>("brief");
  const offline = useOffline();

  return (
    <div className="app">
      <header className="head">
        {offline && <div className="banner">Offline — the archive, Lab and saved records still work</div>}
        <div className="head-in">
          <img className="mark" src="/icon.svg" alt="" aria-hidden="true" />
          <div className="wordmark">Flame<b>Atlas</b></div>
          <div className="chip-ver mono">data {coverage.version}</div>
        </div>
      </header>

      <main className="scroll" key={tab}>
        <div className="fade">
          {tab === "brief" && <Brief onOpenLab={() => setTab("lab")} onOpenAsk={() => setTab("ask")} />}
          {tab === "atlas" && <Atlas onOpenAsk={() => setTab("ask")} />}
          {tab === "lab" && <Lab onOpenAsk={() => setTab("ask")} />}
          {tab === "ask" && <Ask />}
          {tab === "saved" && <Saved onOpenAtlas={() => setTab("atlas")} />}
        </div>
      </main>

      <Dock tab={tab} onTab={setTab} />
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
