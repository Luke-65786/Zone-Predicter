import React, { useRef, useState } from "react";
import {
  Copy,
  Download,
  Flag,
  MapPin,
  Plus,
  RotateCcw,
  Route,
  Trash2,
} from "lucide-react";
import useCurrentMap from "./useCurrentMap.js";
import { blankPlan, integer, uid, PLAN_MAP_KEYS } from "./competition.js";
import { getMap } from "./map-source.js";
import MapSelector from "./MapSelector.jsx";
import { switchIsland } from "./map-layouts.js";
import { Field, NumberField, StorageNote, ToolPage } from "./ToolUI.jsx";

const layers = [
  { id: "landing", label: "Landing spot", color: "#67e8b0" },
  { id: "backup", label: "Backup spot", color: "#f9cf79" },
  { id: "loot", label: "Loot route", color: "#62d9fc" },
  { id: "rotation", label: "Rotation route", color: "#e3a2ff" },
  { id: "positions", label: "Good position", color: "#ff99ad" },
];
const mapState = (plan) =>
  Object.fromEntries(layers.map((layer) => [layer.id, plan[layer.id]]));
export default function TournamentPlanner({ store }) {
  const { value, setValue, saved } = store;
  const [draft, setDraft] = useState(blankPlan);
  const [tool, setTool] = useState("landing");
  const [markerLabel, setMarkerLabel] = useState("");
  const [cursor, setCursor] = useState({ x: 500, y: 500 });
  const [message, setMessage] = useState("");
  const [undoMap, setUndoMap] = useState(null);
  const [deleted, setDeleted] = useState(null);
  const mapRef = useRef(null);
  const selected = value.plans.find((p) => p.id === value.activeId);
  const plan = selected ?? draft;
  const map = useCurrentMap(plan.mapId);
  const validTarget = plan.target === "" || integer(plan.target) !== null;
  const validGames = plan.games === "" || integer(plan.games, 1, 200) !== null;
  function patch(values) {
    if (selected) setDeleted(null);
    if (selected)
      setValue((previous) => ({
        ...previous,
        plans: previous.plans.map((p) =>
          p.id === selected.id ? { ...p, ...values } : p,
        ),
      }));
    else setDraft((previous) => ({ ...previous, ...values }));
  }
  const field = (key) => ({
    value: plan[key],
    onChange: (e) => patch({ [key]: e.target.value }),
  });
  function choose(id) {
    setDeleted(null);
    setValue((previous) => ({ ...previous, activeId: id || null }));
    setUndoMap(null);
    setMessage("");
  }
  function newPlan() {
    setDraft(blankPlan());
    choose(null);
  }
  function saveNew() {
    if (!plan.name.trim() || !validTarget || !validGames) {
      setMessage(
        "Name your plan and check any target or game allowance you entered.",
      );
      return;
    }
    if (value.plans.length >= 50) {
      setMessage("You can save up to 50 plans. Remove one to make room.");
      return;
    }
    setValue((previous) => ({
      plans: [...previous.plans, { ...plan, name: plan.name.trim() }],
      activeId: plan.id,
    }));
    setMessage("Plan saved.");
  }
  function changeMap(values) {
    setUndoMap({ id: plan.id, ...mapState(plan) });
    patch(values);
    setMessage("");
  }
  function place(position) {
    if (map.status !== "ready") return;
    const p = {
      x: Math.round(position.x),
      y: Math.round(position.y),
      label: markerLabel.trim(),
    };
    if (["landing", "backup"].includes(tool)) changeMap({ [tool]: p });
    else {
      const limit = tool === "positions" ? 50 : 300;
      if (plan[tool].length >= limit) {
        setMessage(
          `This layer can hold ${limit} points. Remove one before adding more.`,
        );
        return;
      }
      changeMap({ [tool]: [...plan[tool], p] });
    }
  }
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version: 1,
            mapSource: getMap(plan.mapId).source ?? getMap(plan.mapId).path,
            mapId: plan.mapId,
            plan,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(plan.name || "tournament-plan").replace(/[^a-z0-9_-]/gi, "-").slice(0, 80)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function marker(p, color, label, key) {
    return (
      <g
        key={key}
        className="plan-map-marker"
        data-testid={`plan-marker-${key}`}
      >
        <circle
          cx={p.x}
          cy={p.y}
          r="12"
          fill={color}
          stroke="#0a1020"
          strokeWidth="4"
        />
        <text
          x={p.x}
          y={p.y < 45 ? p.y + 34 : p.y - 23}
          textAnchor={p.x < 120 ? "start" : p.x > 880 ? "end" : "middle"}
          fill="white"
          stroke="#0a1020"
          strokeWidth="5"
          paintOrder="stroke"
          fontSize="19"
          fontWeight="700"
        >
          {p.label || label}
        </text>
      </g>
    );
  }
  return (
    <ToolPage
      title="One tournament."
      accent="Your whole plan."
      description="Keep your target, drop plan, loot path, and rotation notes together. Save a separate setup for each event."
      icon={Route}
    >
      <div className="planner-topbar card">
        <Field label="Saved tournament plan">
          <select
            value={selected?.id ?? ""}
            onChange={(e) => choose(e.target.value)}
          >
            <option value="">New unsaved plan</option>
            {value.plans.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name || "Untitled plan"}
              </option>
            ))}
          </select>
        </Field>
        <div className="comp-actions">
          <button className="button button-white" onClick={newPlan}>
            <Plus size={15} /> New plan
          </button>
          {selected && (
            <button
              className="button button-white"
              disabled={value.plans.length >= 50}
              onClick={() => {
                const copy = {
                  ...plan,
                  id: uid(),
                  name: `${plan.name.slice(0, 70)} (copy)`,
                };
                setValue((previous) => ({
                  plans: [...previous.plans, copy],
                  activeId: copy.id,
                }));
                setUndoMap(null);
                setMessage("Copy created.");
              }}
            >
              <Copy size={14} /> Duplicate plan
            </button>
          )}
          <button className="button button-white" onClick={download}>
            <Download size={14} /> Download plan
          </button>
        </div>
      </div>
      <div className="comp-columns plan-columns">
        <div className="comp-stack">
          <section className="card comp-card">
            <div className="comp-section-heading">
              <h2>Tournament details</h2>
              {selected && <span className="comp-pill">AUTO-SAVED</span>}
            </div>
            <Field label="Plan name" maxLength={80} {...field("name")} />
            <div className="comp-field-row">
              <Field
                label="Event date (optional)"
                type="date"
                {...field("date")}
              />
              <Field label="Team format">
                <select {...field("mode")}>
                  {["Solo", "Duo", "Trio", "Squad"].map((mode) => (
                    <option key={mode}>{mode}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="comp-field-row">
              <NumberField
                label="Plan target points"
                max="1000000"
                aria-invalid={!validTarget}
                {...field("target")}
              />
              <NumberField
                label="Plan total games"
                min="1"
                max="200"
                aria-invalid={!validGames}
                {...field("games")}
              />
            </div>
            {(!validTarget || !validGames) && (
              <p className="comp-error">
                Use whole target points up to 1,000,000 and 1–200 games, or
                leave them blank.
              </p>
            )}
            {!selected && (
              <button className="button button-primary" onClick={saveNew}>
                Save tournament plan
              </button>
            )}
            <p className="comp-hint">
              {selected
                ? "Changes to this plan save automatically in your browser."
                : "This draft stays here while you switch tools. Save it to keep it after a reload."}{" "}
              Load a saved target in the{" "}
              <a href="#tracker">tournament tracker</a>.
            </p>
          </section>
          <section className="card comp-card">
            <h2>Drop and rotation notes</h2>
            <Field label="Drop and loot notes">
              <textarea rows={5} maxLength={4000} {...field("dropNotes")} />
            </Field>
            <Field label="Rotation notes">
              <textarea rows={5} maxLength={4000} {...field("rotationNotes")} />
            </Field>
          </section>
          {selected && (
            <button
              className="button plan-delete"
              onClick={() => {
                setDeleted({ ...value });
                setValue((previous) => ({
                  plans: previous.plans.filter((p) => p.id !== selected.id),
                  activeId: null,
                }));
                setDraft(blankPlan());
                setUndoMap(null);
                setMessage("Plan removed. You can undo this below.");
              }}
            >
              <Trash2 size={14} /> Delete this plan
            </button>
          )}
          {deleted && (
            <button
              className="comp-undo"
              onClick={() => {
                setValue(deleted);
                setDeleted(null);
                setMessage("Plan restored.");
              }}
            >
              <RotateCcw size={14} /> Undo plan deletion
            </button>
          )}
        </div>
        <section className="card comp-card plan-map-card">
          <div className="comp-section-heading">
            <h2>Your drop and rotation map</h2>
            <MapPin size={18} />
          </div>
          <MapSelector
            value={plan.mapId}
            onChange={(mapId) => {
              patch(switchIsland(plan, mapId, blankPlan(), PLAN_MAP_KEYS));
              setUndoMap(null);
              setCursor({ x: 500, y: 500 });
            }}
          />
          <p className="comp-hint">
            For a bus route and jump approach, open the{" "}
            <a href="#drops">drop map</a>. You can load this plan’s saved
            landing spot there.
          </p>
          <div
            className="plan-map-tools"
            role="group"
            aria-label="Map drawing tools"
          >
            {layers.map((layer) => (
              <button
                key={layer.id}
                className={`plan-layer-button ${tool === layer.id ? "layer-active" : ""}`}
                aria-pressed={tool === layer.id}
                onClick={() => setTool(layer.id)}
              >
                <span style={{ background: layer.color }} />
                {layer.label}
              </button>
            ))}
          </div>
          <Field
            label="Map marker label (optional)"
            maxLength={80}
            value={markerLabel}
            onChange={(e) => setMarkerLabel(e.target.value)}
          />
          <p className="comp-hint" id="plan-map-help">
            Click or tap to place a marker or add route waypoints. On the map,
            arrow keys move the cursor; Shift moves faster. Press Enter to
            place. Routes are connected in the order you add points.
          </p>
          {map.status === "ready" ? (
            <svg
              ref={mapRef}
              className="plan-map"
              viewBox="0 0 1000 1000"
              role="application"
              aria-label="Tournament planning map"
              aria-describedby="plan-map-help"
              tabIndex={0}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                e.currentTarget.focus({ preventScroll: true });
                const rect = e.currentTarget.getBoundingClientRect();
                const p = {
                  x: Math.max(
                    0,
                    Math.min(
                      1000,
                      ((e.clientX - rect.left) / rect.width) * 1000,
                    ),
                  ),
                  y: Math.max(
                    0,
                    Math.min(
                      1000,
                      ((e.clientY - rect.top) / rect.height) * 1000,
                    ),
                  ),
                };
                setCursor(p);
                place(p);
              }}
              onKeyDown={(e) => {
                const direction = {
                  ArrowLeft: [-1, 0],
                  ArrowRight: [1, 0],
                  ArrowUp: [0, -1],
                  ArrowDown: [0, 1],
                }[e.key];
                if (direction) {
                  e.preventDefault();
                  const step = e.shiftKey ? 50 : 10;
                  setCursor((p) => ({
                    x: Math.max(0, Math.min(1000, p.x + direction[0] * step)),
                    y: Math.max(0, Math.min(1000, p.y + direction[1] * step)),
                  }));
                }
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  place(cursor);
                }
              }}
            >
              <rect width="1000" height="1000" fill="#2f3237" />
              <image href={map.url} x="0" y="0" width="1000" height="1000" />
              {["loot", "rotation"].map((layer) => (
                <g key={layer}>
                  <polyline
                    points={plan[layer].map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="#0a1020"
                    strokeWidth="10"
                    strokeLinejoin="round"
                  />
                  <polyline
                    data-testid={`plan-route-${layer}`}
                    points={plan[layer].map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke={layers.find((l) => l.id === layer).color}
                    strokeWidth="5"
                    strokeDasharray={layer === "rotation" ? "12 7" : undefined}
                    strokeLinejoin="round"
                  />
                  {plan[layer].map((p, i) =>
                    marker(
                      p,
                      layers.find((l) => l.id === layer).color,
                      String(i + 1),
                      `${layer}-${i}`,
                    ),
                  )}
                </g>
              ))}
              {plan.landing &&
                marker(plan.landing, layers[0].color, "Landing", "landing")}
              {plan.backup &&
                marker(plan.backup, layers[1].color, "Backup", "backup")}
              {plan.positions.map((p, i) =>
                marker(
                  p,
                  layers[4].color,
                  `Position ${i + 1}`,
                  `position-${i}`,
                ),
              )}
              <g className="plan-cursor" aria-hidden="true">
                <circle
                  cx={cursor.x}
                  cy={cursor.y}
                  r="18"
                  stroke="white"
                  strokeWidth="3"
                  fill="#0a102066"
                />
                <path
                  d={`M${cursor.x - 26} ${cursor.y}h52 M${cursor.x} ${cursor.y - 26}v52`}
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            </svg>
          ) : (
            <div className="plan-map-placeholder" role="status">
              <Flag size={30} />
              <p>
                {map.status === "loading"
                  ? "Loading your selected Fortnite map…"
                  : "The map could not load. Your saved plan is still available."}
              </p>
              {map.status === "error" && (
                <button className="button button-white" onClick={map.refresh}>
                  Retry planner map
                </button>
              )}
            </div>
          )}
          <div className="comp-actions map-edit-actions">
            <button
              className="button button-white"
              onClick={() =>
                changeMap({
                  [tool]: ["landing", "backup"].includes(tool)
                    ? null
                    : plan[tool].slice(0, -1),
                })
              }
            >
              Remove last{" "}
              {tool === "loot" || tool === "rotation" ? "waypoint" : "marker"}
            </button>
            <button
              className="button button-white"
              onClick={() =>
                changeMap({
                  [tool]: ["landing", "backup"].includes(tool) ? null : [],
                })
              }
            >
              Clear selected layer
            </button>
            <button
              className="button button-white"
              disabled={!undoMap || undoMap.id !== plan.id}
              onClick={() => {
                patch(mapState(undoMap));
                setUndoMap(null);
              }}
            >
              <RotateCcw size={14} /> Undo map edit
            </button>
          </div>
          <p className="comp-hint">
            {plan.landing ? "Landing set" : "No landing spot"} ·{" "}
            {plan.backup ? "Backup set" : "No backup spot"} · {plan.loot.length}{" "}
            loot waypoints · {plan.rotation.length} rotation waypoints ·{" "}
            {plan.positions.length} good positions
          </p>
          <p className="comp-hint">
            Uses your selected Fortnite map. Drawn routes and positions are your
            own notes.
          </p>
        </section>
      </div>
      <p role="status" className="comp-feedback">
        {message}
      </p>
      <StorageNote saved={saved} />
      <p className="comp-hint">
        Saved plans are local to this browser. Download a plan for a readable
        JSON backup of its targets, notes, and map coordinates.
      </p>
    </ToolPage>
  );
}
