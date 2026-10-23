export const MAP_SIZE = 1000;
export const ZONE1_RADIUS = MAP_SIZE * 0.32;
export const ZONE_RADIUS_RATIO = 0.6;

export const DEFAULT_SETUP = Object.freeze({
  circle: Object.freeze({ x: 500, y: 470, radius: ZONE1_RADIUS }),
  player: Object.freeze({ x: 315, y: 650 }),
  ratio: ZONE_RADIUS_RATIO,
  hasZone1: false,
});

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function fitCircle(circle) {
  const radius = clamp(circle.radius, 50, MAP_SIZE / 2);
  return {
    x: clamp(circle.x, radius, MAP_SIZE - radius),
    y: clamp(circle.y, radius, MAP_SIZE - radius),
    radius,
  };
}

export function fitZone1(position) {
  return fitCircle({ ...position, radius: ZONE1_RADIUS });
}

// Short-rotation heuristic: the side pointing away from the previous center
// has less space between the new and old edges. It is only a geometric proxy
// for deadside, not measured player traffic. Near-centered pulls have no
// meaningful preferred side, so do not invent a red/green direction for them.
export function estimateZoneSides(previous, next) {
  const dx = next.x - previous.x;
  const dy = next.y - previous.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= previous.radius * 0.05) return null;
  const direction = { x: dx / distance, y: dy / distance };
  return {
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
    deadside: {
      x: next.x + direction.x * next.radius * 0.6,
      y: next.y + direction.y * next.radius * 0.6,
    },
    congested: {
      x: next.x - direction.x * next.radius * 0.6,
      y: next.y - direction.y * next.radius * 0.6,
    },
  };
}

// Uniform sampling of center positions for a user-defined, fully nested circle.
// This is a geometric scenario model, not Fortnite's server-side storm algorithm.
export function sampleNextCircle(circle, ratio, random = Math.random) {
  const radius = circle.radius * clamp(ratio, 0.2, 0.9);
  const angle = random() * Math.PI * 2;
  const distance = Math.sqrt(random()) * (circle.radius - radius);
  return {
    x: circle.x + Math.cos(angle) * distance,
    y: circle.y + Math.sin(angle) * distance,
    radius,
  };
}

export const SIMULATION_COUNT = 2000;

export function sampleZonePath(circle, ratio, random = Math.random) {
  const path = [{ ...circle }];
  for (let zone = 2; zone <= 4; zone++) {
    path.push(sampleNextCircle(path.at(-1), ratio, random));
  }
  return path;
}

// Empirical coverage describes this explicit geometric model only. It is not
// a calibrated probability for Fortnite, which does not expose future zones.
export function forecastZone4(
  circle,
  ratio,
  random = Math.random,
  count = SIMULATION_COUNT,
) {
  if (!Number.isInteger(count) || count < 1)
    throw new Error("A positive simulation count is required.");
  const paths = Array.from({ length: count }, () =>
    sampleZonePath(circle, ratio, random),
  );
  const finals = paths.map((path) => path[3]);
  const center = {
    x: finals.reduce((sum, zone) => sum + zone.x, 0) / count,
    y: finals.reduce((sum, zone) => sum + zone.y, 0) / count,
  };
  const distances = finals
    .map((zone) => Math.hypot(zone.x - center.x, zone.y - center.y))
    .sort((a, b) => a - b);
  const coverageRadius = distances[Math.ceil(count * 0.8) - 1];
  const cells = new Map();
  const cellSize = 20;
  for (const zone of finals) {
    const x = Math.floor(zone.x / cellSize) * cellSize;
    const y = Math.floor(zone.y / cellSize) * cellSize;
    const key = `${x}:${y}`;
    const cell = cells.get(key) || { x, y, count: 0 };
    cell.count++;
    cells.set(key, cell);
  }
  const density = [...cells.values()];
  const maxCount = Math.max(...density.map((cell) => cell.count));
  // Display an actual sampled path, choosing its zone 4 nearest the ensemble
  // center, so every displayed intermediate circle remains fully nested.
  let representativeIndex = 0;
  let nearest = Infinity;
  finals.forEach((zone, index) => {
    const distance = Math.hypot(zone.x - center.x, zone.y - center.y);
    if (distance < nearest) {
      nearest = distance;
      representativeIndex = index;
    }
  });
  return {
    path: paths[representativeIndex],
    center,
    coverageRadius,
    density: density.map((cell) => ({
      ...cell,
      intensity: cell.count / maxCount,
    })),
    count,
    cellSize,
  };
}

export function planRotation(player, circle) {
  const dx = player.x - circle.x;
  const dy = player.y - circle.y;
  const distance = Math.hypot(dx, dy);
  const inside = distance <= circle.radius;
  // Aim slightly inside the edge so the destination is clearly in the circle.
  const targetRadius = Math.max(0, circle.radius - 22);
  const factor = distance ? Math.min(1, targetRadius / distance) : 0;
  return {
    inside,
    distance: inside ? 0 : distance - targetRadius,
    target: inside
      ? { ...player }
      : {
          x: circle.x + dx * factor,
          y: circle.y + dy * factor,
        },
  };
}

export function restoreSetup(raw) {
  try {
    const setup = JSON.parse(raw);
    const numbers = [
      setup.circle?.x,
      setup.circle?.y,
      setup.player?.x,
      setup.player?.y,
    ];
    if (!numbers.every(Number.isFinite)) return null;
    return {
      circle: fitZone1(setup.circle),
      player: {
        x: clamp(setup.player.x, 0, MAP_SIZE),
        y: clamp(setup.player.y, 0, MAP_SIZE),
      },
      ratio: ZONE_RADIUS_RATIO,
      hasZone1: setup.hasZone1 === true,
    };
  } catch {
    return null;
  }
}
