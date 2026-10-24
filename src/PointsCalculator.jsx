import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  Gamepad2,
  Info,
  RotateCcw,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  DEFAULT_POINTS_FORM,
  calculatePointsPace,
  gamePlanRows,
} from "./points.js";

const STORAGE_KEY = "compiq-points-v2";
const number = (value) =>
  new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value);
const points = (value) =>
  `${number(value)} ${value === 1 ? "point" : "points"}`;
const games = (value) => `${number(value)} ${value === 1 ? "game" : "games"}`;

function initialForm() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const saved = JSON.parse(current ?? localStorage.getItem("compiq-points-v1"));
    // The old example was saved automatically, even without any user input.
    if (
      current === null &&
      saved?.target === "312" &&
      saved?.games === "12" &&
      saved?.current === "0" &&
      saved?.played === "0"
    ) {
      return { ...DEFAULT_POINTS_FORM };
    }
    if (
      saved &&
      Object.keys(DEFAULT_POINTS_FORM).every(
        (key) => typeof saved[key] === "string" && saved[key].length <= 32,
      )
    ) {
      return Object.fromEntries(
        Object.keys(DEFAULT_POINTS_FORM).map((key) => [key, saved[key]]),
      );
    }
  } catch {
    /* Browser storage is optional. */
  }
  return { ...DEFAULT_POINTS_FORM };
}

