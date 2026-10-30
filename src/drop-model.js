import { DEFAULT_MAP_ID, normalizeMapId } from "./map-source.js";
import { normalizeLayouts } from "./map-layouts.js";
export const DROP_MAP_KEYS = ["start", "end", "target", "physics"];
export const DROP_PHYSICS_FIELDS = [
  {
    key: "mapWidth",
    label: "Image width (m)",
    value: "8000",
    min: 1000,
    max: 20000,
  },
  {
    key: "busSpeed",
    label: "Bus speed (m/s)",
    value: "100",
    min: 10,
    max: 250,
  },
  {
    key: "busHeight",
    label: "Bus height above landing (m)",
    value: "1000",
    min: 200,
    max: 3000,
  },
  {
    key: "deployHeight",
    label: "Glider deploy height (m)",
    value: "100",
    min: 10,
    max: 1000,
  },
  {
    key: "diveSpeed",
    label: "Dive speed along path (m/s)",
    value: "65",
    min: 10,
    max: 150,
  },
  {
    key: "glideSpeed",
    label: "Glider horizontal speed (m/s)",
    value: "20",
    min: 1,
    max: 75,
  },
  {
    key: "glideDescent",
    label: "Glider descent speed (m/s)",
    value: "5",
    min: 1,
    max: 30,
  },
  {
    key: "maxDiveAngle",
    label: "Maximum dive angle from vertical (°)",
    value: "55",
    min: 10,
    max: 75,
  },
];
export const DEFAULT_DROP_PHYSICS = Object.freeze(
  Object.fromEntries(DROP_PHYSICS_FIELDS.map(({ key, value }) => [key, value])),
);
const text = (value, limit = 80) =>
  typeof value === "string" ? value.slice(0, limit) : "";
export const dropPoint = (p) =>
  p &&
  typeof p.x === "number" &&
  typeof p.y === "number" &&
  Number.isFinite(p.x) &&
  Number.isFinite(p.y) &&
  p.x >= 0 &&
  p.x <= 1000 &&
  p.y >= 0 &&
  p.y <= 1000
    ? { x: p.x, y: p.y }
    : null;

export function blankDrop() {
  return {
    mapId: DEFAULT_MAP_ID,
    mapLayouts: {},
    name: "",
    start: null,
    end: null,
    target: null,
    notes: "",
    physics: { ...DEFAULT_DROP_PHYSICS },
  };
}
export function normalizeDrop(value, includeLayouts = true) {
  const raw = value && typeof value === "object" ? value : {};
  return {
    mapId: normalizeMapId(raw.mapId),
    mapLayouts: includeLayouts
      ? normalizeLayouts(
          raw.mapLayouts,
          (layout) => normalizeDrop(layout, false),
          DROP_MAP_KEYS,
        )
      : {},
    name: text(raw.name),
    start: dropPoint(raw.start),
    end: dropPoint(raw.end),
    target: dropPoint(raw.target),
    notes: text(raw.notes, 2000),
    physics: Object.fromEntries(
      DROP_PHYSICS_FIELDS.map(({ key, value }) => [
        key,
        typeof raw.physics?.[key] === "string" ||
        typeof raw.physics?.[key] === "number"
          ? String(raw.physics[key]).slice(0, 16)
          : value,
      ]),
    ),
  };
}
export function normalizeDropState(value) {
  const raw = value && typeof value === "object" ? value : {};
  const ids = new Set();
  const presets = (Array.isArray(raw.presets) ? raw.presets : [])
    .filter((p) => {
      if (
        !p ||
        typeof p.id !== "string" ||
        !p.id ||
        p.id.length > 100 ||
        ids.has(p.id)
      )
        return false;
      ids.add(p.id);
      return true;
    })
    .slice(0, 30)
    .map((p) => ({ id: p.id, ...normalizeDrop(p) }));
  const active = presets.find((p) => p.id === raw.activeId);
  return {
    version: 1,
    current: normalizeDrop(active ?? raw.current),
    presets,
    activeId: active?.id ?? null,
  };
}
export function readDropPhysics(physics) {
  const values = {},
    errors = {};
  for (const { key, label, min, max } of DROP_PHYSICS_FIELDS) {
    const raw = physics?.[key];
    const n =
      typeof raw === "number" || (typeof raw === "string" && raw.trim() !== "")
        ? Number(raw)
        : NaN;
    if (!Number.isFinite(n) || n < min || n > max)
      errors[key] = `${label}: use ${min}–${max}.`;
    else values[key] = n;
  }
  if (values.deployHeight >= values.busHeight)
    errors.deployHeight = "Glider deploy height must be below the bus height.";
  return { values, errors };
}

