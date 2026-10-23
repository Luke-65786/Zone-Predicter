import test from "node:test";
import assert from "node:assert/strict";
import {
  fitCircle,
  sampleNextCircle,
  planRotation,
  restoreSetup,
  DEFAULT_SETUP,
  sampleZonePath,
  forecastZone4,
  fitZone1,
  ZONE1_RADIUS,
  ZONE_RADIUS_RATIO,
  estimateZoneSides,
} from "../src/geometry.js";

test("every sampled next circle stays inside the current circle", () => {
  for (const ratio of [0.2, 0.6, 0.9]) {
    for (let i = 0; i < 500; i++) {
      const next = sampleNextCircle(DEFAULT_SETUP.circle, ratio);
      assert.ok(
        Math.hypot(next.x - 500, next.y - 470) + next.radius <=
          DEFAULT_SETUP.circle.radius + 1e-8,
      );
      assert.equal(next.radius, DEFAULT_SETUP.circle.radius * ratio);
    }
  }
});

test("center sampling uses square root of radial probability for uniform area", () => {
  const values = [0, 0.25];
  const next = sampleNextCircle({ x: 500, y: 500, radius: 300 }, 0.5, () =>
    values.shift(),
  );
  assert.deepEqual(next, { x: 575, y: 500, radius: 150 });
});

test("circle editing keeps the entire current circle on the map", () => {
  assert.deepEqual(fitCircle({ x: -20, y: 980, radius: 300 }), {
    x: 300,
    y: 700,
    radius: 300,
  });
  assert.deepEqual(fitCircle({ x: 0, y: 0, radius: 1000 }), {
    x: 500,
    y: 500,
    radius: 500,
  });
});

test("rotation ends inside the sampled circle and handles an already safe player", () => {
  const circle = { x: 500, y: 500, radius: 200 };
  const route = planRotation({ x: 100, y: 500 }, circle);
  assert.equal(route.inside, false);
  assert.equal(route.distance, 222);
  assert.deepEqual(route.target, { x: 322, y: 500 });
  assert.ok(
    Math.hypot(route.target.x - 500, route.target.y - 500) < circle.radius,
  );
  assert.deepEqual(planRotation({ x: 500, y: 500 }, circle), {
    inside: true,
    distance: 0,
    target: { x: 500, y: 500 },
  });
});

test("saved setup restores, sanitizes limits, and rejects malformed data", () => {
  assert.deepEqual(restoreSetup(JSON.stringify(DEFAULT_SETUP)), DEFAULT_SETUP);
  assert.equal(restoreSetup("broken"), null);
  assert.equal(restoreSetup('{"circle":{}}'), null);
  const setup = restoreSetup(
    JSON.stringify({
      ...DEFAULT_SETUP,
      ratio: -1,
      player: { x: -100, y: 2000 },
    }),
  );
  assert.equal(setup.ratio, ZONE_RADIUS_RATIO);
  assert.equal(setup.circle.radius, ZONE1_RADIUS);
  assert.deepEqual(setup.player, { x: 0, y: 1000 });
});

test("zone 1 to zone 4 uses exactly three fully nested transitions", () => {
  for (const ratio of [0.2, 0.65, 0.9]) {
    for (let i = 0; i < 100; i++) {
      const path = sampleZonePath(DEFAULT_SETUP.circle, ratio);
      assert.equal(path.length, 4);
      assert.deepEqual(path[0], DEFAULT_SETUP.circle);
      for (let zone = 1; zone < 4; zone++) {
        assert.ok(
          Math.hypot(
            path[zone].x - path[zone - 1].x,
            path[zone].y - path[zone - 1].y,
          ) +
            path[zone].radius <=
            path[zone - 1].radius + 1e-8,
        );
      }
      assert.ok(
        Math.abs(path[3].radius - DEFAULT_SETUP.circle.radius * ratio ** 3) <
          1e-8,
      );
    }
  }
});

test("forecast bins all 2,000 centers and draws an actual nested representative path", () => {
  let seed = 12;
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const forecast = forecastZone4(DEFAULT_SETUP.circle, 0.65, random);
  assert.equal(forecast.count, 2000);
  assert.equal(
    forecast.density.reduce((sum, cell) => sum + cell.count, 0),
    2000,
  );
  assert.ok(
    forecast.coverageRadius > 0 &&
      forecast.coverageRadius < DEFAULT_SETUP.circle.radius,
  );
  assert.ok(
    forecast.density.every((cell) => cell.intensity > 0 && cell.intensity <= 1),
  );
  for (let zone = 1; zone < 4; zone++) {
    const previous = forecast.path[zone - 1],
      next = forecast.path[zone];
    assert.ok(
      Math.hypot(next.x - previous.x, next.y - previous.y) + next.radius <=
        previous.radius + 1e-8,
    );
  }
  assert.throws(() => forecastZone4(DEFAULT_SETUP.circle, 0.65, random, 0));
});