export default function PointsCalculator() {
  const [form, setForm] = useState(initialForm);
  const [page, setPage] = useState(0);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const pace = calculatePointsPace(form);
  const rows = gamePlanRows(pace, page * 12);
  const average =
    pace.status === "ready" && pace.average > 0 && pace.average < 0.01
      ? "<0.01"
      : number(pace.average ?? 0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }, [form]);

  function update(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setPage(0);
  }
  function field(key, label, hint, icon) {
    return (
      <div className="points-field">
        <label htmlFor={`points-${key}`}>{label}</label>
        <div
          className={`points-input-wrap ${pace.errors[key] ? "input-invalid" : ""}`}
        >
          {icon}
          <input
            id={`points-${key}`}
            type="number"
            inputMode="numeric"
            min={key === "games" ? 1 : 0}
            step="1"
            value={form[key]}
            onChange={(event) => update(key, event.target.value)}
            aria-invalid={!!pace.errors[key]}
            aria-describedby={`points-${key}-hint`}
          />
        </div>
        <p
          id={`points-${key}-hint`}
          className={
            pace.errors[key] ? "points-field-error" : "points-field-hint"
          }
        >
          {pace.errors[key] || hint}
        </p>
      </div>
    );
  }
  const summary =
    pace.status === "ready"
      ? `${points(pace.pointsNeeded)} needed in ${games(pace.gamesLeft)}: ${average} points per game on average.`
      : pace.status === "achieved"
        ? "Your points target is already reached."
        : pace.status === "out_of_games"
          ? `${points(pace.pointsNeeded)} still needed with no games remaining.`
          : pace.status === "incomplete"
            ? "Enter your target points and total games to get started."
            : "Enter valid whole numbers to calculate your points pace.";

  return (
    <div className="page-shell points-page">
      <section className="intro points-intro">
        <div>
          <div className="eyebrow">
            <span />
            FORTNITE COMPETITIVE TOOLKIT
          </div>
          <h1>
            Set the target. <span>Know your pace.</span>
          </h1>
          <p>Turn your points goal into a game plan. One game at a time.</p>
        </div>
        <span className="tool-label">
          <Calculator size={15} /> POINTS CALCULATOR
        </span>
      </section>
      <div className="points-workspace">
        <aside className="points-controls">
          <section className="card points-form-card">
            <div className="card-heading">
              <span className="heading-icon">
                <Target size={18} />
              </span>
              <h2>Your tournament target</h2>
              <button
                className="icon-button"
                aria-label="Clear points calculator"
                title="Clear all fields"
                onClick={() => {
                  setForm({ ...DEFAULT_POINTS_FORM });
                  setPage(0);
                }}
              >
                <RotateCcw size={15} />
              </button>
            </div>
            <form
              className="points-form"
              noValidate
              onSubmit={(event) => event.preventDefault()}
            >
              {field(
                "target",
                "Target points",
                "The total points you want to finish with.",
                <Trophy size={18} />,
              )}
              {field(
                "games",
                "Total games",
                "Your full game allowance for this target.",
                <Gamepad2 size={18} />,
              )}
              <div className="progress-input-heading">
                <span>Already started?</span>
                <small>OPTIONAL</small>
              </div>
              <div className="points-progress-fields">
                {field(
                  "current",
                  "Points earned",
                  "Leave blank for a fresh start.",
                  <Flag size={15} />,
                )}
                {field(
                  "played",
                  "Games played",
                  "Games you have already used.",
                  <Check size={15} />,
                )}
              </div>
              <div className="points-auto-note">
                <span className="live-dot" /> Your pace updates as you type.
              </div>
            </form>
          </section>
          <div className="calculator-note">
            <Info size={16} />
            <p>
              Use your own points target. Tournament scoring and qualification
              cutoffs vary by event.
            </p>
          </div>
        </aside>

        <section className="points-results" aria-label="Your points plan">
          <p className="visually-hidden" role="status">
            {summary}
          </p>
          <div
            className={`pace-card ${pace.status === "achieved" ? "goal-achieved" : ""}`}
          >
            <div className="pace-card-heading">
              <span>
                <span className="pace-dot" />
                {pace.status === "achieved"
                  ? "TARGET REACHED"
                  : "YOUR REQUIRED PACE"}
              </span>
              <TrendingUp size={21} />
            </div>
            <div className="pace-number">
              <strong data-testid="points-average">
                {pace.status === "ready" ? (
                  average
                ) : pace.status === "achieved" ? (
                  <Check size={59} />
                ) : (
                  "—"
                )}
              </strong>
              <div>
                <span>
                  {pace.status === "achieved"
                    ? "Goal complete"
                    : "points / game"}
                </span>
                <small>
                  {pace.status === "ready"
                    ? "ON AVERAGE"
                    : "YOUR TARGET, YOUR PLAN"}
                </small>
              </div>
            </div>
            <p className="pace-description">
              {pace.status === "ready" ? (
                <>
                  {points(pace.pointsNeeded)} across {games(pace.gamesLeft)}{" "}
                  {pace.played ? "remaining" : "total"}. That’s your pace to{" "}
                  {number(pace.target)}.
                </>
              ) : pace.status === "achieved" ? (
                "You’ve reached this points goal. Set a higher target to plan your next push."
              ) : pace.status === "out_of_games" ? (
                `${points(pace.pointsNeeded)} still needed, but you have no games left. Review your target or game allowance.`
              ) : pace.status === "incomplete" ? (
                "Enter your target points and total games to get started."
              ) : (
                "Enter valid points and games to see the average you need."
              )}
            </p>
            {pace.status === "ready" && (
              <div className="pace-equation" data-testid="points-equation">
                <span>{number(pace.pointsNeeded)}</span>
                <i>÷</i>
                <span>{number(pace.gamesLeft)}</span>
                <i>=</i>
                <span>{average}</span>
                <small>PTS / GAME</small>
              </div>
            )}
          </div>

          {["ready", "achieved", "out_of_games"].includes(pace.status) && (
            <>
              <div className="points-metrics">
                <div>
                  <span>POINTS STILL NEEDED</span>
                  <strong data-testid="points-needed">
                    {number(pace.pointsNeeded)}
                  </strong>
                </div>
                <div>
                  <span>GAMES REMAINING</span>
                  <strong data-testid="games-remaining">
                    {number(pace.gamesLeft)}
                  </strong>
                </div>
                <div>
                  <span>TARGET POINTS</span>
                  <strong>{number(pace.target)}</strong>
                </div>
              </div>
              <section className="card points-progress-card">
                <div>
                  <span>Target progress</span>
                  <strong>
                    {number(pace.current)}{" "}
                    <small>/ {number(pace.target)} pts</small>
                  </strong>
                </div>
                <div
                  className="target-progress-track"
                  role="progressbar"
                  aria-label="Points target progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(pace.progress * 100)}
                >
                  <span style={{ width: `${pace.progress * 100}%` }} />
                </div>
                <small>
                  {Math.round(pace.progress * 100)}% of your target reached
                </small>
              </section>
            </>
          )}

          {pace.status === "ready" && (
            <section className="card game-plan-card">
              <div className="game-plan-heading">
                <div>
                  <span className="eyebrow">MAKE EACH GAME COUNT</span>
                  <h2>Your game-by-game pace</h2>
                </div>
                <span className="plan-count">{games(pace.gamesLeft)}</span>
              </div>
              <p className="whole-point-plan" data-testid="whole-point-plan">
                {pace.higherTargetGames ? (
                  <>
                    <strong>{points(pace.higherTarget)}</strong> in{" "}
                    <strong>{games(pace.higherTargetGames)}</strong>, then{" "}
                    <strong>{points(pace.baseTarget)}</strong> in{" "}
                    <strong>{games(pace.baseTargetGames)}</strong>.
                  </>
                ) : (
                  <>
                    <strong>{points(pace.baseTarget)}</strong> in each of your{" "}
                    <strong>{games(pace.gamesLeft)}</strong>.
                  </>
                )}{" "}
                Whole-point targets that add up to your goal.
              </p>
              <div className="game-plan-table-wrap">
                <table className="game-plan-table">
                  <caption className="visually-hidden">
                    Suggested points per remaining game and running total
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Game</th>
                      <th scope="col">Points target</th>
                      <th scope="col">Running total</th>
                      <th scope="col">
                        <span className="visually-hidden">Goal progress</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.game} data-testid="game-plan-row">
                        <td>
                          <span>GAME {number(row.game).padStart(2, "0")}</span>
                        </td>
                        <td>
                          +{number(row.points)} <small>pts</small>
                        </td>
                        <td>
                          {number(row.runningTotal)} <small>pts</small>
                        </td>
                        <td>
                          <span className="row-progress-track">
                            <span
                              style={{
                                width: `${pace.target ? Math.min(100, (row.runningTotal / pace.target) * 100) : 100}%`,
                              }}
                            />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pace.gamesLeft > 12 && (
                <div className="game-plan-pagination">
                  <span>
                    Games {number(page * 12 + 1)}–
                    {number(page * 12 + rows.length)} of{" "}
                    {number(pace.gamesLeft)}
                  </span>
                  <div>
                    <button
                      className="icon-button"
                      aria-label="Previous games"
                      disabled={!page}
                      onClick={() => setPage((value) => value - 1)}
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Next games"
                      disabled={(page + 1) * 12 >= pace.gamesLeft}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              )}
              <div className="plan-footer">
                <Info size={13} />A points plan, not a match prediction. Update
                your progress after each game.
              </div>
            </section>
          )}
          <p className="points-storage-note">
            {storageAvailable
              ? "Your inputs are saved in this browser. Update them any time."
              : "Browser storage is unavailable. The calculator still works for this session."}
          </p>
        </section>
      </div>
      <section className="competitive-bottom-note">
        <span>
          <Trophy size={20} />
        </span>
        <div>
          <h2>Points set the pace. Position wins options.</h2>
          <p>
            Use the zone predictor to explore rotations on your selected map.
          </p>
        </div>
        <a href="#zones">
          Open zone predictor <ArrowRight size={15} />
        </a>
      </section>
    </div>
  );
}
