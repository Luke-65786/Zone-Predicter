import { DEFAULT_MAP_ID, normalizeMapId } from "./map-source.js";
import { normalizeLayouts } from "./map-layouts.js";
export const PLAN_MAP_KEYS = [
  "landing",
  "backup",
  "loot",
  "rotation",
  "positions",
];
const normalizePlanLayout = (p) => ({
  landing: point(p.landing),
  backup: point(p.backup),
  loot: points(p.loot, 300),
  rotation: points(p.rotation, 300),
  positions: points(p.positions, 50),
});
export const integer = (raw, min = 0, max = 1_000_000) => {
  const text = String(raw ?? "").trim();
  const value = Number(text);
  return /^\d+$/.test(text) &&
    Number.isSafeInteger(value) &&
    value >= min &&
    value <= max
    ? value
    : null;
};
export const uid = () => crypto.randomUUID();
export const format = (value) =>
  new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value);
const text = (value, limit = 4000) =>
  typeof value === "string" ? value.slice(0, limit) : "";
const point = (p) =>
  p &&
  Number.isFinite(p.x) &&
  Number.isFinite(p.y) &&
  p.x >= 0 &&
  p.x <= 1000 &&
  p.y >= 0 &&
  p.y <= 1000
    ? { x: p.x, y: p.y, label: text(p.label, 80) }
    : null;
const points = (value, limit) =>
  Array.isArray(value) ? value.slice(0, limit).map(point).filter(Boolean) : [];

export const blankPlan = () => ({
  mapId: DEFAULT_MAP_ID,
  mapLayouts: {},
  id: uid(),
  name: "",
  date: "",
  mode: "Solo",
  target: "",
  games: "",
  dropNotes: "",
  rotationNotes: "",
  landing: null,
  backup: null,
  loot: [],
  rotation: [],
  positions: [],
});
export function normalizePlans(raw) {
  const plans = Array.isArray(raw?.plans)
    ? raw.plans
        .slice(0, 50)
        .filter((p) => p && typeof p.id === "string" && p.id.length <= 80)
        .map((p) => ({
          mapId: normalizeMapId(p.mapId),
          mapLayouts: normalizeLayouts(
            p.mapLayouts,
            normalizePlanLayout,
            PLAN_MAP_KEYS,
          ),
          id: p.id,
          name: text(p.name, 80),
          date: /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : "",
          mode: ["Solo", "Duo", "Trio", "Squad"].includes(p.mode)
            ? p.mode
            : "Solo",
          target: text(p.target, 16),
          games: text(p.games, 16),
          dropNotes: text(p.dropNotes),
          rotationNotes: text(p.rotationNotes),
          landing: point(p.landing),
          backup: point(p.backup),
          loot: points(p.loot, 300),
          rotation: points(p.rotation, 300),
          positions: points(p.positions, 50),
        }))
    : [];
  const unique = plans.filter(
    (p, i) => plans.findIndex((other) => other.id === p.id) === i,
  );
  return {
    plans: unique,
    activeId: unique.some((p) => p.id === raw?.activeId)
      ? raw.activeId
      : (unique[0]?.id ?? null),
  };
}

export const blankTracker = { name: "", target: "", games: "", entries: [] };
export function normalizeTracker(raw) {
  return {
    name: text(raw?.name, 80),
    target: text(raw?.target, 16),
    games: text(raw?.games, 16),
    entries: Array.isArray(raw?.entries)
      ? raw.entries
          .slice(0, 200)
          .filter((e) => e && typeof e.id === "string")
          .map((e) => ({
            id: e.id,
            points: text(e.points, 16),
            finish: text(e.finish, 4),
            eliminations: text(e.eliminations, 8),
            notes: text(e.notes, 300),
          }))
      : [],
  };
}
export function trackerSummary(tracker) {
  const target = integer(tracker.target);
  const games = integer(tracker.games, 1, 200);
  if (target === null || games === null) return { status: "incomplete" };
  const scores = tracker.entries.map((e) => integer(e.points));
  if (scores.some((n) => n === null))
    return { status: "invalid", message: "Check the points in your game log." };
  if (scores.length > games)
    return {
      status: "invalid",
      message: "Your game allowance is smaller than your game log.",
    };
  const earned = scores.reduce((a, b) => a + b, 0);
  const played = scores.length;
  const remaining = games - played;
  const needed = Math.max(0, target - earned);
  return {
    status: needed === 0 ? "achieved" : remaining === 0 ? "finished" : "ready",
    target,
    games,
    earned,
    played,
    remaining,
    needed,
    delta: earned - (target * played) / games,
    average: remaining ? needed / remaining : null,
    progress: target ? Math.min(1, earned / target) : 1,
  };
}