test("80% coverage uses the empirical 80th percentile of simulated centers", () => {
  // Five final centers are 0, 10, 20, 30, and 100 units to the right.
  // Their mean offset is 32; distances are 32, 22, 12, 2, and 68.
  const draws = [0, 10, 20, 30, 100].flatMap((offset) => [
    0,
    (offset / 150) ** 2,
    0,
    0,
    0,
    0,
  ]);
  const forecast = forecastZone4(
    { x: 500, y: 500, radius: 300 },
    0.5,
    () => draws.shift(),
    5,
  );
  assert.equal(forecast.coverageRadius, 32);
  assert.deepEqual(forecast.center, { x: 532, y: 500 });
  assert.equal(forecast.path[3].x, 530);
});

test("zone 1 placement and legacy settings keep the requested fixed radius and shrink", () => {
  assert.deepEqual(fitZone1({ x: -100, y: 1000, radius: 50 }), {
    x: 320,
    y: 680,
    radius: 320,
  });
  const restored = restoreSetup(
    JSON.stringify({
      circle: { x: 100, y: 900, radius: 75 },
      ratio: 0.9,
      hasZone1: true,
      player: { x: 350, y: 500 },
    }),
  );
  assert.deepEqual(restored.circle, { x: 320, y: 680, radius: 320 });
  assert.equal(restored.ratio, 0.6);
  assert.equal(restored.hasZone1, true);
  const zone4 = forecastZone4(restored.circle, restored.ratio, () => 0.25, 10)
    .path[3];
  assert.ok(Math.abs(zone4.radius - 69.12) < 1e-8);
});

test("green faces the fewest POIs even when they are closer or inside zone 4", () => {
  const circle = { x: 500, y: 500, radius: 30 };
  const pois = [
    { name: "West A", x: 100, y: 450 },
    { name: "West B", x: 100, y: 500 },
    { name: "West C", x: 100, y: 550 },
    { name: "East", x: 510, y: 500 },
  ];
  const sides = estimateZoneSides(circle, pois);
  assert.equal(sides.status, "ready");
  assert.equal(sides.deadsideCount, 1);
  assert.equal(sides.congestedCount, 3);
  assert.deepEqual(sides.deadsideNames, ["East"]);
  assert.ok(sides.deadside.x > circle.x);
  assert.ok(sides.congested.x < circle.x);
  assert.ok(Math.abs(sides.angle) < 1e-8);
  assert.equal(
    estimateZoneSides(circle, [...pois].reverse()).angle,
    sides.angle,
  );
});

test("adding POIs changes the chosen deadside instead of using a previous-circle direction", () => {
  const circle = { x: 500, y: 500, radius: 69.12 };
  const pois = [
    ...Array.from({ length: 3 }, (_, i) => ({
      name: `East ${i}`,
      x: 700,
      y: 500,
    })),
    { name: "West 0", x: 300, y: 500 },
  ];
  const original = estimateZoneSides(circle, pois);
  assert.equal(original.deadsideCount, 1);
  assert.ok(original.deadside.x < circle.x);
  const updated = estimateZoneSides(circle, [
    ...pois,
    ...Array.from({ length: 3 }, (_, i) => ({
      name: `West ${i + 1}`,
      x: 300,
      y: 500,
    })),
  ]);
  assert.equal(updated.deadsideCount, 3);
  assert.equal(updated.congestedCount, 4);
  assert.ok(updated.deadside.x > circle.x);
});

test("POI counting and facing directions work in all map quadrants", () => {
  const circle = { x: 500, y: 500, radius: 60 };
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const point = (name, sign) => ({
      name,
      x: 500 + sign * direction.x * 200,
      y: 500 + sign * direction.y * 200,
    });
    const sides = estimateZoneSides(circle, [
      point("Few", 1),
      point("Many A", -1),
      point("Many B", -1),
      point("Many C", -1),
    ]);
    assert.equal(sides.deadsideCount, 1);
    assert.equal(sides.congestedCount, 3);
    assert.ok(
      (sides.deadside.x - circle.x) * direction.x +
        (sides.deadside.y - circle.y) * direction.y >
        0,
    );
  }
});

test("equal opposing POI counts stay balanced without an arbitrary colored direction", () => {
  const circle = { x: 500, y: 500, radius: 60 };
  const result = estimateZoneSides(circle, [
    { name: "East", x: 600, y: 500 },
    { name: "West", x: 400, y: 500 },
    { name: "North", x: 500, y: 400 },
    { name: "South", x: 500, y: 600 },
  ]);
  assert.equal(result.status, "balanced");
  assert.equal(result.deadsideCount, 2);
  assert.equal(result.congestedCount, 2);
  assert.equal(result.angle, undefined);
});

test("missing and exactly centered POIs do not fabricate a directional preference", () => {
  const circle = { x: 500, y: 500, radius: 60 };
  assert.equal(estimateZoneSides(circle, []).status, "no_pois");
  const centered = estimateZoneSides(circle, [
    { name: "Center", x: 500, y: 500 },
  ]);
  assert.equal(centered.status, "no_pois");
  assert.equal(centered.neutralCount, 1);
  const result = estimateZoneSides(circle, [
    { name: "Center", x: 500, y: 500 },
    { name: "East", x: 600, y: 500 },
  ]);
  assert.equal(result.status, "ready");
  assert.equal(result.deadsideCount, 0);
  assert.equal(result.congestedCount, 1);
  assert.equal(result.neutralCount, 1);
  assert.equal(
    result.deadsideCount + result.congestedCount + result.neutralCount,
    result.total,
  );
});
