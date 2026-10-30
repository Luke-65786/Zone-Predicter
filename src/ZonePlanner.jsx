import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Crosshair,
  Expand,
  Flag,
  Info,
  Layers2,
  LockKeyhole,
  Users,
  LocateFixed,
  Map,
  MapPin,
  MousePointer2,
  MoveUpRight,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import ZoneSides from "./ZoneSides.jsx";
import useCurrentMap from "./useCurrentMap.js";
import { DEFAULT_MAP_ID, normalizeMapId, getMap } from "./map-source.js";
import { MAP_POIS, NIGHTMARE_POIS } from "./map-pois.js";
import MapSelector from "./MapSelector.jsx";
import useSavedState from "./useSavedState.js";
import {
  DEFAULT_SETUP,
  MAP_SIZE,
  clamp,
  fitZone1,
  ZONE1_RADIUS,
  ZONE_RADIUS_RATIO,
  estimateZoneSides,
  planRotation,
  restoreSetup,
  forecastZone4,
} from "./geometry.js";

const STORAGE_KEY = "zoneiq-setup-v2";
function initialSetup(storageKey = STORAGE_KEY) {
  try {
    return (
      restoreSetup(localStorage.getItem(storageKey)) ||
      structuredClone(DEFAULT_SETUP)
    );
  } catch {
    return structuredClone(DEFAULT_SETUP);
  }
}

