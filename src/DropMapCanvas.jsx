import React, { useEffect, useId, useRef, useState } from "react";
import { Focus, Hand, Maximize, Minus, Plus } from "lucide-react";

export const DROP_COLORS = {
  bus: "#7dd3fc",
  jump: "#ffe37d",
  deploy: "#d7a6ff",
  target: "#7aefb3",
};
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const fullView = { x: 0, y: 0, size: 1000 };
const constrain = (view) => ({
  ...view,
  x: clamp(view.x, 0, 1000 - view.size),
  y: clamp(view.y, 0, 1000 - view.size),
});

export default function DropMapCanvas({
  mapUrl,
  drop,
  result,
  tool,
  setTool,
  onPlace,
  svgRef,
}) {
  const [view, setView] = useState(fullView);
  const [cursor, setCursor] = useState({ x: 500, y: 500 });
  const [displayWidth, setDisplayWidth] = useState(1000);
  const pan = useRef(null);
  const id = useId().replace(/[^a-z0-9_-]/gi, "");
  // Keep annotations readable on phones and the same size while zooming.
  const scale = view.size / Math.max(360, displayWidth);
  const ready = result.status === "ready";
  useEffect(() => {
    const node = svgRef.current;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setDisplayWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [svgRef]);
  function coordinate(event) {
    const point = svgRef.current.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const p = point.matrixTransform(svgRef.current.getScreenCTM().inverse());
    return {
      x: Math.round(clamp(p.x, 0, 1000)),
      y: Math.round(clamp(p.y, 0, 1000)),
    };
  }
  function zoom(factor) {
    const size = clamp(view.size * factor, 250, 1000);
    setView(
      constrain({
        size,
        x: view.x + (view.size - size) / 2,
        y: view.y + (view.size - size) / 2,
      }),
    );
  }
  function marker(p, color, letter, label, testId) {
    if (!p) return null;
    const x = clamp(p.x, view.x + 40 * scale, view.x + view.size - 40 * scale);
    const below =
      (testId === "drop-target" && p.y < view.y + view.size - 50 * scale) ||
      p.y < view.y + 55 * scale;
    return (
      <g className="drop-marker" data-testid={testId}>
        <title>{label}</title>
        <circle
          cx={p.x}
          cy={p.y}
          r={16 * scale}
          fill={color}
          stroke="#071326"
          strokeWidth={4 * scale}
        />
        <text
          x={p.x}
          y={p.y + 6 * scale}
          textAnchor="middle"
          fill="#071326"
          fontSize={17 * scale}
          fontWeight="800"
        >
          {letter}
        </text>
        <text
          x={x}
          y={below ? p.y + 39 * scale : p.y - 27 * scale}
          textAnchor="middle"
          fill="white"
          stroke="#071326"
          strokeWidth={5 * scale}
          paintOrder="stroke"
          fontSize={18 * scale}
          fontWeight="700"
        >
          {label}
        </text>
      </g>
    );
  }
  return (
    <>
      <div
        className="drop-view-controls"
        role="group"
        aria-label="Drop map view"
      >
        <button
          className="button button-white"
          aria-pressed={tool === "pan"}
          onClick={() => setTool(tool === "pan" ? "target" : "pan")}
        >
          <Hand size={14} /> Pan
        </button>
        <div className="drop-zoom-controls">
          <button
            className="icon-button"
            aria-label="Zoom out drop map"
            disabled={view.size >= 1000}
            onClick={() => zoom(1.5)}
          >
            <Minus size={16} />
          </button>
          <span aria-live="polite">{(1000 / view.size).toFixed(1)}×</span>
          <button
            className="icon-button"
            aria-label="Zoom in drop map"
            disabled={view.size <= 250}
            onClick={() => zoom(1 / 1.5)}
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          className="icon-button"
          aria-label="Center map on landing spot"
          disabled={!drop.target}
          onClick={() => {
            setView(
              constrain({
                ...view,
                x: drop.target.x - view.size / 2,
                y: drop.target.y - view.size / 2,
              }),
            );
            setCursor(drop.target);
          }}
        >
          <Focus size={16} />
        </button>
        <button
          className="icon-button"
          aria-label="Show full drop map"
          onClick={() => setView(fullView)}
        >
          <Maximize size={16} />
        </button>
      </div>
      <svg
        ref={svgRef}
        className={`plan-map drop-map ${tool === "pan" ? "drop-map-pan" : ""}`}
        viewBox={`${view.x} ${view.y} ${view.size} ${view.size}`}
        role="application"
        aria-label="Interactive drop map"
        aria-describedby="drop-map-help"
        tabIndex={0}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.focus({ preventScroll: true });
          if (tool === "pan") {
            e.preventDefault();
            pan.current = {
              clientX: e.clientX,
              clientY: e.clientY,
              view,
              width: e.currentTarget.getBoundingClientRect().width,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          } else {
            const p = coordinate(e);
            setCursor(p);
            onPlace(tool, p);
          }
        }}
        onPointerMove={(e) => {
          if (!pan.current) return;
          const start = pan.current;
          setView(
            constrain({
              ...start.view,
              x:
                start.view.x -
                ((e.clientX - start.clientX) / start.width) * start.view.size,
              y:
                start.view.y -
                ((e.clientY - start.clientY) / start.width) * start.view.size,
            }),
          );
        }}
        onPointerUp={() => {
          pan.current = null;
        }}
        onPointerCancel={() => {
          pan.current = null;
        }}
        onLostPointerCapture={() => {
          pan.current = null;
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
            const step = (e.shiftKey ? 50 : 10) * scale;
            if (tool === "pan")
              setView((previous) =>
                constrain({
                  ...previous,
                  x: previous.x + direction[0] * step,
                  y: previous.y + direction[1] * step,
                }),
              );
            else
              setCursor((p) => ({
                x: clamp(p.x + direction[0] * step, view.x, view.x + view.size),
                y: clamp(p.y + direction[1] * step, view.y, view.y + view.size),
              }));
          }
          if ((e.key === "Enter" || e.key === " ") && tool !== "pan") {
            e.preventDefault();
            onPlace(tool, cursor);
          }
          if (e.key === "+" || e.key === "=") {
            e.preventDefault();
            zoom(1 / 1.5);
          }
          if (e.key === "-") {
            e.preventDefault();
            zoom(1.5);
          }
        }}
      >
        <defs>
          <marker
            id={`${id}-bus-arrow`}
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path
              d="M1 1L9 5L1 9Z"
              fill={DROP_COLORS.bus}
              stroke="#071326"
              strokeWidth="0.6"
            />
          </marker>
        </defs>
        <image href={mapUrl} x="0" y="0" width="1000" height="1000" />
        {drop.start && drop.end && (
          <g>
            <line
              x1={drop.start.x}
              y1={drop.start.y}
              x2={drop.end.x}
              y2={drop.end.y}
              stroke="#071326"
              strokeWidth={10 * scale}
            />
            <line
              data-testid="drop-bus-route"
              x1={drop.start.x}
              y1={drop.start.y}
              x2={drop.end.x}
              y2={drop.end.y}
              stroke={DROP_COLORS.bus}
              strokeWidth={4 * scale}
              strokeDasharray={`${14 * scale} ${9 * scale}`}
              markerEnd={`url(#${id}-bus-arrow)`}
            />
          </g>
        )}
        {ready && (
          <g>
            <polyline
              points={`${result.jump.x},${result.jump.y} ${result.deploy.x},${result.deploy.y} ${drop.target.x},${drop.target.y}`}
              fill="none"
              stroke="#071326"
              strokeWidth={11 * scale}
              strokeLinejoin="round"
            />
            <line
              x1={result.jump.x}
              y1={result.jump.y}
              x2={result.deploy.x}
              y2={result.deploy.y}
              stroke={DROP_COLORS.jump}
              strokeWidth={5 * scale}
              strokeDasharray={`${8 * scale} ${6 * scale}`}
            />
            <line
              x1={result.deploy.x}
              y1={result.deploy.y}
              x2={drop.target.x}
              y2={drop.target.y}
              stroke={DROP_COLORS.deploy}
              strokeWidth={5 * scale}
            />
          </g>
        )}
        {marker(drop.start, DROP_COLORS.bus, "1", "Bus start", "drop-start")}
        {marker(drop.end, DROP_COLORS.bus, "2", "Bus end", "drop-end")}
        {ready &&
          marker(result.jump, DROP_COLORS.jump, "J", "Jump", "drop-jump")}
        {ready &&
          marker(
            result.deploy,
            DROP_COLORS.deploy,
            "G",
            "Deploy",
            "drop-deploy",
          )}
        {marker(drop.target, DROP_COLORS.target, "L", "Landing", "drop-target")}
        <g className="plan-cursor drop-cursor" aria-hidden="true">
          <circle
            cx={cursor.x}
            cy={cursor.y}
            r={20 * scale}
            stroke="white"
            strokeWidth={2 * scale}
            fill="#07132655"
          />
          <path
            d={`M${cursor.x - 28 * scale} ${cursor.y}h${56 * scale} M${cursor.x} ${cursor.y - 28 * scale}v${56 * scale}`}
            stroke="white"
            strokeWidth={2 * scale}
          />
        </g>
      </svg>
      <div className="drop-map-legend" aria-label="Drop map legend">
        {[
          ["bus", "Bus route"],
          ["jump", "Jump / dive"],
          ["deploy", "Deploy / glide"],
          ["target", "Landing"],
        ].map(([key, label]) => (
          <span key={key}>
            <i style={{ background: DROP_COLORS[key] }} />
            {label}
          </span>
        ))}
      </div>
      <p className="comp-hint" id="drop-map-help">
        Choose a placement step, then click or tap the map. Place again to move
        a marker. Zoom in for a closer view; select Pan to drag. Keyboard:
        arrows move the cursor, Shift moves faster, Enter places, +/− zoom. In
        Pan mode, arrows move the view.
      </p>
    </>
  );
}
