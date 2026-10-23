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
  LocateFixed,
  Map,
  MapPin,
  MousePointer2,
  MoveUpRight,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";
import Island from "./Island.jsx";
import {
  DEFAULT_SETUP,
  MAP_SIZE,
  clamp,
  fitCircle,
  planRotation,
  restoreSetup,
  sampleNextCircle,
} from "./geometry.js";

const STORAGE_KEY = "zoneiq-setup-v1";
function initialSetup() {
  try {
    return (
      restoreSetup(localStorage.getItem(STORAGE_KEY)) ||
      structuredClone(DEFAULT_SETUP)
    );
  } catch {
    return structuredClone(DEFAULT_SETUP);
  }
}

function App() {
  const [setup, setSetup] = useState(initialSetup);
  const [scenario, setScenario] = useState(() =>
    sampleNextCircle(
      setup.circle,
      setup.ratio,
      (() => {
        const values = [0.87, 0.52];
        return () => values.shift();
      })(),
    ),
  );
  const [tool, setTool] = useState("circle");
  const [showHeat, setShowHeat] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [mapImage, setMapImage] = useState(null);
  const [mapName, setMapName] = useState("Practice island");
  const [help, setHelp] = useState(false);
  const [toast, setToast] = useState("");
  const [runCount, setRunCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const svgRef = useRef(null);
  const mapRef = useRef(null);
  const fileRef = useRef(null);
  const dragging = useRef(false);
  const generationTimer = useRef(null);
  const rotation = planRotation(setup.player, scenario);
  const possibleRadius = setup.circle.radius - scenario.radius;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }, [setup]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => () => clearTimeout(generationTimer.current), []);
  useEffect(() => {
    if (!mapImage) return;
    return () => URL.revokeObjectURL(mapImage);
  }, [mapImage]);
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
    const next = { ...setup, ...patch };
    setSetup(next);
    if (patch.circle || patch.ratio) {
      clearTimeout(generationTimer.current);
      setIsGenerating(false);
      setScenario(sampleNextCircle(next.circle, next.ratio));
      setRunCount(1);
    }
  }
  function generate() {
    setIsGenerating(true);
    generationTimer.current = setTimeout(() => {
      setScenario(sampleNextCircle(setup.circle, setup.ratio));
      setRunCount((value) => value + 1);
      setIsGenerating(false);
    }, 350);
  }
  function updatePosition(x, y) {
    if (tool === "circle")
      changeSetup({ circle: fitCircle({ ...setup.circle, x, y }) });
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
    if (!directions[event.key]) return;
    event.preventDefault();
    const active = tool === "circle" ? setup.circle : setup.player;
    const step = event.shiftKey ? 25 : 5;
    updatePosition(
      active.x + directions[event.key][0] * step,
      active.y + directions[event.key][1] * step,
    );
  }
  function reset() {
    clearTimeout(generationTimer.current);
    setIsGenerating(false);
    const next = structuredClone(DEFAULT_SETUP);
    setSetup(next);
    setScenario(sampleNextCircle(next.circle, next.ratio));
    setRunCount(1);
    setTool("circle");
    setMapImage(null);
    setMapName("Practice island");
    setShowHeat(true);
    setShowRoute(true);
    setToast("Planner reset to the practice setup");
  }
  function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 12 * 1024 * 1024
    ) {
      setToast("Choose a PNG, JPG, or WebP image under 12 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setMapImage(url);
      setMapName(file.name);
      setToast(
        "Map loaded. Place the current circle to match your screenshot.",
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setToast("That image could not be opened. Try another file.");
    };
    image.src = url;
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
        "ZoneIQ · Sampled scenario only · Not a live zone prediction";
      svg.appendChild(title);
      const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
        type: "image/svg+xml",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "zoneiq-plan.svg";
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
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#" aria-label="ZoneIQ home">
            <span className="brand-mark">
              <Zap size={24} fill="currentColor" strokeWidth={1.5} />
            </span>
            Zone<span className="brand-iq">IQ</span>
            <span className="brand-beta">BETA</span>
          </a>
          <nav aria-label="Main navigation">
            <a href="#planner" className="nav-active">
              Zone planner
            </a>
            <button onClick={() => setHelp(true)}>
              How it works <ArrowUpRight size={13} />
            </button>
          </nav>
          <div className="header-right">
            <span className="fan-label">
              <span />
              Built for the next rotation
            </span>
            <button
              className="icon-button help-button"
              aria-label="Open help"
              onClick={() => setHelp(true)}
            >
              <CircleHelp size={19} />
            </button>
          </div>
        </div>
      </header>

      <main id="planner" className="page-shell">
        <section className="intro">
          <div>
            <div className="eyebrow">
              <span />
              THE STORM DOESN’T WAIT. PLAN AHEAD.
            </div>
            <h1>
              Think one circle <span>ahead.</span>
            </h1>
            <p>
              Your next rotation starts here. Map the storm. Explore the
              possibilities.
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
                <h2>Set up your zone</h2>
                <span className="step-label">01 — 03</span>
              </div>
              <div className="control-section">
                <div className="field-heading">
                  <label htmlFor="map-select">Your map</label>
                  <span className="tiny-tag">MANUAL INPUT</span>
                </div>
                <div id="map-select" className="map-select">
                  <span className="map-thumbnail">
                    <Map size={21} />
                  </span>
                  <div>
                    <strong title={mapName}>{mapName}</strong>
                    <span>
                      {mapImage
                        ? "Custom map · this session"
                        : "Illustrative map · not a live island"}
                    </span>
                  </div>
                  <ChevronDown size={16} />
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  className="visually-hidden"
                  aria-label="Upload a map image"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={upload}
                />
                <button
                  className="upload-button"
                  onClick={() => fileRef.current.click()}
                >
                  <Upload size={14} /> Upload your map{" "}
                  <span>JPG, PNG, WebP</span>
                </button>
              </div>
              <div className="control-section">
                <div className="field-heading">
                  <label>Storm phase</label>
                  <span className="field-value">
                    Phase {setup.phase} <span>/ 9</span>
                  </span>
                </div>
                <div className="phase-picker" aria-label="Storm phase">
                  {Array.from({ length: 9 }, (_, index) => index + 1).map(
                    (phase) => (
                      <button
                        key={phase}
                        aria-label={`Phase ${phase}`}
                        aria-pressed={setup.phase === phase}
                        className={setup.phase === phase ? "selected" : ""}
                        onClick={() => changeSetup({ phase })}
                      >
                        {phase}
                      </button>
                    ),
                  )}
                </div>
                <p className="field-note">
                  Phase labels your plan. Set circle sizes below.
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
                    <Crosshair size={17} /> Current circle
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
                  {tool === "circle" ? "your circle" : "your marker"}.
                </p>
              </div>
              <div className="control-section range-section">
                <div className="field-heading">
                  <label htmlFor="circle-size">Current circle radius</label>
                  <span className="number-value">
                    {Math.round(setup.circle.radius / 10)}
                    <small>% of map</small>
                  </span>
                </div>
                <input
                  id="circle-size"
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={Math.round(setup.circle.radius / 10)}
                  style={{
                    "--progress": `${((setup.circle.radius / 10 - 5) / 45) * 100}%`,
                  }}
                  onChange={(event) =>
                    changeSetup({
                      circle: fitCircle({
                        ...setup.circle,
                        radius: +event.target.value * 10,
                      }),
                    })
                  }
                />
                <div className="range-labels">
                  <span>Smaller</span>
                  <span>Larger</span>
                </div>
              </div>
              <div className="control-section range-section">
                <div className="field-heading">
                  <label htmlFor="next-size">Next circle size</label>
                  <span className="number-value">
                    {Math.round(setup.ratio * 100)}
                    <small>% of current</small>
                  </span>
                </div>
                <input
                  id="next-size"
                  type="range"
                  min="20"
                  max="90"
                  step="5"
                  value={Math.round(setup.ratio * 100)}
                  style={{
                    "--progress": `${((setup.ratio * 100 - 20) / 70) * 100}%`,
                  }}
                  onChange={(event) =>
                    changeSetup({ ratio: +event.target.value / 100 })
                  }
                />
                <div className="range-labels">
                  <span>Smaller</span>
                  <span>Larger</span>
                </div>
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
                        aria-label={`Current circle ${axis.toUpperCase()} position percent`}
                        type="number"
                        min={setup.circle.radius / 10}
                        max={100 - setup.circle.radius / 10}
                        value={Math.round(setup.circle[axis] / 10)}
                        onChange={(event) => {
                          if (event.target.value !== "")
                            changeSetup({
                              circle: fitCircle({
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
                  className={`button button-primary generate-button ${isGenerating ? "generating" : ""}`}
                  disabled={isGenerating}
                  onClick={generate}
                >
                  <Sparkles size={18} />
                  {isGenerating
                    ? "Exploring the circle…"
                    : "Generate next zone"}
                  <ArrowRight size={17} />
                </button>
                <span>Explore a possible next-circle scenario</span>
              </div>
            </section>
            <div className="fair-play">
              <div className="fair-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <strong>A planner. No crystal ball.</strong>
                <p>
                  Future zones are server-generated. Use scenarios to practice,
                  not as a live forecast.
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
                    {mapImage ? "CUSTOM MAP" : "PRACTICE MODE"}
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
                  aria-label={`Interactive zone map. ${tool === "circle" ? "Current circle" : "Player position"} selected. Use arrow keys to move, or click and drag.`}
                  tabIndex="0"
                  onKeyDown={handleMapKey}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
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
                      <rect width="1000" height="1000" fill="#c7d7d6" />
                      <image
                        data-map-image="true"
                        href={mapImage}
                        width="1000"
                        height="1000"
                        preserveAspectRatio="xMidYMid meet"
                      />
                    </>
                  ) : (
                    <Island />
                  )}
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
                  {showHeat && (
                    <circle
                      data-testid="possible-centers"
                      cx={setup.circle.x}
                      cy={setup.circle.y}
                      r={possibleRadius}
                      fill="url(#heat)"
                      stroke="#c0efc6"
                      strokeWidth="1.7"
                      strokeDasharray="4 8"
                    />
                  )}
                  <circle
                    data-testid="next-circle"
                    cx={scenario.x}
                    cy={scenario.y}
                    r={scenario.radius}
                    fill="#546bf6"
                    fillOpacity="0.16"
                    stroke="#4262f5"
                    strokeWidth="4"
                    strokeDasharray="11 8"
                  />
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
                      POSSIBLE NEXT ZONE
                    </text>
                  </g>
                  <g
                    transform={`translate(${setup.circle.x} ${setup.circle.y})`}
                    opacity={tool === "circle" ? 1 : 0.55}
                  >
                    <circle r="14" fill="#fff" fillOpacity="0.9" />
                    <path d="M-7 0H7M0-7V7" stroke="#4a5963" strokeWidth="2" />
                  </g>
                  {showRoute && !rotation.inside && (
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
                    <span className="live-dot" /> PHASE {setup.phase}{" "}
                    <span className="overlay-divider" /> SCENARIO{" "}
                    {String(runCount).padStart(2, "0")}
                  </span>
                  <div className="compass">
                    <span>N</span>
                    <MoveUpRight size={21} />
                  </div>
                </div>
                <div className="map-layer-controls">
                  <button
                    aria-label="Show possible center area"
                    aria-pressed={showHeat}
                    className={showHeat ? "active" : ""}
                    onClick={() => setShowHeat(!showHeat)}
                    title="Toggle possible center area"
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
                      ? "Click the map to position your circle"
                      : "Click the map to place your position"}
                  </span>
                </div>
                {!mapImage && (
                  <span className="map-caption">ILLUSTRATIVE ISLAND</span>
                )}
              </div>
              <div className="map-legend">
                <span>
                  <i className="legend-current" />
                  Current circle
                </span>
                <span>
                  <i className="legend-next" />
                  Sampled next zone
                </span>
                <span>
                  <i className="legend-heat" />
                  Possible centers
                </span>
                <span className="legend-you">
                  <i />
                  You
                </span>
              </div>
            </div>

            <section className="insight-card" aria-live="polite">
              <div className="insight-icon">
                {rotation.inside ? (
                  <ShieldCheck size={23} />
                ) : (
                  <MoveUpRight size={23} />
                )}
              </div>
              <div className="insight-copy">
                <div className="insight-eyebrow">YOUR ROTATION OUTLOOK</div>
                <h3>
                  {rotation.inside
                    ? "You’re inside this scenario."
                    : "A little planning. A better position."}
                </h3>
                <p>
                  {rotation.inside
                    ? "Your marker is in the sampled circle. Explore another scenario to test your position."
                    : "The dotted line shows a direct path into this scenario. Check terrain before rotating."}
                </p>
              </div>
              <div className="rotation-stat">
                <span>
                  {rotation.inside ? (
                    <Check size={25} />
                  ) : (
                    `${Math.round(rotation.distance / 10)}%`
                  )}
                </span>
                <small>
                  {rotation.inside ? "IN THIS CIRCLE" : "OF MAP WIDTH"}
                </small>
              </div>
            </section>
            <div className="map-footnote">
              <Info size={13} />
              <p>
                Geometry-based scenarios. No live match data or guaranteed
                predictions.{" "}
                {storageWarning
                  ? "Browser storage is unavailable; settings will reset on reload."
                  : "Your settings stay in this browser; uploaded maps stay in this session."}
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
                <h3>Start with the circle</h3>
                <p>
                  Match the white circle to your in-game map. A good setup makes
                  a useful scenario.
                </p>
              </div>
              <span className="tip-number">01</span>
            </article>
            <article>
              <span className="tip-icon">
                <LocateFixed size={21} />
              </span>
              <div>
                <h3>Play the possibilities</h3>
                <p>
                  Generate a few scenarios. Look for a position that gives you
                  options in each.
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
      </main>
      <footer>
        <div className="footer-inner">
          <a className="brand footer-brand" href="#">
            <span className="brand-mark">
              <Zap size={17} fill="currentColor" strokeWidth={1.5} />
            </span>
            Zone<span className="brand-iq">IQ</span>
          </a>
          <p>
            An independent Fortnite planning tool. Not affiliated with Epic
            Games.
          </p>
          <button onClick={() => setHelp(true)}>
            Built for better decisions <ArrowUpRight size={13} />
          </button>
        </div>
      </footer>

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
              ZoneIQ is a manual Fortnite storm planner. It can’t read your
              match or reveal the server’s next zone.
            </p>
            <ol>
              <li>
                <strong>Bring your map.</strong> Use the illustrative practice
                island or upload a map screenshot. Images stay in your browser.
              </li>
              <li>
                <strong>Match your circle.</strong> Place the current circle,
                adjust its radius, and mark your position. Phase is a label; it
                doesn’t change the model.
              </li>
              <li>
                <strong>Explore next zones.</strong> Choose a next-circle size,
                then generate scenarios. Every sampled circle fits inside your
                current circle.
              </li>
              <li>
                <strong>Plan a rotation.</strong> The dotted path leads just
                inside the sampled circle. It doesn’t account for terrain or
                opponents.
              </li>
            </ol>
            <div className="model-note">
              <Info size={18} />
              <p>
                Centers are sampled uniformly across the green area. This is a
                geometric practice model, not Fortnite’s actual storm algorithm.
                Moving endgame circles are not modeled. Distances are a
                percentage of map width, not in-game meters.
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

export default App;