function ZonePlanner({ active = true }) {
  const selected = useSavedState(
    "compiq-zone-map-v1",
    DEFAULT_MAP_ID,
    normalizeMapId,
  );
  return (
    <ZonePlannerMap
      key={selected.value}
      active={active}
      mapId={selected.value}
      onMapChange={selected.setValue}
    />
  );
}
function ZonePlannerMap({ active, mapId, onMapChange }) {
  const storageKey =
    mapId === DEFAULT_MAP_ID ? STORAGE_KEY : `${STORAGE_KEY}-${mapId}`;
  const pois = mapId === "nightmare-reload" ? NIGHTMARE_POIS : MAP_POIS;
  const selectedMap = getMap(mapId);
  const [setup, setSetup] = useState(() => initialSetup(storageKey));
  const [forecast, setForecast] = useState(null);
  const [tool, setTool] = useState("circle");
  const [showHeat, setShowHeat] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [showSides, setShowSides] = useState(false);
  const map = useCurrentMap(mapId);
  const mapImage = map.url;
  const mapName =
    map.status === "ready"
      ? mapId === DEFAULT_MAP_ID
        ? "Your Fortnite map"
        : selectedMap.name
      : map.status === "loading"
        ? "Loading your map…"
        : "Map unavailable";
  const [showSteps, setShowSteps] = useState(true);
  const [help, setHelp] = useState(false);
  const [toast, setToast] = useState("");
  const [runCount, setRunCount] = useState(1);
  const [storageWarning, setStorageWarning] = useState(false);
  const svgRef = useRef(null);
  const mapRef = useRef(null);
  const dragging = useRef(false);
  const scenario = forecast?.path[3];
  const rotation = scenario ? planRotation(setup.player, scenario) : null;
  const zoneSides = forecast ? estimateZoneSides(scenario, pois) : null;

  useEffect(() => {
    if (!active) {
      setHelp(false);
      setToast("");
    }
  }, [active]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(setup));
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }, [setup, storageKey]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!help) return;
    const previous = document.activeElement;
    const dialog = document.getElementById("help-dialog");
    const focusable = () => [
      ...dialog.querySelectorAll('button, a[href], [tabindex="0"]'),
    ];
    focusable()[0]?.focus();
    function keydown(event) {
      if (event.key === "Escape") setHelp(false);
      if (event.key === "Tab") {
        const nodes = focusable();
        if (event.shiftKey && document.activeElement === nodes[0]) {
          event.preventDefault();
          nodes.at(-1).focus();
        } else if (!event.shiftKey && document.activeElement === nodes.at(-1)) {
          event.preventDefault();
          nodes[0].focus();
        }
      }
    }
    document.addEventListener("keydown", keydown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [help]);

  function changeSetup(patch) {
    const next = {
      ...setup,
      ...patch,
      circle: fitZone1(patch.circle || setup.circle),
      ratio: ZONE_RADIUS_RATIO,
    };
    setSetup(next);
    if (patch.circle || patch.ratio) {
      setForecast(null);
      setRunCount(1);
    }
  }
  function generate() {
    if (!setup.hasZone1 || map.status !== "ready") return;
    setForecast(forecastZone4(fitZone1(setup.circle), ZONE_RADIUS_RATIO));
    setRunCount((value) => value + 1);
  }
  function updatePosition(x, y) {
    if (tool === "circle")
      changeSetup({
        circle: fitZone1({ ...setup.circle, x, y }),
        hasZone1: true,
      });
    else
      changeSetup({
        player: { x: clamp(x, 0, MAP_SIZE), y: clamp(y, 0, MAP_SIZE) },
      });
  }
  function positionFromEvent(event) {
    const point = svgRef.current.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const position = point.matrixTransform(
      svgRef.current.getScreenCTM().inverse(),
    );
    updatePosition(position.x, position.y);
  }
  function handleMapKey(event) {
    const directions = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (!directions[event.key] || map.status !== "ready") return;
    event.preventDefault();
    const active = tool === "circle" ? setup.circle : setup.player;
    const step = event.shiftKey ? 25 : 5;
    updatePosition(
      active.x + directions[event.key][0] * step,
      active.y + directions[event.key][1] * step,
    );
  }
  function reset() {
    setSetup(structuredClone(DEFAULT_SETUP));
    setForecast(null);
    setRunCount(1);
    setTool("circle");
    setShowHeat(true);
    setShowRoute(true);
    setShowSteps(true);
    setShowSides(false);
    setToast("Zone 1 cleared. Click the map to start a new estimate.");
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (mapRef.current.requestFullscreen)
        await mapRef.current.requestFullscreen();
      else setToast("Fullscreen is not available in this browser.");
    } catch {
      setToast("Fullscreen is not available in this browser.");
    }
  }
  function exportPlan() {
    const svg = svgRef.current.cloneNode(true);
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", "1000");
    svg.setAttribute("height", "1000");
    const finish = () => {
      const title = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      title.setAttribute("x", "24");
      title.setAttribute("y", "976");
      title.setAttribute("font-size", "17");
      title.setAttribute("fill", "#fff");
      title.setAttribute("font-family", "Arial, sans-serif");
      title.textContent =
        "CompIQ · Zone 1 → Zone 4 · Geometric simulation, not a live prediction";
      svg.appendChild(title);
      if (showSides && zoneSides?.status === "ready") {
        const legend = title.cloneNode(true);
        legend.setAttribute("y", "951");
        legend.setAttribute("font-size", "14");
        legend.textContent = `Green: estimated deadside (${zoneSides.deadsideCount} POIs) · Red: estimated congestion (${zoneSides.congestedCount} POIs) · No live player data`;
        svg.appendChild(legend);
      }
      const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
        type: "image/svg+xml",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "compiq-zone-plan.svg";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setToast("Plan exported as an SVG image");
    };
    if (mapImage) {
      fetch(mapImage)
        .then((response) => response.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            svg
              .querySelector("[data-map-image]")
              .setAttribute("href", reader.result);
            finish();
          };
          reader.onerror = () =>
            setToast("Could not export the map image. Try again.");
          reader.readAsDataURL(blob);
        })
        .catch(() => setToast("Could not export the map image. Try again."));
    } else finish();
  }

  return (
    <>
      <section
        id="planner"
        className="page-shell zone-page"
        aria-label="Zone predictor tool"
      >
        <section className="intro">
          <div>
            <div className="eyebrow">
              <span />
              THE STORM DOESN’T WAIT. PLAN AHEAD.
            </div>
            <h1>
              Zone 1 in. <span>Zone 4 outlook.</span>
            </h1>
            <p>
              Mark the first circle on your selected map. Explore where zone 4
              could land.
            </p>
          </div>
          <button
            className="button button-white intro-help"
            onClick={() => setHelp(true)}
          >
            <CircleHelp size={16} /> Quick guide <ArrowUpRight size={15} />
          </button>
        </section>

        <div className="workspace">
          <aside className="controls">
            <section className="card setup-card">
              <div className="card-heading">
                <div className="heading-icon">
                  <Settings2 size={18} />
                </div>
                <h2>Set your first circle</h2>
                <span className="step-label">01 — 03</span>
              </div>
              <div className="control-section">
                <MapSelector value={mapId} onChange={onMapChange} />
                <div className="field-heading">
                  <span>Your map</span>
                  <span className="tiny-tag">AUTO-LOADED</span>
                </div>
                <div className="map-select">
                  <span className="map-thumbnail">
                    <Map size={21} />
                  </span>
                  <div>
                    <strong>{mapName}</strong>
                    <span>
                      {map.status === "ready"
                        ? "Your selected image · no API"
                        : map.status === "loading"
                          ? "Opening the selected image…"
                          : "Check your connection and retry"}
                    </span>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Reload map image"
                    disabled={map.status === "loading"}
                    onClick={map.refresh}
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
                <p className="field-note">
                  <span>Your selected map. </span>
                  <a
                    href={
                      selectedMap.source ??
                      import.meta.env.BASE_URL + selectedMap.path
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open original image <ArrowUpRight size={10} />
                  </a>
                </p>
              </div>
              <div className="control-section">
                <div className="field-heading">
                  <label>Prediction path</label>
                  <span className="field-value">Zone 1 → Zone 4</span>
                </div>
                <div
                  className="zone-timeline"
                  aria-label="Simulation path from zone 1 to zone 4"
                >
                  {[1, 2, 3, 4].map((zone) => (
                    <React.Fragment key={zone}>
                      <span
                        className={
                          zone === 1
                            ? "timeline-input"
                            : zone === 4
                              ? "timeline-output"
                              : ""
                        }
                      >
                        <small>
                          {zone === 1
                            ? "YOUR INPUT"
                            : zone === 4
                              ? "ESTIMATE"
                              : "SIMULATED"}
                        </small>
                        <strong>Zone {zone}</strong>
                      </span>
                      {zone < 4 && <ChevronDown size={12} />}
                    </React.Fragment>
                  ))}
                </div>
                <p className="field-note">
                  2,000 paths through zones 2 and 3 to zone 4.
                </p>
              </div>
              <div className="control-section">
                <div className="field-heading">
                  <label>Place on the map</label>
                  <MousePointer2 size={14} className="muted" />
                </div>
                <div className="tool-picker">
                  <button
                    className={tool === "circle" ? "selected" : ""}
                    aria-pressed={tool === "circle"}
                    onClick={() => setTool("circle")}
                  >
                    <Crosshair size={17} /> Zone 1 circle
                  </button>
                  <button
                    className={tool === "player" ? "selected" : ""}
                    aria-pressed={tool === "player"}
                    onClick={() => setTool("player")}
                  >
                    <MapPin size={17} /> Your position
                  </button>
                </div>
                <p className="field-note">
                  Click or drag the map to place{" "}
                  {tool === "circle" ? "zone 1’s center" : "your marker"}.
                </p>
              </div>
              <div className="control-section fixed-setting-section">
                <div className="locked-setting">
                  <div>
                    <span>Zone 1 radius</span>
                    <small>Of map width</small>
                  </div>
                  <strong data-testid="fixed-zone1-radius">
                    {ZONE1_RADIUS / 10}%
                  </strong>
                  <span className="locked-badge">
                    <LockKeyhole size={12} /> Fixed
                  </span>
                </div>
              </div>
              <div className="control-section fixed-setting-section">
                <div className="locked-setting">
                  <div>
                    <span>Shrink per zone</span>
                    <small>Radius retained each zone</small>
                  </div>
                  <strong data-testid="fixed-zone-shrink">
                    {ZONE_RADIUS_RATIO * 100}%
                  </strong>
                  <span className="locked-badge">
                    <LockKeyhole size={12} /> Fixed
                  </span>
                </div>
              </div>
              <div className="control-section zone-filter-section">
                <div className="field-heading">
                  <label>Zone 4 filter</label>
                  <span className="tiny-tag">ESTIMATED</span>
                </div>
                <button
                  className="sides-filter"
                  role="switch"
                  aria-label="Deadside and congestion overlay"
                  aria-checked={showSides}
                  onClick={() => setShowSides((value) => !value)}
                >
                  <Users size={17} />
                  <span>Deadside &amp; congestion</span>
                  <span className="switch-track">
                    <span />
                  </span>
                </button>
                <div className="sides-key">
                  <span>
                    <i className="deadside-dot" /> Green · deadside
                  </span>
                  <span>
                    <i className="congested-dot" /> Red · congested
                  </span>
                </div>
                <p className="field-note">
                  Green faces fewer POIs; red faces more. Counts use{" "}
                  {pois.length} named POIs mapped from your image, not live
                  player locations.
                </p>
              </div>
              <details className="fine-tune">
                <summary>
                  Fine-tune placement <ChevronDown size={14} />
                </summary>
                <div className="position-fields">
                  {["x", "y"].map((axis) => (
                    <label key={axis}>
                      {axis.toUpperCase()} position (%)
                      <input
                        aria-label={`Zone 1 ${axis.toUpperCase()} position percent`}
                        type="number"
                        min={setup.circle.radius / 10}
                        max={100 - setup.circle.radius / 10}
                        value={Math.round(setup.circle[axis] / 10)}
                        onChange={(event) => {
                          if (event.target.value !== "")
                            changeSetup({
                              hasZone1: true,
                              circle: fitZone1({
                                ...setup.circle,
                                [axis]: +event.target.value * 10,
                              }),
                            });
                        }}
                      />
                    </label>
                  ))}
                </div>
                <p className="field-note">
                  Or focus the map and use arrow keys. Hold Shift for larger
                  steps.
                </p>
              </details>
              <div className="generate-area">
                <button
                  className="button button-primary generate-button"
                  disabled={!setup.hasZone1 || map.status !== "ready"}
                  onClick={generate}
                >
                  <Sparkles size={18} /> Estimate zone 4{" "}
                  <ArrowRight size={17} />
                </button>
                <span>
                  {map.status !== "ready"
                    ? "Your map image must load first"
                    : !setup.hasZone1
                      ? "Click the map to place zone 1 first"
                      : "Geometric estimates · not guaranteed game zones"}
                </span>
              </div>
            </section>
            <div className="fair-play">
              <div className="fair-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <strong>A planner. No crystal ball.</strong>
                <p>
                  Zone 1 alone cannot reveal zone 4. The outlook uses the shrink
                  assumption above, not hidden match data.
                </p>
              </div>
            </div>
          </aside>

          <section className="map-column" aria-label="Zone map and results">
            <div className="card map-card" ref={mapRef}>
              <div className="map-header">
                <div>
                  <span className="map-heading-icon">
                    <Map size={17} />
                  </span>
                  <h2>Zone overview</h2>
                  <span className="practice-tag">
                    <span />
                    {map.status === "ready"
                      ? "SELECTED MAP"
                      : map.status === "loading"
                        ? "LOADING MAP"
                        : "MAP OFFLINE"}
                  </span>
                </div>
                <div className="map-actions">
                  <button
                    className="icon-button"
                    title="Reset planner"
                    aria-label="Reset planner"
                    onClick={reset}
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    className="icon-button"
                    title="Export plan"
                    aria-label="Export plan"
                    disabled={!mapImage || !setup.hasZone1}
                    onClick={exportPlan}
                  >
                    <ArrowDownToLine size={16} />
                  </button>
                  <span />
                  <button
                    className="icon-button"
                    title="Fullscreen map"
                    aria-label="Fullscreen map"
                    onClick={fullscreen}
                  >
                    <Expand size={16} />
                  </button>
                </div>
              </div>
              <div
                className={`map-surface ${tool === "circle" ? "circle-tool" : "player-tool"}`}
              >
                <svg
                  ref={svgRef}
                  viewBox="0 0 1000 1000"
                  role="application"
                  aria-label={`Interactive zone map. ${tool === "circle" ? "Zone 1 circle" : "Player position"} selected. Use arrow keys to move, or click and drag.`}
                  tabIndex="0"
                  onKeyDown={handleMapKey}
                  onPointerDown={(event) => {
                    if (event.button !== 0 || map.status !== "ready") return;
                    dragging.current = true;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    positionFromEvent(event);
                  }}
                  onPointerMove={(event) => {
                    if (dragging.current) positionFromEvent(event);
                  }}
                  onPointerUp={() => {
                    dragging.current = false;
                  }}
                  onPointerCancel={() => {
                    dragging.current = false;
                  }}
                >
                  <defs>
                    <radialGradient id="heat">
                      <stop stopColor="#7af1b8" stopOpacity="0.65" />
                      <stop
                        offset="0.5"
                        stopColor="#73e1ac"
                        stopOpacity="0.35"
                      />
                      <stop offset="1" stopColor="#8be8b7" stopOpacity="0.07" />
                    </radialGradient>
                    <filter
                      id="marker-shadow"
                      x="-100%"
                      y="-100%"
                      width="300%"
                      height="300%"
                    >
                      <feDropShadow
                        dx="0"
                        dy="3"
                        stdDeviation="6"
                        floodColor="#1c294d"
                        floodOpacity="0.35"
                      />
                    </filter>
                  </defs>
                  {mapImage ? (
                    <>
                      <rect
                        width="1000"
                        height="1000"
                        fill={mapId === DEFAULT_MAP_ID ? "#c7d7d6" : "#2f3237"}
                      />
                      <image
                        data-map-image="true"
                        href={mapImage}
                        width="1000"
                        height="1000"
                        preserveAspectRatio="xMidYMid meet"
                      />
                    </>
                  ) : (
                    <rect width="1000" height="1000" fill="#e5ebf1" />
                  )}
                  {setup.hasZone1 && (
                    <>
                      <path
                        d={`M0 0H1000V1000H0Z M${setup.circle.x - setup.circle.radius} ${setup.circle.y}a${setup.circle.radius} ${setup.circle.radius} 0 1 0 ${setup.circle.radius * 2} 0a${setup.circle.radius} ${setup.circle.radius} 0 1 0 -${setup.circle.radius * 2} 0Z`}
                        fill="#5b4c9b"
                        fillOpacity="0.48"
                        fillRule="evenodd"
                      />
                      <circle
                        cx={setup.circle.x}
                        cy={setup.circle.y}
                        r={setup.circle.radius}
                        fill="none"
                        stroke="#fff"
                        strokeWidth="4"
                        strokeOpacity="0.96"
                      />
                      <circle
                        cx={setup.circle.x}
                        cy={setup.circle.y}
                        r={setup.circle.radius + 6}
                        fill="none"
                        stroke="#e2e0ff"
                        strokeWidth="1"
                        strokeOpacity="0.5"
                      />
                    </>
                  )}
                  {forecast && showHeat && (
                    <g data-testid="possible-centers">
                      {forecast.density.map((cell) => (
                        <rect
                          key={`${cell.x}:${cell.y}`}
                          x={cell.x}
                          y={cell.y}
                          width={forecast.cellSize}
                          height={forecast.cellSize}
                          rx="6"
                          fill="#69d8ff"
                          fillOpacity={0.08 + cell.intensity * 0.65}
                        />
                      ))}
                      <circle
                        cx={forecast.center.x}
                        cy={forecast.center.y}
                        r={forecast.coverageRadius}
                        fill="none"
                        stroke="#b3ecff"
                        strokeWidth="2.5"
                        strokeDasharray="5 7"
                      />
                    </g>
                  )}
                  {forecast &&
                    showSteps &&
                    forecast.path
                      .slice(1, 3)
                      .map((zone, index) => (
                        <circle
                          data-testid={`zone-${index + 2}`}
                          key={index}
                          cx={zone.x}
                          cy={zone.y}
                          r={zone.radius}
                          fill="none"
                          stroke={index === 0 ? "#f9d989" : "#f4ba83"}
                          strokeWidth="2.5"
                          strokeDasharray="6 9"
                        />
                      ))}
                  {forecast && (
                    <>
                      <circle
                        data-testid="zone-4"
                        cx={scenario.x}
                        cy={scenario.y}
                        r={scenario.radius}
                        fill="#546bf6"
                        fillOpacity="0.16"
                        stroke="#4262f5"
                        strokeWidth="4"
                        strokeDasharray="11 8"
                      />
                      {showSides && (
                        <ZoneSides circle={scenario} sides={zoneSides} />
                      )}
                      <circle
                        cx={scenario.x}
                        cy={scenario.y}
                        r="5"
                        fill="#fff"
                        stroke="#4262f5"
                        strokeWidth="3"
                      />
                      <g
                        transform={`translate(${scenario.x} ${scenario.y - scenario.radius - 26})`}
                      >
                        <rect
                          x="-76"
                          y="-17"
                          width="152"
                          height="33"
                          rx="16.5"
                          fill="#4c63ef"
                        />
                        <text
                          y="5"
                          textAnchor="middle"
                          fill="white"
                          fontFamily="Arial, sans-serif"
                          fontSize="13"
                          fontWeight="700"
                          letterSpacing="1"
                        >
                          ZONE 4 ESTIMATE
                        </text>
                      </g>
                    </>
                  )}
                  {setup.hasZone1 && (
                    <g
                      transform={`translate(${setup.circle.x} ${setup.circle.y})`}
                      opacity={tool === "circle" ? 1 : 0.55}
                    >
                      <circle r="14" fill="#fff" fillOpacity="0.9" />
                      <path
                        d="M-7 0H7M0-7V7"
                        stroke="#4a5963"
                        strokeWidth="2"
                      />
                    </g>
                  )}
                  {showRoute && rotation && !rotation.inside && (
                    <g data-testid="rotation-route">
                      <path
                        d={`M${setup.player.x} ${setup.player.y}L${rotation.target.x} ${rotation.target.y}`}
                        fill="none"
                        stroke="#152d4b"
                        strokeWidth="8"
                        strokeOpacity="0.15"
                      />
                      <path
                        d={`M${setup.player.x} ${setup.player.y}L${rotation.target.x} ${rotation.target.y}`}
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3.5"
                        strokeDasharray="7 8"
                      />
                      <circle
                        cx={rotation.target.x}
                        cy={rotation.target.y}
                        r="9"
                        fill="#fff"
                        stroke="#4c63ef"
                        strokeWidth="4"
                      />
                    </g>
                  )}
                  {forecast && showSides && (
                    <g data-testid="poi-markers">
                      {pois.map((poi) => (
                        <circle
                          key={poi.name}
                          data-testid="poi-marker"
                          cx={poi.x}
                          cy={poi.y}
                          r="6"
                          fill="#fbbf24"
                          stroke="#18243b"
                          strokeWidth="2"
                          role="img"
                          aria-label={`${poi.name}, mapped POI`}
                        >
                          <title>{poi.name} · approximate POI position</title>
                        </circle>
                      ))}
                    </g>
                  )}
                  <g
                    data-testid="player-marker"
                    transform={`translate(${setup.player.x} ${setup.player.y})`}
                    filter="url(#marker-shadow)"
                  >
                    <circle r="26" fill="#fff" fillOpacity="0.25" />
                    <circle r="17" fill="#fff" />
                    <circle r="13" fill="#4564f0" />
                    <path d="m0-8 7 14-7-3-7 3Z" fill="#fff" />
                    <rect
                      x="-24"
                      y="33"
                      width="48"
                      height="26"
                      rx="6"
                      fill="#fff"
                    />
                    <text
                      y="50"
                      textAnchor="middle"
                      fontFamily="Arial, sans-serif"
                      fontSize="12"
                      fontWeight="700"
                      fill="#25314e"
                    >
                      YOU
                    </text>
                  </g>
                </svg>
                <div className="map-top-overlay">
                  <span>
                    <span className="live-dot" /> ZONE 1 → 4
                    <span className="overlay-divider" />{" "}
                    {forecast
                      ? `RUN ${String(runCount - 1).padStart(2, "0")}`
                      : "PLACE ZONE 1"}
                  </span>
                  <div className="compass">
                    <span>N</span>
                    <MoveUpRight size={21} />
                  </div>
                </div>
                <div className="map-layer-controls">
                  <button
                    aria-label="Show zone 4 center density"
                    aria-pressed={showHeat}
                    className={showHeat ? "active" : ""}
                    onClick={() => setShowHeat(!showHeat)}
                    title="Toggle simulated zone 4 centers"
                  >
                    <Layers2 size={18} />
                  </button>
                  <button
                    aria-label="Show rotation route"
                    aria-pressed={showRoute}
                    className={showRoute ? "active" : ""}
                    onClick={() => setShowRoute(!showRoute)}
                    title="Toggle rotation route"
                  >
                    <Flag size={18} />
                  </button>
                </div>
                <div className="map-instruction">
                  <MousePointer2 size={13} />
                  <span>
                    {tool === "circle"
                      ? "Click the center of zone 1 · radius fixed at 32%"
                      : "Click the map to place your position"}
                  </span>
                </div>
                {map.status !== "ready" && (
                  <div className="map-load-state" role="status">
                    <Map size={36} />
                    <h3>
                      {map.status === "loading"
                        ? "Loading your map…"
                        : "Your map image couldn’t load"}
                    </h3>
                    <p>
                      {map.status === "loading"
                        ? "Opening the map image you selected."
                        : "Check the selected image link or try loading it again."}
                    </p>
                    {map.status === "error" && (
                      <button
                        className="button button-primary"
                        onClick={map.refresh}
                      >
                        Try again <RotateCcw size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="map-legend">
                <span>
                  <i className="legend-current" />
                  Zone 1
                </span>
                <span>
                  <i className="legend-next" />
                  Zone 4 estimate
                </span>
                <span>
                  <i className="legend-heat" />
                  Simulated centers
                </span>
                <span className="legend-you">
                  <i />
                  You
                </span>
              </div>
            </div>

            {forecast && showSides && (
              <div className="sides-explanation" role="status">
                {zoneSides?.status === "ready" ? (
                  <>
                    <div className="sides-key">
                      <span>
                        <i className="deadside-dot" /> Estimated deadside ·{" "}
                        <strong data-testid="deadside-poi-count">
                          {zoneSides.deadsideCount} POIs
                        </strong>
                      </span>
                      <span>
                        <i className="congested-dot" /> Estimated congestion ·{" "}
                        <strong data-testid="congested-poi-count">
                          {zoneSides.congestedCount} POIs
                        </strong>
                      </span>
                    </div>
                    <p>
                      Green faces the fewest mapped POIs; red faces the opposite
                      half with more POIs. All {zoneSides.total} map POIs are
                      considered, including those outside zone 4. This is a
                      POI-count estimate, not live player traffic.
                      {zoneSides.neutralCount > 0 &&
                        ` ${zoneSides.neutralCount} POI(s) at the exact zone center are neutral.`}
                    </p>
                  </>
                ) : (
                  <p>
                    {zoneSides?.status === "balanced"
                      ? `The facing halves have equal POI counts (${zoneSides.deadsideCount} each), so there is no clear POI-based deadside to color.`
                      : "There are no directional POIs to compare around this zone, so neither side is colored."}
                  </p>
                )}
              </div>
            )}
            {forecast && (
              <div className="forecast-summary" aria-live="polite">
                <div>
                  <span>SIMULATED PATHS</span>
                  <strong>{forecast.count.toLocaleString("en-GB")}</strong>
                </div>
                <div>
                  <span>ZONE 4 RADIUS</span>
                  <strong>
                    {(scenario.radius / 10).toFixed(1)}
                    <small>% of map</small>
                  </strong>
                </div>
                <div>
                  <span>CENTER SPREAD</span>
                  <strong>
                    80<small>% of simulated centers</small>
                  </strong>
                </div>
              </div>
            )}
            <section className="insight-card" aria-live="polite">
              <div className="insight-icon">
                <MoveUpRight size={23} />
              </div>
              <div className="insight-copy">
                <div className="insight-eyebrow">
                  {forecast ? "ZONE 4 OUTLOOK" : "START WITH ZONE 1"}
                </div>
                <h3>
                  {!forecast
                    ? "Place the first circle. Explore three zones ahead."
                    : rotation.inside
                      ? "You’re inside this modeled zone 4."
                      : "A possible zone 4. A starting point for your rotation."}
                </h3>
                <p>
                  {!forecast
                    ? "Click zone 1’s center, then select Estimate zone 4. Its radius is fixed at 32%."
                    : "The dashed cyan boundary contains 80% of simulated centers. The blue circle is one representative path, not an 80% match prediction."}
                </p>
              </div>
              {rotation && (
                <div className="rotation-stat">
                  <span>
                    {rotation.inside ? (
                      <Check size={25} />
                    ) : (
                      `${Math.round(rotation.distance / 10)}%`
                    )}
                  </span>
                  <small>
                    {rotation.inside ? "IN THIS MODEL" : "OF MAP WIDTH"}
                  </small>
                </div>
              )}
            </section>
            {forecast && (
              <button
                className="intermediate-toggle"
                aria-pressed={showSteps}
                onClick={() => setShowSteps(!showSteps)}
              >
                {showSteps ? "Hide" : "Show"} simulated zones 2 and 3{" "}
                <ChevronDown size={13} />
              </button>
            )}
            <div className="map-footnote">
              <Info size={13} />
              <p>
                Zone 1 radius: 32% of map width. Each next radius: 60% of the
                previous zone. Model coverage is not real-match accuracy.{" "}
                {storageWarning
                  ? "Browser storage is unavailable; settings will reset on reload."
                  : "Your zone 1 setup stays in this browser."}
              </p>
            </div>
          </section>
        </div>

        <section className="tips-section">
          <div className="tips-heading">
            <span className="eyebrow">A LITTLE GAME SENSE GOES A LONG WAY</span>
            <h2>Make your next move count.</h2>
          </div>
          <div className="tips-grid">
            <article>
              <span className="tip-icon">
                <Crosshair size={21} />
              </span>
              <div>
                <h3>Enter zone 1</h3>
                <p>
                  Your selected map loads automatically. Place zone 1’s center;
                  its radius stays fixed at 32% of the map width.
                </p>
              </div>
              <span className="tip-number">01</span>
            </article>
            <article>
              <span className="tip-icon">
                <LocateFixed size={21} />
              </span>
              <div>
                <h3>Look three zones ahead</h3>
                <p>
                  Simulate 2,000 paths through zones 2 and 3. See a zone 4
                  example and how spread out its centers could be.
                </p>
              </div>
              <span className="tip-number">02</span>
            </article>
            <article>
              <span className="tip-icon">
                <MoveUpRight size={21} />
              </span>
              <div>
                <h3>Rotate with a plan</h3>
                <p>
                  Use the route as a starting point. Terrain, cover, and other
                  players still matter.
                </p>
              </div>
              <span className="tip-number">03</span>
            </article>
          </div>
        </section>
      </section>
      {toast && (
        <div className="toast" role="status">
          <Info size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {help && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setHelp(false);
          }}
        >
          <section
            id="help-dialog"
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
          >
            <button
              className="icon-button close-modal"
              aria-label="Close guide"
              onClick={() => setHelp(false)}
            >
              <X size={20} />
            </button>
            <span className="modal-icon">
              <Zap size={27} />
            </span>
            <div className="eyebrow">THE 30-SECOND GUIDE</div>
            <h2 id="help-title">Plan for possibilities.</h2>
            <p>
              CompIQ’s zone predictor is a manual Fortnite storm planner. It
              can’t read your match or reveal the server’s next zone.
            </p>
            <ol>
              <li>
                <strong>Your selected map loads for you.</strong> The app uses
                the map image you supplied, with no map API. It does not select
                a newer season or detect your match automatically.
              </li>
              <li>
                <strong>Enter zone 1.</strong> Click its center. Its radius is
                locked to 32% of map width. You can also place your player
                marker.
              </li>
              <li>
                <strong>Estimate zone 4.</strong> The model simulates 2,000
                paths from zone 1 through zones 2 and 3 to zone 4. The same
                radius retention is locked to 60% and applied three times. These
                fixed settings are modeling assumptions, not verified storm
                data.
              </li>
              <li>
                <strong>Read the spread.</strong> Cyan cells show the frequency
                of simulated zone 4 centers; the dashed boundary covers 80% of
                them. The blue zone 4 is from a representative sampled path. The
                route ignores terrain and opponents.
              </li>
              <li>
                <strong>Show deadside and congestion.</strong> Turn on the Zone
                4 filter. The app compares POI counts in facing halves of the
                map around zone 4. Green faces the fewest POIs; red faces the
                opposite half with more. Equal counts stay uncolored. Yellow
                markers show approximate positions of the named POIs from your
                supplied map. POIs outside zone 4 count too; this does not
                measure live player traffic.
              </li>
            </ol>
            <div className="model-note">
              <Info size={18} />
              <p>
                Zone 1 alone cannot predict the real zone 4. Each next center is
                sampled uniformly where its entire circle stays inside the
                previous one. The 80% coverage describes simulations only, not a
                probability of the actual match. Moving endgame circles are not
                modeled. Distances use map-width percentages, not meters.
              </p>
            </div>
            <button
              className="button button-primary"
              onClick={() => setHelp(false)}
            >
              Let’s plan a rotation <ArrowRight size={17} />
            </button>
          </section>
        </div>
      )}
    </>
  );
}

export default ZonePlanner;
