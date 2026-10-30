import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DEFAULT_MAP_ID, getMap } from "../src/map-source.js";
import { switchIsland } from "../src/map-layouts.js";
import { blankDrop, normalizeDrop, DROP_MAP_KEYS } from "../src/drop-model.js";
import {
  blankPlan,
  normalizePlans,
  PLAN_MAP_KEYS,
} from "../src/competition.js";
import { NIGHTMARE_POIS } from "../src/map-pois.js";

test("Nightmare Island uses the supplied image and its own ten POI anchors", async () => {
  const map = getMap("nightmare-reload");
  assert.equal(map.source, null);
  const bytes = await readFile(
    new URL(`../public/${map.path}`, import.meta.url),
  );
  assert.equal(bytes.readUInt32BE(16), 786);
  assert.equal(bytes.readUInt32BE(20), 809);
  assert.equal(NIGHTMARE_POIS.length, 10);
  assert.ok(
    NIGHTMARE_POIS.every(
      (p) => p.x >= 0 && p.x <= 1000 && p.y >= 0 && p.y <= 1000,
    ),
  );
  assert.equal(getMap("unknown").id, DEFAULT_MAP_ID);
});

test("drop routes and model assumptions stay with their island across reloads", () => {
  let drop = { ...blankDrop(), start: { x: 100, y: 100 } };
  drop = {
    ...drop,
    ...switchIsland(drop, "nightmare-reload", blankDrop(), DROP_MAP_KEYS),
  };
  assert.equal(drop.start, null);
  drop.start = { x: 700, y: 800 };
  drop.physics = { ...drop.physics, mapWidth: "3200" };
  drop = normalizeDrop(drop);
  drop = {
    ...drop,
    ...switchIsland(drop, DEFAULT_MAP_ID, blankDrop(), DROP_MAP_KEYS),
  };
  assert.equal(drop.start.x, 100);
  assert.equal(drop.physics.mapWidth, "8000");
  drop = normalizeDrop(drop);
  drop = {
    ...drop,
    ...switchIsland(drop, "nightmare-reload", blankDrop(), DROP_MAP_KEYS),
  };
  assert.equal(drop.start.x, 700);
  assert.equal(drop.physics.mapWidth, "3200");
  const cleaned = normalizeDrop({
    mapId: "bad",
    mapLayouts: { bad: {}, "nightmare-reload": { start: { x: -5, y: 0 } } },
  });
  assert.equal(cleaned.mapId, DEFAULT_MAP_ID);
  assert.equal(cleaned.mapLayouts["nightmare-reload"].start, null);
  assert.equal(cleaned.mapLayouts.bad, undefined);
});

test("tournament island layouts preserve routes and migrate legacy plans", () => {
  let plan = {
    ...blankPlan(),
    landing: { x: 200, y: 300 },
    loot: [{ x: 300, y: 400 }],
  };
  plan = {
    ...plan,
    ...switchIsland(plan, "nightmare-reload", blankPlan(), PLAN_MAP_KEYS),
  };
  assert.equal(plan.landing, null);
  assert.deepEqual(plan.loot, []);
  plan.landing = { x: 600, y: 700 };
  plan = normalizePlans({ plans: [plan] }).plans[0];
  plan = {
    ...plan,
    ...switchIsland(plan, DEFAULT_MAP_ID, blankPlan(), PLAN_MAP_KEYS),
  };
  assert.equal(plan.landing.x, 200);
  assert.equal(plan.loot.length, 1);
  const legacy = normalizePlans({
    plans: [{ id: "legacy", landing: { x: 30, y: 40 } }],
  }).plans[0];
  assert.equal(legacy.mapId, DEFAULT_MAP_ID);
  assert.equal(legacy.landing.x, 30);
});
