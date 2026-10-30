import React, { useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeftRight,
  Check,
  Download,
  MapPin,
  Plus,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import useCurrentMap from "./useCurrentMap.js";
import useSavedState from "./useSavedState.js";
import { uid } from "./competition.js";
import {
  DROP_PHYSICS_FIELDS,
  DROP_MAP_KEYS,
  DEFAULT_DROP_PHYSICS,
  blankDrop,
  estimateDrop,
  normalizeDropState,
  readDropPhysics,
} from "./drop-model.js";
import { Field, Metric, StorageNote, ToolPage } from "./ToolUI.jsx";
import DropMapCanvas from "./DropMapCanvas.jsx";
import MapSelector from "./MapSelector.jsx";
import { switchIsland } from "./map-layouts.js";
import { normalizeMapId } from "./map-source.js";

const steps = [
  { id: "start", label: "Bus start", hint: "Where the bus enters your map" },
  { id: "end", label: "Bus end", hint: "Where the bus leaves your map" },
  {
    id: "target",
    label: "Landing spot",
    hint: "The building or spot you want",
  },
];
const seconds = (value) => `${value.toFixed(1)} s`;
const meters = (value) => `${Math.round(value).toLocaleString()} m`;

export default function DropPlanner({ plans = [] }) {
  const store = useSavedState(
    "compiq-dropmap-v1",
    { current: blankDrop(), presets: [], activeId: null },
    normalizeDropState,
  );
  const { current: drop, presets, activeId } = store.value;
  const [tool, setTool] = useState(() =>
    !drop.start ? "start" : !drop.end ? "end" : "target",
  );
  const [undo, setUndo] = useState(null);
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [planId, setPlanId] = useState("");
  const [modelOpen, setModelOpen] = useState(
    () => Object.keys(readDropPhysics(drop.physics).errors).length > 0,
  );
  const svgRef = useRef(null);
  const map = useCurrentMap(drop.mapId);
  const result = useMemo(() => estimateDrop(drop), [drop]);
  const physicsErrors = readDropPhysics(drop.physics).errors;
  const landingPlans = plans.filter(
    (plan) => plan.landing && normalizeMapId(plan.mapId) === drop.mapId,
  );
  const ready = result.status === "ready";
  function patch(values) {
    setMessage("");
    store.setValue((previous) => {
      const current = { ...previous.current, ...values };
      return {
        ...previous,
        current,
        presets: previous.presets.map((p) =>
          p.id === previous.activeId ? { ...current, id: p.id } : p,
        ),
      };
    });
  }
  function changeMap(values) {
    setUndo({ start: drop.start, end: drop.end, target: drop.target });
    patch(values);
  }
  function place(key, position) {
    if (!steps.some((step) => step.id === key)) return;
    changeMap({ [key]: position });
    if (key === "start" && !drop.end) setTool("end");
    else if (key === "end" && !drop.target) setTool("target");
  }
  function save() {
    if (!drop.name.trim()) {
      setMessage("Give your drop a name before saving it.");
      return;
    }
    if (presets.length >= 30) {
      setMessage("You can save 30 drops. Remove one to make room.");
      return;
    }
    const id = uid();
    store.setValue((previous) => {
      const current = {
        ...previous.current,
        name: previous.current.name.trim(),
      };
      return {
        ...previous,
        current,
        presets: [...previous.presets, { ...current, id }],
        activeId: id,
      };
    });
    setMessage("Drop saved. Further changes save automatically.");
  }
  async function downloadMap() {
    if (!svgRef.current || !map.url) return;
    setExporting(true);
    setMessage("");
    try {
      const clone = svgRef.current.cloneNode(true);
      const response = await fetch(map.url, {
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error("Map download failed");
      const blob = await response.blob();
      const imageUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", "1200");
      clone.setAttribute("height", "1200");
      clone.removeAttribute("class");
      clone.removeAttribute("tabindex");
      clone.removeAttribute("aria-describedby");
      clone.setAttribute("role", "img");
      clone.setAttribute(
        "aria-label",
        `${drop.name || "CompIQ drop map"} · Flat-ground estimate`,
      );
      clone.querySelector("image").setAttribute("href", imageUrl);
      clone.querySelectorAll(".drop-cursor").forEach((node) => node.remove());
      const ns = "http://www.w3.org/2000/svg";
      const [x, y, width] = clone
        .getAttribute("viewBox")
        .split(" ")
        .map(Number);
      const caption = document.createElementNS(ns, "text");
      caption.setAttribute("x", String(x + width * 0.025));
      caption.setAttribute("y", String(y + width * 0.975));
      caption.setAttribute("font-size", String(width * 0.016));
      caption.setAttribute("font-family", "sans-serif");
      caption.setAttribute("fill", "white");
      caption.setAttribute("stroke", "#071326");
      caption.setAttribute("stroke-width", String(width * 0.005));
      caption.setAttribute("paint-order", "stroke");
      caption.textContent = `CompIQ · Flat-ground estimate${ready ? ` · Jump +${seconds(result.jumpAfter)} · Land +${seconds(result.landAfter)}` : ""}`;
      clone.appendChild(caption);
      const url = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(clone)], {
          type: "image/svg+xml",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${(drop.name || "compiq-drop-map").replace(/[^a-z0-9_-]/gi, "-").slice(0, 80)}.svg`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        "Drop map downloaded. The image includes your current zoom and markers.",
      );
    } catch {
      setMessage(
        "The map image could not be included in the download. Retry when the map connection is available. Your drop is still available here.",
      );
    } finally {
      setExporting(false);
    }
  }
  return (
    <ToolPage
      title="Own your drop."
      accent="Land with a plan."
      description="Plot the bus route, pick your landing, and explore a jump and glide approach on your Fortnite map."
      icon={Send}
    >
      <div className="planner-topbar card drop-topbar">
        <Field label="Saved drop">
          <select
            value={activeId ?? ""}
            onChange={(e) => {
              const preset = presets.find((p) => p.id === e.target.value);
              if (preset)
                store.setValue((previous) => ({
                  ...previous,
                  current: { ...preset },
                  activeId: preset.id,
                }));
              else
                store.setValue((previous) => ({ ...previous, activeId: null }));
              setUndo(null);
              setMessage("");
            }}
          >
            <option value="">Current draft</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="comp-actions">
          <button
            className="button button-white"
            onClick={() => {
              store.setValue((previous) => ({
                ...previous,
                current: blankDrop(),
                activeId: null,
              }));
              setTool("start");
              setUndo(null);
              setMessage("");
            }}
          >
            <Plus size={14} /> New drop
          </button>
          <button
            className="button button-white"
            onClick={downloadMap}
            disabled={map.status !== "ready" || exporting}
          >
            <Download size={14} />
            {exporting ? "Preparing map…" : "Download map (SVG)"}
          </button>
        </div>
      </div>
      <div className="comp-columns drop-columns">
        <div className="comp-stack">
          <section className="card comp-card">
            <MapSelector
              value={drop.mapId}
              onChange={(mapId) => {
                patch(switchIsland(drop, mapId, blankDrop(), DROP_MAP_KEYS));
                setUndo(null);
                setPlanId("");
                setTool("start");
              }}
            />
            <div className="comp-section-heading">
              <h2>Build your approach</h2>
              <span className="comp-pill">3 MAP CLICKS</span>
            </div>
            <div
              className="drop-steps"
              role="group"
              aria-label="Drop placement steps"
            >
              {steps.map(({ id, label, hint }, index) => (
                <button
                  key={id}
                  className={`drop-step ${tool === id ? "drop-step-active" : ""}`}
                  aria-label={`Place ${label.toLowerCase()}`}
                  aria-pressed={tool === id}
                  onClick={() => setTool(id)}
                >
                  <span className="drop-step-number">
                    {drop[id] ? <Check size={15} /> : index + 1}
                  </span>
                  <span>
                    <strong>{label}</strong>
                    <small>
                      {drop[id]
                        ? `${(drop[id].x / 10).toFixed(1)}% across · ${(drop[id].y / 10).toFixed(1)}% down`
                        : hint}
                    </small>
                  </span>
                  {tool === id && <MapPin size={15} />}
                </button>
              ))}
            </div>
            <div className="comp-actions drop-edit-actions">
              <button
                className="button button-white"
                disabled={!drop.start || !drop.end}
                onClick={() => changeMap({ start: drop.end, end: drop.start })}
              >
                <ArrowLeftRight size={13} /> Reverse bus
              </button>
              <button
                className="button button-white"
                disabled={!undo}
                onClick={() => {
                  patch(undo);
                  setUndo(null);
                }}
              >
                <RotateCcw size={13} /> Undo map edit
              </button>
              <button
                className="button button-white"
                disabled={!drop.start && !drop.end}
                onClick={() => {
                  changeMap({ start: null, end: null });
                  setTool("start");
                }}
              >
                Clear bus route
              </button>
            </div>
            {landingPlans.length > 0 && (
              <div className="drop-import-plan">
                <Field label="Landing from tournament plan">
                  <select
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                  >
                    <option value="">Choose a saved plan</option>
                    {landingPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <button
                  className="button button-white"
                  disabled={!landingPlans.some((plan) => plan.id === planId)}
                  onClick={() => {
                    changeMap({
                      target: landingPlans.find((plan) => plan.id === planId)
                        .landing,
                    });
                    setTool(
                      !drop.start ? "start" : !drop.end ? "end" : "target",
                    );
                  }}
                >
                  Use plan landing spot
                </button>
              </div>
            )}
          </section>
          <section className="card comp-card">
            <div className="comp-section-heading">
              <h2>Keep this drop</h2>
              {activeId && <span className="comp-pill">AUTO-SAVED</span>}
            </div>
            <Field
              label="Drop name"
              maxLength={80}
              value={drop.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
            <Field label="Drop notes">
              <textarea
                rows={3}
                maxLength={2000}
                value={drop.notes}
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </Field>
            {activeId ? (
              <button
                className="button plan-delete"
                onClick={() => {
                  store.setValue((previous) => ({
                    ...previous,
                    presets: previous.presets.filter((p) => p.id !== activeId),
                    activeId: null,
                  }));
                  setMessage(
                    "Saved drop removed. The map stays available as a draft.",
                  );
                }}
              >
                <Trash2 size={14} /> Remove saved drop
              </button>
            ) : (
              <button
                className="button button-primary"
                disabled={presets.length >= 30}
                onClick={save}
              >
                Save drop
              </button>
            )}
            <p className="comp-hint">
              Your current draft also survives a reload. Save up to 30 named
              drops for different routes and landing spots.
            </p>
          </section>
          <details
            className="card comp-card drop-model-settings"
            open={modelOpen}
            onToggle={(event) => setModelOpen(event.currentTarget.open)}
          >
            <summary>Timing model</summary>
            <p className="comp-hint">
              These are editable starting assumptions, not measured values for
              the current season. Image width sets the distance scale. Heights
              are relative to your landing spot.
            </p>
            {DROP_PHYSICS_FIELDS.map(({ key, label, min, max }) => (
              <Field
                key={key}
                label={label}
                hint={physicsErrors[key]}
                type="number"
                inputMode="decimal"
                min={min}
                max={max}
                step="any"
                value={drop.physics[key]}
                aria-invalid={!!physicsErrors[key]}
                onChange={(e) =>
                  patch({ physics: { ...drop.physics, [key]: e.target.value } })
                }
              />
            ))}
            <button
              className="button button-white"
              onClick={() => patch({ physics: { ...DEFAULT_DROP_PHYSICS } })}
            >
              <RotateCcw size={13} /> Reset timing model
            </button>
          </details>
        </div>
        <div className="comp-stack">
          <section className="card comp-card drop-map-card">
            <div className="comp-section-heading">
              <h2>Your drop map</h2>
              <span className="comp-pill">
                {tool === "pan"
                  ? "PAN THE MAP"
                  : `PLACE ${steps.find((step) => step.id === tool)?.label.toUpperCase()}`}
              </span>
            </div>
            {map.status === "ready" ? (
              <DropMapCanvas
                key={drop.mapId}
                mapUrl={map.url}
                drop={drop}
                result={result}
                tool={tool}
                setTool={setTool}
                onPlace={place}
                svgRef={svgRef}
              />
            ) : (
              <div className="plan-map-placeholder" role="status">
                <MapPin size={30} />
                <p>
                  {map.status === "loading"
                    ? "Loading your selected Fortnite map…"
                    : "The map could not load. Your saved drops and notes are still available."}
                </p>
                {map.status === "error" && (
                  <button className="button button-white" onClick={map.refresh}>
                    Retry drop map
                  </button>
                )}
              </div>
            )}
          </section>
          <section
            className="card comp-card drop-results"
            aria-label="Drop estimate"
          >
            <div className="comp-section-heading">
              <h2>{ready ? "Your suggested approach" : "Plot your drop"}</h2>
              <span className="comp-pill">FLAT-GROUND ESTIMATE</span>
            </div>
            {ready ? (
              <>
                <div className="comp-metrics drop-metrics">
                  <Metric
                    label="Jump after bus entry"
                    value={seconds(result.jumpAfter)}
                    testId="drop-jump-time"
                  />
                  <Metric
                    label="Time in the air"
                    value={seconds(result.flightTime)}
                    testId="drop-air-time"
                  />
                  <Metric
                    label="Jump along bus route"
                    value={`${(result.progress * 100).toFixed(1)}%`}
                    testId="drop-bus-progress"
                  />
                </div>
                <ol
                  className="drop-timeline"
                  aria-label="Estimated drop timeline"
                >
                  {[
                    ["1", "Bus enters at your start marker", 0, ""],
                    [
                      "J",
                      "Jump and dive toward the landing",
                      result.jumpAfter,
                      `${meters(result.diveMeters)} horizontal dive`,
                    ],
                    [
                      "G",
                      "Deploy and glide to your landing",
                      result.deployAfter,
                      `${meters(result.glideMeters)} glide`,
                    ],
                    [
                      "L",
                      "Reach your landing spot",
                      result.landAfter,
                      result.heading === null
                        ? "Directly below your jump"
                        : `${Math.round(result.heading) % 360}° heading from jump · north is 0°`,
                    ],
                  ].map(([mark, label, time, hint], index) => (
                    <li key={mark}>
                      <span
                        className={`drop-timeline-marker drop-timeline-${index}`}
                      >
                        {mark}
                      </span>
                      <span>
                        <strong>{label}</strong>
                        {hint && <small>{hint}</small>}
                      </span>
                      <b>+{seconds(time)}</b>
                    </li>
                  ))}
                </ol>
              </>
            ) : result.status === "incomplete" ? (
              <p className="comp-empty">
                {!drop.start
                  ? "Start by marking where the bus enters the map."
                  : !drop.end
                    ? "Now mark where the bus leaves the map."
                    : "Choose a landing spot to calculate your approach."}{" "}
                The route direction runs from 1 to 2.
              </p>
            ) : result.status === "unreachable" ? (
              <div className="comp-error" role="status">
                <strong>This landing is out of reach in this model.</strong>
                <p>
                  The nearest bus point is{" "}
                  {meters(result.closestDistanceMeters)} away; the modeled
                  maximum reach is {meters(result.maxReachMeters)}. Move the
                  landing, update the route, or adjust the timing model to your
                  mode.
                </p>
              </div>
            ) : (
              <p className="comp-error" role="alert">
                {result.status === "route-error"
                  ? result.message
                  : "Check the highlighted timing model values before calculating."}
              </p>
            )}
            <p className="drop-estimate-note">
              <ArrowDown size={16} />
              <span>
                Estimated from a straight bus route and flat ground. Terrain
                heights, steering, and game updates can change the best jump and
                deploy point. Times start when the bus reaches your start
                marker.
              </span>
            </p>
          </section>
        </div>
      </div>
      <p className="comp-feedback" role="status">
        {message}
      </p>
      <StorageNote saved={store.saved} />
    </ToolPage>
  );
}