export const blankScoring = {
  elimination: "",
  target: "",
  finish: "",
  eliminations: "",
  tiers: [],
};
export function normalizeScoring(raw) {
  return {
    elimination: text(raw?.elimination, 16),
    target: text(raw?.target, 16),
    finish: text(raw?.finish, 4),
    eliminations: text(raw?.eliminations, 8),
    tiers: Array.isArray(raw?.tiers)
      ? raw.tiers
          .slice(0, 100)
          .filter((t) => t && typeof t.id === "string")
          .map((t) => ({
            id: t.id,
            rank: text(t.rank, 4),
            points: text(t.points, 16),
          }))
      : [],
  };
}
export function scoringRules(form) {
  const elimination = integer(form.elimination, 0, 1000);
  if (elimination === null)
    return {
      error: "Enter whole points per elimination, including zero if needed.",
    };
  const tiers = form.tiers.map((t) => ({
    rank: integer(t.rank, 1, 100),
    points: integer(t.points),
  }));
  if (tiers.some((t) => t.rank === null || t.points === null))
    return {
      error:
        "Each tier needs a finish from 1 to 100 and non-negative whole points.",
    };
  tiers.sort((a, b) => a.rank - b.rank);
  if (tiers.some((t, i) => i && t.rank === tiers[i - 1].rank))
    return { error: "Use each placement threshold only once." };
  if (tiers.some((t, i) => i && t.points > tiers[i - 1].points))
    return {
      error:
        "A worse finish cannot award more placement points than a better finish.",
    };
  return { elimination, tiers };
}
export function matchScore(rules, finish, eliminations) {
  if (
    rules.error ||
    integer(finish, 1, 100) === null ||
    integer(eliminations, 0, 1000) === null
  )
    return null;
  const placement =
    rules.tiers.find((t) => Number(finish) <= t.rank)?.points ?? 0;
  return {
    placement,
    eliminations: Number(eliminations) * rules.elimination,
    total: placement + Number(eliminations) * rules.elimination,
  };
}
export const TARGET_FINISHES = Object.freeze([1, 3, 5, 10, 15, 25]);

export function scoreCombinations(rules, target) {
  const goal = integer(target);
  if (rules.error || goal === null) return [];
  return TARGET_FINISHES.map((rank) => {
    const points = rules.tiers.find((tier) => rank <= tier.rank)?.points ?? 0;
    return {
      rank,
      points,
      eliminations:
        goal <= points
          ? 0
          : rules.elimination
            ? Math.ceil((goal - points) / rules.elimination)
            : null,
    };
  });
}

export const DEFAULT_TASKS = [
  {
    id: "warmup",
    label: "Movement and mechanics warm-up",
    category: "Warm-up",
    minutes: "10",
  },
  {
    id: "aim",
    label: "Tracking and shotgun aim",
    category: "Aim",
    minutes: "15",
  },
  {
    id: "build",
    label: "Building, edits, and piece control",
    category: "Building",
    minutes: "15",
  },
  {
    id: "scrims",
    label: "Play focused scrims",
    category: "Scrims",
    minutes: "30",
  },
  {
    id: "review",
    label: "Review a match and write one takeaway",
    category: "Review",
    minutes: "10",
  },
];
export const CATEGORIES = ["Warm-up", "Aim", "Building", "Scrims", "Review"];
export const blankPractice = { tasks: DEFAULT_TASKS, sessions: {} };
export function normalizePractice(raw) {
  const tasks = Array.isArray(raw?.tasks)
    ? raw.tasks
        .slice(0, 100)
        .filter(
          (t) => t && typeof t.id === "string" && text(t.label, 120).trim(),
        )
        .map((t) => ({
          id: t.id,
          label: text(t.label, 120),
          category: CATEGORIES.includes(t.category) ? t.category : "Warm-up",
          minutes:
            integer(t.minutes, 1, 180) === null ? "10" : String(t.minutes),
        }))
    : DEFAULT_TASKS;
  const sessions = {};
  if (raw?.sessions && typeof raw.sessions === "object") {
    for (const [date, session] of Object.entries(raw.sessions)
      .filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .sort()
      .slice(-366)) {
      sessions[date] = {
        done: Array.isArray(session?.done)
          ? [
              ...new Set(session.done.filter((id) => typeof id === "string")),
            ].slice(0, 100)
          : [],
        notes: text(session?.notes),
      };
    }
  }
  return { tasks, sessions };
}
