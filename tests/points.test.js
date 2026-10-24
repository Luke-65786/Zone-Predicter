import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePointsPace,
  gamePlanRows,
  DEFAULT_POINTS_FORM,
} from "../src/points.js";

const pace = (patch) =>
  calculatePointsPace({ ...DEFAULT_POINTS_FORM, ...patch });

test("312 points in 12 games requires 26 points per game", () => {
  const result = pace({});
  assert.equal(result.status, "ready");
  assert.equal(result.average, 26);
  assert.equal(result.pointsNeeded, 312);
  assert.equal(result.gamesLeft, 12);
  const rows = gamePlanRows(result);
  assert.equal(rows.length, 12);
  assert.ok(rows.every((row) => row.points === 26));
  assert.equal(rows.at(-1).runningTotal, 312);
});

test("non-divisible totals use integer game targets that add up exactly", () => {
  const result = pace({ target: "313" });
  assert.equal(result.average, 313 / 12);
  assert.equal(result.higherTargetGames, 1);
  assert.equal(result.higherTarget, 27);
  assert.equal(result.baseTargetGames, 11);
  assert.equal(result.baseTarget, 26);
  assert.equal(
    gamePlanRows(result).reduce((sum, row) => sum + row.points, 0),
    313,
  );
});

test("earned points and played games reduce the remaining requirement independently", () => {
  const result = pace({ current: "100", played: "4" });
  assert.equal(result.pointsNeeded, 212);
  assert.equal(result.gamesLeft, 8);
  assert.equal(result.average, 26.5);
  assert.equal(result.higherTargetGames, 4);
  assert.equal(result.baseTargetGames, 4);
  const rows = gamePlanRows(result);
  assert.deepEqual(rows[0], { game: 5, points: 27, runningTotal: 127 });
  assert.deepEqual(rows.at(-1), { game: 12, points: 26, runningTotal: 312 });
});

test("achieved and exceeded goals do not require negative points", () => {
  for (const current of ["312", "400"]) {
    const result = pace({ current, played: "12" });
    assert.equal(result.status, "achieved");
    assert.equal(result.pointsNeeded, 0);
    assert.equal(result.average, 0);
    assert.equal(result.progress, 1);
    assert.deepEqual(gamePlanRows(result), []);
  }
  assert.equal(pace({ target: "0" }).status, "achieved");
});

test("exhausted games show a shortfall without division by zero", () => {
  const result = pace({ current: "200", played: "12" });
  assert.equal(result.status, "out_of_games");
  assert.equal(result.pointsNeeded, 112);
  assert.equal(result.average, null);
  assert.deepEqual(gamePlanRows(result), []);
});

test("empty, negative, fractional, unsafe, and inconsistent inputs are rejected", () => {
  for (const patch of [
    { target: "" },
    { target: "-1" },
    { current: "0.5" },
    { games: "0" },
    { games: "2.2" },
    { played: "13" },
    { target: "9007199254740992" },
  ]) {
    const result = pace(patch);
    assert.equal(result.status, "invalid");
    assert.ok(Object.keys(result.errors).length > 0);
    assert.deepEqual(gamePlanRows(result), []);
  }
});

test("pagination preserves game numbers and the final total", () => {
  const result = pace({ target: "25", games: "13" });
  const first = gamePlanRows(result, 0, 12);
  const last = gamePlanRows(result, 12, 12);
  assert.equal(first.length, 12);
  assert.equal(first.at(-1).runningTotal, 24);
  assert.deepEqual(last, [{ game: 13, points: 1, runningTotal: 25 }]);
  assert.deepEqual(gamePlanRows(result, 13), []);
  assert.deepEqual(gamePlanRows(result, -1), []);
});

test("goals smaller than the game count remain exact with zero-point games", () => {
  const result = pace({ target: "1", games: "1000" });
  assert.equal(result.average, 0.001);
  assert.equal(result.higherTargetGames, 1);
  assert.equal(result.baseTarget, 0);
  assert.equal(gamePlanRows(result)[0].points, 1);
  assert.equal(gamePlanRows(result, 999)[0].runningTotal, 1);
});
