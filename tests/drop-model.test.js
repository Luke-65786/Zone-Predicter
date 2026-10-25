import test from "node:test";
import assert from "node:assert/strict";
import {
  blankDrop,
  DEFAULT_DROP_PHYSICS,
  estimateDrop,
  normalizeDropState,
  readDropPhysics,
} from "../src/drop-model.js";

const close = (a, b, tolerance = 1e-6) =>
  assert.ok(
    Math.abs(a - b) <= tolerance,
    `${a} should be within ${tolerance} of ${b}`,
  );
const fixture = (values = {}) => ({
  ...blankDrop(),
  start: { x: 0, y: 500 },
  end: { x: 1000, y: 500 },
  target: { x: 600, y: 600 },
  ...values,
});

test("drop estimates wait for all three map points and reject a degenerate bus route", () => {
  assert.equal(estimateDrop(blankDrop()).status, "incomplete");
  assert.equal(estimateDrop(fixture({ target: null })).status, "incomplete");
  assert.equal(
    estimateDrop(fixture({ end: { x: 0, y: 500 } })).status,
    "route-error",
  );
  assert.equal(
    estimateDrop(fixture({ target: { x: NaN, y: 0 } })).status,
    "incomplete",
  );
});

test("a landing directly below bus entry has a zero wait and a vertical dive", () => {
  const result = estimateDrop(fixture({ target: { x: 0, y: 500 } }));
  assert.equal(result.status, "ready");
  close(result.jumpAfter, 0);
  close(result.progress, 0);
  close(result.diveTime, 900 / 65);
  close(result.glideTime, 20);
  close(result.landAfter, 900 / 65 + 20);
  assert.deepEqual(result.jump, { x: 0, y: 500 });
  assert.deepEqual(result.deploy, result.jump);
  assert.equal(result.heading, null);
});

test("the optimized jump beats independent dense sampling and obeys descent limits", () => {
  for (const target of [
    { x: 600, y: 600 },
    { x: 10, y: 500 },
    { x: 980, y: 700 },
    { x: 200, y: 300 },
  ]) {
    const drop = fixture({ target });
    const result = estimateDrop(drop);
    assert.equal(result.status, "ready");
    let sampled = Infinity;
    for (let i = 0; i <= 20000; i++) {
      const t = i / 20000;
      const distance = Math.hypot(t * 1000 - target.x, 500 - target.y) * 8;
      if (distance > 900 * Math.tan((55 * Math.PI) / 180) + 400) continue;
      const flight =
        Math.sqrt(900 ** 2 + Math.max(0, distance - 400) ** 2) / 65 + 20;
      sampled = Math.min(sampled, 80 * t + flight);
    }
    assert.ok(result.landAfter <= sampled + 1e-7);
    close(result.landAfter, sampled, 0.02);
    close(result.jump.y, 500);
    close(result.jump.x / 1000, result.progress);
    close(
      Math.hypot(result.deploy.x - target.x, result.deploy.y - target.y) * 8,
      result.glideMeters,
    );
    assert.ok(result.glideMeters <= 400 + 1e-6);
    assert.ok(
      (Math.atan2(result.diveMeters, 900) * 180) / Math.PI <= 55 + 1e-6,
    );
    close(result.deployAfter, result.jumpAfter + result.diveTime);
    close(result.landAfter, result.deployAfter + result.glideTime);
  }
});

test("routes in any direction and reversed routes use their actual start point", () => {
  const first = fixture();
  const original = estimateDrop(first);
  const rotate = (p) => ({ x: 1000 - p.y, y: p.x });
  const rotated = estimateDrop(
    fixture({
      start: rotate(first.start),
      end: rotate(first.end),
      target: rotate(first.target),
    }),
  );
  close(rotated.jumpAfter, original.jumpAfter);
  close(rotated.landAfter, original.landAfter);
  close(rotated.jump.x, rotate(original.jump).x);
  close(rotated.jump.y, rotate(original.jump).y);
  close(rotated.heading, (original.heading + 90) % 360);
  const reversed = estimateDrop(
    fixture({ start: first.end, end: first.start }),
  );
  assert.equal(reversed.status, "ready");
  assert.ok(reversed.jump.x > first.target.x);
  assert.ok(original.jump.x < first.target.x);
  assert.ok(reversed.jumpAfter < original.jumpAfter);
});

test("out-of-range targets and targets beyond a route endpoint do not get a false path", () => {
  assert.equal(
    estimateDrop(fixture({ target: { x: 500, y: 0 } })).status,
    "unreachable",
  );
  const drop = fixture({
    start: { x: 500, y: 500 },
    end: { x: 600, y: 500 },
    target: { x: 0, y: 500 },
  });
  const result = estimateDrop(drop);
  assert.equal(result.status, "unreachable");
  close(result.closestDistanceMeters, 4000);
  assert.ok(result.closestDistanceMeters > result.maxReachMeters);
  assert.equal(
    estimateDrop(
      fixture({
        start: { x: 400, y: 500 },
        end: { x: 500, y: 500 },
        target: { x: 600, y: 500 },
      }),
    ).status,
    "ready",
  );
});

test("timing assumptions validate blanks, finite bounds, and deploy height before any result", () => {
  for (const value of [
    "",
    " ",
    "0",
    "-1",
    "Infinity",
    "NaN",
    "bad",
    10000,
    null,
  ]) {
    const physics = { ...DEFAULT_DROP_PHYSICS, busSpeed: value };
    assert.ok(readDropPhysics(physics).errors.busSpeed);
    assert.equal(estimateDrop(fixture({ physics })).status, "invalid");
  }
  const physics = {
    ...DEFAULT_DROP_PHYSICS,
    busHeight: "500",
    deployHeight: "500",
  };
  assert.match(readDropPhysics(physics).errors.deployHeight, /below/);
  assert.equal(estimateDrop(fixture({ physics })).status, "invalid");
  assert.deepEqual(readDropPhysics(DEFAULT_DROP_PHYSICS).errors, {});
  assert.equal(
    estimateDrop(
      fixture({ physics: { ...DEFAULT_DROP_PHYSICS, busSpeed: "75.5" } }),
    ).status,
    "ready",
  );
});

test("saved drop normalization bounds profiles, deduplicates IDs, and restores the active drop", () => {
  assert.deepEqual(normalizeDropState(null), {
    version: 1,
    current: blankDrop(),
    presets: [],
    activeId: null,
  });
  const normalized = normalizeDropState({
    current: { name: "Draft", target: { x: -1, y: 5 } },
    presets: [
      null,
      {
        id: "a",
        name: "Active",
        start: { x: 100, y: 200 },
        physics: { busSpeed: 90 },
      },
      { id: "a", name: "Duplicate" },
      { id: "b", notes: "a".repeat(3000) },
    ],
    activeId: "a",
  });
  assert.equal(normalized.presets.length, 2);
  assert.equal(normalized.current.name, "Active");
  assert.equal(normalized.current.physics.busSpeed, "90");
  assert.equal(normalized.current.physics.mapWidth, "8000");
  assert.equal(normalized.presets[1].notes.length, 2000);
  assert.equal(
    normalizeDropState({
      current: { target: { x: 10, y: Infinity } },
      activeId: "missing",
    }).current.target,
    null,
  );
  assert.equal(
    normalizeDropState({
      presets: Array.from({ length: 50 }, (_, i) => ({ id: String(i) })),
    }).presets.length,
    30,
  );
});
