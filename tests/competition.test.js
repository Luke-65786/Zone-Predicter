import test from "node:test";
import assert from "node:assert/strict";
import {
  blankPlan,
  blankTracker,
  integer,
  matchScore,
  normalizePlans,
  normalizePractice,
  normalizeScoring,
  normalizeTracker,
  scoreCombinations,
  scoringRules,
  trackerSummary,
} from "../src/competition.js";

test("tracker handles ahead/behind pace, corrected results, exhausted games, and reached goals", () => {
  const tracker = {
    ...blankTracker,
    target: "100",
    games: "4",
    entries: [{ points: "40" }],
  };
  const ahead = trackerSummary(tracker);
  assert.equal(ahead.earned, 40);
  assert.equal(ahead.delta, 15);
  assert.equal(ahead.average, 20);
  assert.equal(
    trackerSummary({ ...tracker, entries: [{ points: "10" }] }).delta,
    -15,
  );
  const finished = trackerSummary({
    ...tracker,
    entries: Array.from({ length: 4 }, () => ({ points: "10" })),
  });
  assert.equal(finished.status, "finished");
  assert.equal(finished.average, null);
  assert.equal(finished.needed, 60);
  assert.equal(
    trackerSummary({ ...tracker, entries: [{ points: "100" }] }).status,
    "achieved",
  );
  assert.equal(
    trackerSummary({ ...tracker, entries: [{ points: "-1" }] }).status,
    "invalid",
  );
  assert.equal(
    trackerSummary({
      ...tracker,
      games: "1",
      entries: [{ points: "20" }, { points: "30" }],
    }).status,
    "invalid",
  );
  assert.equal(trackerSummary(blankTracker).status, "incomplete");
  assert.equal(integer("1.5"), null);
  assert.equal(integer(""), null);
  assert.equal(integer("9007199254740992"), null);
});

test("custom placement rules apply total tier scores and calculate minimum elimination combinations", () => {
  const rules = scoringRules({
    elimination: "2",
    tiers: [
      { rank: "10", points: "5" },
      { rank: "1", points: "20" },
    ],
  });
  assert.deepEqual(matchScore(rules, "1", "3"), {
    placement: 20,
    eliminations: 6,
    total: 26,
  });
  assert.equal(matchScore(rules, "2", "3").total, 11);
  assert.equal(matchScore(rules, "10", "0").placement, 5);
  assert.equal(matchScore(rules, "11", "1").total, 2);
  assert.deepEqual(
    scoreCombinations(rules, "25").map((row) => row.eliminations),
    [3, 10, 13],
  );
  assert.deepEqual(
    scoreCombinations(rules, "0").map((row) => row.eliminations),
    [0, 0, 0],
  );
  assert.equal(matchScore(rules, "101", "2"), null);
});

test("zero elimination scoring and invalid placement rules never divide by zero or fabricate scores", () => {
  const zero = scoringRules({
    elimination: "0",
    tiers: [{ rank: "1", points: "20" }],
  });
  assert.deepEqual(
    scoreCombinations(zero, "20").map((row) => row.eliminations),
    [0, null],
  );
  assert.ok(
    scoringRules({
      elimination: "2",
      tiers: [
        { rank: "1", points: "5" },
        { rank: "10", points: "20" },
      ],
    }).error,
  );
  assert.ok(
    scoringRules({
      elimination: "2",
      tiers: [
        { rank: "1", points: "5" },
        { rank: "1", points: "5" },
      ],
    }).error,
  );
  assert.ok(scoringRules({ elimination: "-1", tiers: [] }).error);
  assert.deepEqual(scoreCombinations({ error: "Bad rules" }, "20"), []);
});

test("saved plans retain independent valid coordinates and discard malformed map data", () => {
  const first = {
    ...blankPlan(),
    name: "Finals",
    landing: { x: 100, y: 900 },
    loot: [
      { x: 200, y: 300 },
      { x: -1, y: 500 },
    ],
  };
  const second = { ...blankPlan(), name: "Cup", landing: { x: 700, y: 800 } };
  const restored = normalizePlans({
    plans: [first, second],
    activeId: second.id,
  });
  assert.equal(restored.plans.length, 2);
  assert.equal(restored.activeId, second.id);
  assert.equal(restored.plans[0].loot.length, 1);
  assert.equal(restored.plans[0].landing.x, 100);
  assert.equal(restored.plans[1].landing.x, 700);
  assert.deepEqual(normalizePlans({ plans: [null, {}] }), {
    plans: [],
    activeId: null,
  });
  assert.equal(normalizePlans({ plans: [first, first] }).plans.length, 1);
});

test("practice sessions preserve independent dates and recover safely from corrupt saved data", () => {
  const practice = normalizePractice({
    sessions: {
      "2026-10-24": { done: ["aim", "aim"], notes: "Track better" },
      "2026-10-25": { done: [] },
      bad: null,
    },
  });
  assert.equal(practice.tasks.length, 5);
  assert.deepEqual(practice.sessions["2026-10-24"].done, ["aim"]);
  assert.deepEqual(practice.sessions["2026-10-25"].done, []);
  assert.equal(Object.keys(practice.sessions).length, 2);
  assert.equal(normalizeTracker(null).entries.length, 0);
  assert.equal(normalizeScoring(null).tiers.length, 0);
  assert.equal(normalizePractice({ tasks: [] }).tasks.length, 0);
});
