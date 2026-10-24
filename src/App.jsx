import React, { useEffect, useRef, useState } from "react";
import { Calculator, Crosshair, Zap } from "lucide-react";
import PointsCalculator from "./PointsCalculator.jsx";
import ZonePlanner from "./ZonePlanner.jsx";

const tabs = [
  { id: "points", label: "Points calculator", icon: Calculator },
  { id: "zones", label: "Zone predictor", icon: Crosshair },
];
const tabFromHash = () =>
  ["#zones", "#planner"].includes(window.location.hash) ? "zones" : "points";

export default function App() {
  const [activeTab, setActiveTab] = useState(tabFromHash);
  const [visitedZones, setVisitedZones] = useState(
    () => tabFromHash() === "zones",
  );
  const tabRefs = useRef({});

  function selectTab(id) {
    if (id === "zones") setVisitedZones(true);
    setActiveTab(id);
    if (window.location.hash !== `#${id}`)
      window.history.pushState(null, "", `#${id}`);
  }
  useEffect(() => {
    function syncTab() {
      const id = tabFromHash();
      if (id === "zones") setVisitedZones(true);
      setActiveTab(id);
    }
    window.addEventListener("hashchange", syncTab);
    window.addEventListener("popstate", syncTab);
    return () => {
      window.removeEventListener("hashchange", syncTab);
      window.removeEventListener("popstate", syncTab);
    };
  }, []);
  useEffect(() => {
    document.title = `${activeTab === "points" ? "Points Calculator" : "Zone Predictor"} · CompIQ`;
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
          <a className="brand" href="#points" aria-label="CompIQ home">
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
        </div>
      </header>
      <main id="main-content">
        <section
          id="panel-points"
          role="tabpanel"
          aria-labelledby="tab-points"
          hidden={activeTab !== "points"}
        >
          <PointsCalculator />
        </section>
        <section
          id="panel-zones"
          role="tabpanel"
          aria-labelledby="tab-zones"
          hidden={activeTab !== "zones"}
        >
          {visitedZones && <ZonePlanner active={activeTab === "zones"} />}
        </section>
      </main>
      <footer>
        <div className="footer-inner">
          <a
            className="brand footer-brand"
            href="#points"
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
    </>
  );
}