// Flat-ground, two-stage descent model. Speeds and image scale are user assumptions.
// Dive at constant path speed, then descend at constant glider vertical speed.
// Use the glider's available horizontal range before adding diagonal dive distance.
export function estimateDrop(drop) {
  const { values: p, errors } = readDropPhysics(drop.physics);
  if (Object.keys(errors).length) return { status: "invalid", errors };
  const start = dropPoint(drop.start),
    end = dropPoint(drop.end),
    target = dropPoint(drop.target);
  if (!start || !end || !target) return { status: "incomplete" };
  const scale = p.mapWidth / 1000;
  const dx = end.x - start.x,
    dy = end.y - start.y;
  const length = Math.hypot(dx, dy),
    routeMeters = length * scale;
  if (routeMeters < 50)
    return {
      status: "route-error",
      message: "Place bus start and end at least 50 m apart in this model.",
    };
  const height = p.busHeight - p.deployHeight;
  const glideTime = p.deployHeight / p.glideDescent;
  const glideRange = glideTime * p.glideSpeed;
  const maxDiveRange = height * Math.tan((p.maxDiveAngle * Math.PI) / 180);
  const maxReachMeters = maxDiveRange + glideRange;
  const projection =
    ((target.x - start.x) * dx + (target.y - start.y) * dy) / length ** 2;
  const closestT = Math.max(0, Math.min(1, projection));
  const distanceAt = (t) =>
    Math.hypot(start.x + t * dx - target.x, start.y + t * dy - target.y) *
    scale;
  const closestDistanceMeters = distanceAt(closestT);
  const reach = maxReachMeters / scale;
  const perpendicular2 = Math.max(
    0,
    (target.x - start.x) ** 2 +
      (target.y - start.y) ** 2 -
      (projection * length) ** 2,
  );
  const halfInterval =
    Math.sqrt(Math.max(0, reach ** 2 - perpendicular2)) / length;
  const lower = Math.max(0, projection - halfInterval),
    upper = Math.min(1, projection + halfInterval);
  if (closestDistanceMeters > maxReachMeters + 1e-7 || lower > upper)
    return { status: "unreachable", closestDistanceMeters, maxReachMeters };
  const flightAt = (t) =>
    Math.hypot(height, Math.max(0, distanceAt(t) - glideRange)) / p.diveSpeed +
    glideTime;
  const arrivalAt = (t) => (t * routeMeters) / p.busSpeed + flightAt(t);
  // The objective is convex on the feasible bus segment. Include its endpoints
  // explicitly so entry/exit and maximum-range solutions are never lost.
  let left = lower,
    right = upper;
  for (let i = 0; i < 80; i++) {
    const a = left + (right - left) / 3,
      b = right - (right - left) / 3;
    if (arrivalAt(a) <= arrivalAt(b)) right = b;
    else left = a;
  }
  const candidates = [lower, upper, (left + right) / 2];
  const progress = candidates.reduce(
    (best, t) => (arrivalAt(t) < arrivalAt(best) ? t : best),
    lower,
  );
  const jump = { x: start.x + progress * dx, y: start.y + progress * dy };
  const horizontalMeters = distanceAt(progress);
  const diveMeters = Math.max(0, horizontalMeters - glideRange);
  const ratio = horizontalMeters > 0 ? diveMeters / horizontalMeters : 0;
  const deploy = {
    x: jump.x + (target.x - jump.x) * ratio,
    y: jump.y + (target.y - jump.y) * ratio,
  };
  const diveTime = Math.hypot(height, diveMeters) / p.diveSpeed;
  const jumpAfter = (progress * routeMeters) / p.busSpeed;
  return {
    status: "ready",
    jump,
    deploy,
    progress,
    routeMeters,
    jumpAfter,
    diveTime,
    glideTime,
    flightTime: diveTime + glideTime,
    deployAfter: jumpAfter + diveTime,
    landAfter: jumpAfter + diveTime + glideTime,
    horizontalMeters,
    diveMeters,
    glideMeters: horizontalMeters - diveMeters,
    maxReachMeters,
    heading:
      horizontalMeters > 1e-7
        ? ((Math.atan2(target.x - jump.x, jump.y - target.y) * 180) / Math.PI +
            360) %
          360
        : null,
  };
}
