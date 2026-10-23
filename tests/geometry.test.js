import test from "node:test";
import assert from "node:assert/strict";
import {
  fitCircle,
  sampleNextCircle,
  planRotation,
  restoreSetup,
  DEFAULT_SETUP,
} from "../src/geometry.js";

test("every sampled next circle stays inside the current circle", () => {
  for (const ratio of [0.2, 0.6, 0.9]) {
    for (let i = 0; i < 500; i++) {
      const next = sampleNextCircle(DEFAULT_SETUP.circle, ratio);
      assert.ok(
        Math.hypot(next.x - 500, next.y - 470) + next.radius <= 310 + 1e-8,
      );
      assert.equal(next.radius, 310 * ratio);
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
      phase: 100,
      ratio: -1,
      player: { x: -100, y: 2000 },
    }),
  );
  assert.equal(setup.phase, 9);
  assert.equal(setup.ratio, 0.2);
  assert.deepEqual(setup.player, { x: 0, y: 1000 });
});
