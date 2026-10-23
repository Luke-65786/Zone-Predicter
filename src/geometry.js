export const MAP_SIZE = 1000;

export const DEFAULT_SETUP = Object.freeze({
  circle: Object.freeze({ x: 500, y: 470, radius: 310 }),
  player: Object.freeze({ x: 315, y: 650 }),
  phase: 3,
  ratio: 0.6,
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
      setup.circle?.radius,
      setup.player?.x,
      setup.player?.y,
      setup.phase,
      setup.ratio,
    ];
    if (!numbers.every(Number.isFinite)) return null;
    return {
      circle: fitCircle(setup.circle),
      player: {
        x: clamp(setup.player.x, 0, MAP_SIZE),
        y: clamp(setup.player.y, 0, MAP_SIZE),
      },
      phase: clamp(Math.round(setup.phase), 1, 9),
      ratio: clamp(setup.ratio, 0.2, 0.9),
    };
  } catch {
    return null;
  }
}
