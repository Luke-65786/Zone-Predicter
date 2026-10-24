export const DEFAULT_POINTS_FORM = Object.freeze({
  target: "",
  games: "",
  current: "",
  played: "",
});

// Manual targets only: tournament scoring and qualification cutoffs are not
// assumed. Whole-point game targets below add up exactly to the stated goal.
export function calculatePointsPace(form) {
  const values = {};
  const errors = {};
  let incomplete = false;
  for (const key of Object.keys(DEFAULT_POINTS_FORM)) {
    const raw = String(form[key] ?? "").trim();
    const value = Number(raw);
    if (!raw) {
      if (key === "target" || key === "games") incomplete = true;
      else values[key] = 0;
    } else if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value))
      errors[key] = "Use a non-negative whole number.";
    else values[key] = value;
  }
  if (!errors.games && values.games === 0)
    errors.games = "Enter at least one total game.";
  if (!errors.played && !errors.games && values.played > values.games)
    errors.played = "Games played cannot exceed total games.";
  if (Object.keys(errors).length) return { status: "invalid", errors };
  if (incomplete) return { status: "incomplete", errors };

  const pointsNeeded = Math.max(0, values.target - values.current);
  const gamesLeft = values.games - values.played;
  const common = {
    ...values,
    errors,
    pointsNeeded,
    gamesLeft,
    progress: values.target ? Math.min(1, values.current / values.target) : 1,
  };
  if (pointsNeeded === 0) return { ...common, status: "achieved", average: 0 };
  if (!gamesLeft) return { ...common, status: "out_of_games", average: null };
  const baseTarget = Math.floor(pointsNeeded / gamesLeft);
  const higherTargetGames = pointsNeeded % gamesLeft;
  return {
    ...common,
    status: "ready",
    average: pointsNeeded / gamesLeft,
    baseTarget,
    higherTarget: baseTarget + 1,
    higherTargetGames,
    baseTargetGames: gamesLeft - higherTargetGames,
  };
}

export function gamePlanRows(pace, offset = 0, limit = 12) {
  if (
    pace.status !== "ready" ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset >= pace.gamesLeft
  )
    return [];
  const length = Math.min(limit, pace.gamesLeft - offset);
  return Array.from({ length }, (_, index) => {
    const position = offset + index;
    return {
      game: pace.played + position + 1,
      points: pace.baseTarget + (position < pace.higherTargetGames ? 1 : 0),
      runningTotal:
        pace.current +
        pace.baseTarget * (position + 1) +
        Math.min(position + 1, pace.higherTargetGames),
    };
  });
}
