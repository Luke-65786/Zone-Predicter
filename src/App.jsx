import React, { useCallback, useEffect, useRef, useState } from "react";
import { House, Settings2, Zap } from "lucide-react";
import HomePage from "./HomePage.jsx";
import PointsCalculator from "./PointsCalculator.jsx";
import ZonePlanner from "./ZonePlanner.jsx";
import SettingsPanel from "./SettingsPanel.jsx";
import useAppearance from "./useAppearance.js";
import { TOOLS } from "./tool-catalog.js";
import TournamentTracker from "./TournamentTracker.jsx";
import ScoringCalculator from "./ScoringCalculator.jsx";
import TournamentPlanner from "./TournamentPlanner.jsx";
import PracticeChecklist from "./PracticeChecklist.jsx";
import useSavedState from "./useSavedState.js";
import { normalizePlans } from "./competition.js";

const tabs = [
  { id: "home", label: "Home", icon: House },
  ...TOOLS.map((tool) => ({ ...tool, label: tool.name })),
];
const tabFromHash = (startPage = "home") => {
  if (["#zones", "#planner"].includes(window.location.hash)) return "zones";
  const id = window.location.hash.slice(1);
  if (TOOLS.some((tool) => tool.id === id)) return id;
  if (!window.location.hash) return startPage;
  return "home";
};

export default function App() {
  const appearance = useAppearance();
  const [activeTab, setActiveTab] = useState(() =>
    tabFromHash(appearance.settings.startPage),
  );
  const [visited, setVisited] = useState(
    () => new Set([tabFromHash(appearance.settings.startPage)]),
  );
  const plansStore = useSavedState(
    "compiq-plans-v1",
    { plans: [], activeId: null },
    normalizePlans,
  );
  const tabRefs = useRef({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  useEffect(() => {
    setSettingsOpen(false);
    window.scrollTo(0, 0);
    const tab = tabRefs.current[activeTab];
    const nav = tab?.parentElement;
    if (tab && nav) {
      if (tab.offsetLeft < nav.scrollLeft) nav.scrollLeft = tab.offsetLeft;
      else if (
        tab.offsetLeft + tab.offsetWidth >
        nav.scrollLeft + nav.clientWidth
      )
        nav.scrollLeft = tab.offsetLeft + tab.offsetWidth - nav.clientWidth;
    }
  }, [activeTab]);

  function selectTab(id) {
    setVisited((previous) => new Set([...previous, id]));
    setActiveTab(id);
    if (window.location.hash !== `#${id}`)
      window.history.pushState(null, "", `#${id}`);
  }
  useEffect(() => {
    function syncTab() {
      const id = tabFromHash(appearance.settings.startPage);
      setVisited((previous) => new Set([...previous, id]));
      setActiveTab(id);
    }
    window.addEventListener("hashchange", syncTab);
    window.addEventListener("popstate", syncTab);
    return () => {
      window.removeEventListener("hashchange", syncTab);
      window.removeEventListener("popstate", syncTab);
    };
  }, [appearance.settings.startPage]);
  useEffect(() => {
    document.title =
      activeTab === "home"
        ? "CompIQ · Fortnite Competitive Toolkit"
        : `${TOOLS.find((tool) => tool.id === activeTab)?.name.replace(/\b\w/g, (letter) => letter.toUpperCase())} · CompIQ`;
  }, [activeTab]);

  function onTabKey(event, index) {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    selectTab(tabs[next].id);
    tabRefs.current[tabs[next].id]?.focus();
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner competitive-header">
          <a className="brand" href="#home" aria-label="CompIQ home">
            <span className="brand-mark">
              <Zap size={24} fill="currentColor" strokeWidth={1.5} />
            </span>
            Comp<span className="brand-iq">IQ</span>
            <span className="brand-beta">FN COMPETITIVE</span>
          </a>
          <nav
            className="tool-tabs"
            role="tablist"
            aria-label="Competitive tools"
          >
            {tabs.map(({ id, label, icon: Icon }, index) => (
              <button
                key={id}
                ref={(node) => {
                  tabRefs.current[id] = node;
                }}
                id={`tab-${id}`}
                className={`tool-tab ${activeTab === id ? "tab-active" : ""}`}
                role="tab"
                aria-selected={activeTab === id}
                aria-controls={`panel-${id}`}
                tabIndex={activeTab === id ? 0 : -1}
                onClick={() => selectTab(id)}
                onKeyDown={(event) => onTabKey(event, index)}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
          <div className="header-right">
            <span className="fan-label">
              <span />
              Every point. Every rotation.
            </span>
          </div>
          <button
            className="settings-trigger"
            aria-label="Open settings"
            title="Customize your workspace"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 size={17} />
            <span>Settings</span>
          </button>
        </div>
      </header>
      <main id="main-content">
        <section
          id="panel-home"
          role="tabpanel"
          aria-labelledby="tab-home"
          hidden={activeTab !== "home"}
        >
          <HomePage onOpenSettings={() => setSettingsOpen(true)} />
        </section>
        <section
          id="panel-points"
          role="tabpanel"
          aria-labelledby="tab-points"
          hidden={activeTab !== "points"}
        >
          {visited.has("points") && <PointsCalculator />}
        </section>
        <section
          id="panel-zones"
          role="tabpanel"
          aria-labelledby="tab-zones"
          hidden={activeTab !== "zones"}
        >
          {visited.has("zones") && (
            <ZonePlanner active={activeTab === "zones"} />
          )}
        </section>
        {[
          ["tracker", <TournamentTracker plans={plansStore.value.plans} />],
          ["scoring", <ScoringCalculator />],
          ["plans", <TournamentPlanner store={plansStore} />],
          ["practice", <PracticeChecklist />],
        ].map(([id, content]) => (
          <section
            key={id}
            id={`panel-${id}`}
            role="tabpanel"
            aria-labelledby={`tab-${id}`}
            hidden={activeTab !== id}
          >
            {visited.has(id) && content}
          </section>
        ))}
      </main>
      <footer>
        <div className="footer-inner">
          <a
            className="brand footer-brand"
            href="#home"
            aria-label="CompIQ home"
          >
            <span className="brand-mark">
              <Zap size={17} fill="currentColor" strokeWidth={1.5} />
            </span>
            Comp<span className="brand-iq">IQ</span>
          </a>
          <p>
            Independent Fortnite competitive tools. Not affiliated with Epic
            Games.
          </p>
          <span className="footer-motto">One toolkit. More game sense.</span>
        </div>
      </footer>
      {settingsOpen && (
        <SettingsPanel
          settings={appearance.settings}
          update={appearance.update}
          reset={appearance.reset}
          saved={appearance.saved}
          onClose={closeSettings}
        />
      )}
    </>
  );
}
