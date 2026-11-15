import { useState } from "react";
import { StoreProvider } from "./store";
import { Hero } from "./components/Hero";
import { TabBar, type Tab } from "./components/TabBar";
import { Brief } from "./screens/Brief";
import { Lab } from "./screens/Lab";
import { Atlas } from "./screens/Atlas";
import { Ask, type ChatMsg } from "./screens/Ask";
import { Settings } from "./screens/Settings";
import { useOffline } from "./useOffline";

function Shell() {
  const [tab, setTab] = useState<Tab>("home");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const offline = useOffline();

  return (
    <div className="app">
      <main className="scroll" key={tab}>
        {offline && <div className="banner">Offline — the archive, Lab and saved records still work</div>}
        {tab === "home" && <Brief onOpenLab={() => setTab("lab")} />}
        {tab === "atlas" && <Atlas />}
        {tab === "lab" && <Lab />}
        {tab === "ask" && <Ask chat={chat} setChat={setChat} draft={draft} setDraft={setDraft} />}
        {tab === "settings" && <Settings onOpenAtlas={() => setTab("atlas")} />}
      </main>
      <TabBar tab={tab} onTab={setTab} />
    </div>
  );
}

export function App() {
  const [entered, setEntered] = useState(false);
  return (
    <StoreProvider>
      {entered ? <Shell /> : <Hero onEnter={() => setEntered(true)} />}
    </StoreProvider>
  );
}
