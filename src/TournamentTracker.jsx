import React, { useState } from "react";
import { Activity, Plus, RotateCcw, Trash2 } from "lucide-react";
import useSavedState from "./useSavedState.js";
import {
  blankTracker,
  format,
  integer,
  normalizeTracker,
  trackerSummary,
  uid,
} from "./competition.js";
import {
  Field,
  Metric,
  NumberField,
  StorageNote,
  ToolPage,
} from "./ToolUI.jsx";

const emptyEntry = { points: "", finish: "", eliminations: "", notes: "" };
export default function TournamentTracker({ plans }) {
  const {
    value: tracker,
    setValue,
    saved,
  } = useSavedState("compiq-tracker-v1", blankTracker, normalizeTracker);
  const [entry, setEntry] = useState(emptyEntry);
  const [planId, setPlanId] = useState("");
  const [error, setError] = useState("");
  const [undo, setUndo] = useState(null);
  const summary = trackerSummary(tracker);
  const patch = (values) =>
    setValue((previous) => ({ ...previous, ...values }));
  const field = (key) => ({
    value: tracker[key],
    onChange: (e) => patch({ [key]: e.target.value }),
  });
  function addGame(event) {
    event.preventDefault();
    if (
      integer(entry.points) === null ||
      (entry.finish !== "" && integer(entry.finish, 1, 100) === null) ||
      (entry.eliminations !== "" &&
        integer(entry.eliminations, 0, 1000) === null)
    ) {
      setError(
        "Enter whole game points. Optional finish must be 1–100 and eliminations 0–1,000.",
      );
      return;
    }
    if (
      tracker.entries.length >= 200 ||
      (integer(tracker.games, 1, 200) !== null &&
        tracker.entries.length >= Number(tracker.games))
    ) {
      setError(
        "Your game allowance is used up. Increase it or edit an existing result.",
      );
      return;
    }
    patch({ entries: [...tracker.entries, { ...entry, id: uid() }] });
    setEntry(emptyEntry);
    setError("");
    setUndo(null);
  }
  let total = 0;
  return (
    <ToolPage
      title="Every game."
      accent="Know your pace."
      description="Log your results and see how your tournament is tracking against your target."
      icon={Activity}
    >
      <div className="comp-columns">
        <div className="comp-stack">
          <section className="card comp-card">
            <h2>Tournament target</h2>
            <Field label="Tournament name" maxLength={80} {...field("name")} />
            <div className="comp-field-row">
              <NumberField
                label="Tracker target points"
                max="1000000"
                {...field("target")}
              />
              <NumberField
                label="Tracker total games"
                min="1"
                max="200"
                {...field("games")}
              />
            </div>
            {((tracker.target !== "" && integer(tracker.target) === null) ||
              (tracker.games !== "" &&
                integer(tracker.games, 1, 200) === null)) && (
              <p className="comp-error" role="alert">
                Use whole target points up to 1,000,000 and a game allowance
                from 1 to 200.
              </p>
            )}
            <div className="comp-divider" />
            <Field label="Load target from saved plan">
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
              >
                <option value="">Choose a plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <button
              className="button button-white"
              disabled={!plans.some((p) => p.id === planId)}
              onClick={() => {
                const plan = plans.find((p) => p.id === planId);
                patch({
                  name: plan.name,
                  target: plan.target,
                  games: plan.games,
                });
                setError("");
              }}
            >
              Apply plan target
            </button>
            <p className="comp-hint">
              Applying a target keeps your game log.{" "}
              <a href="#plans">Create or edit a tournament plan →</a>
            </p>
          </section>
          <section className="card comp-card">
            <h2>Log a game</h2>
            <form onSubmit={addGame} noValidate>
              <NumberField
                label="Game points"
                max="1000000"
                value={entry.points}
                onChange={(e) => setEntry({ ...entry, points: e.target.value })}
              />
              <div className="comp-field-row">
                <NumberField
                  label="Finish (optional)"
                  min="1"
                  max="100"
                  value={entry.finish}
                  onChange={(e) =>
                    setEntry({ ...entry, finish: e.target.value })
                  }
                />
                <NumberField
                  label="Eliminations (optional)"
                  max="1000"
                  value={entry.eliminations}
                  onChange={(e) =>
                    setEntry({ ...entry, eliminations: e.target.value })
                  }
                />
              </div>
              <Field
                label="Game note (optional)"
                maxLength={300}
                value={entry.notes}
                onChange={(e) => setEntry({ ...entry, notes: e.target.value })}
              />
              {error && (
                <p className="comp-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button button-primary" type="submit">
                <Plus size={15} /> Add game
              </button>
            </form>
            <p className="comp-hint">
              Enter the total points awarded for this game. Use the{" "}
              <a href="#scoring">scoring calculator</a> to work it out.
            </p>
          </section>
        </div>
        <div className="comp-stack">
          <section className="comp-spotlight">
            <span className="eyebrow">TOURNAMENT PACE</span>
            <h2 data-testid="tracker-status">
              {summary.status === "incomplete"
                ? "Set your tournament target"
                : summary.status === "invalid"
                  ? "Check your game log"
                  : summary.status === "achieved"
                    ? "Target reached"
                    : summary.status === "finished"
                      ? "Tournament complete"
                      : summary.played === 0
                        ? "Ready for your first game"
                        : summary.delta === 0
                          ? "On target pace"
                          : `${format(Math.abs(summary.delta))} points ${summary.delta > 0 ? "ahead" : summary.delta < 0 ? "behind" : "off"} pace`}
            </h2>
            <p>
              {summary.status === "incomplete"
                ? "Add a target and game allowance to see your progress. Your game log can start any time."
                : summary.status === "invalid"
                  ? summary.message
                  : summary.status === "achieved"
                    ? "You have reached your points goal. Keep logging games or set your next target."
                    : summary.status === "finished"
                      ? `${format(summary.needed)} more points were needed to reach your target.`
                      : summary.played === 0
                        ? "Your pace will update after each result."
                        : summary.delta === 0
                          ? "You are on the straight-line pace for your target."
                          : "Compared with the same share of your target after this many games."}
            </p>
            {summary.earned !== undefined && (
              <>
                <div
                  className="comp-progress"
                  role="progressbar"
                  aria-label="Tournament target progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(summary.progress * 100)}
                >
                  <span style={{ width: `${summary.progress * 100}%` }} />
                </div>
                <small>
                  {format(summary.earned)} / {format(summary.target)} points ·{" "}
                  {summary.played} / {summary.games} games
                </small>
              </>
            )}
          </section>
          {summary.earned !== undefined && (
            <div className="comp-metrics">
              <Metric
                label="Points earned"
                value={format(summary.earned)}
                testId="tracker-earned"
              />
              <Metric label="Games left" value={summary.remaining} />
              <Metric
                label="Needed per game"
                value={summary.average === null ? "—" : format(summary.average)}
                testId="tracker-average"
              />
            </div>
          )}
          <section className="card comp-card">
            <div className="comp-section-heading">
              <h2>{tracker.name || "Your game log"}</h2>
              <button
                className="button button-white"
                disabled={!tracker.entries.length}
                onClick={() => {
                  setUndo(tracker.entries);
                  patch({ entries: [] });
                  setError("");
                }}
              >
                Clear game log
              </button>
            </div>
            <p className="comp-hint">
              Edit game points directly below to correct a result.
            </p>
            {!tracker.entries.length ? (
              <div className="comp-empty">
                Your games will appear here once you log a result.
              </div>
            ) : (
              <div className="comp-table-scroll">
                <table className="comp-table">
                  <caption className="visually-hidden">
                    Tournament game results
                  </caption>
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>Points</th>
                      <th>Total</th>
                      <th>Finish / elims</th>
                      <th>Note</th>
                      <th>
                        <span className="visually-hidden">Remove</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tracker.entries.map((game, index) => {
                      const value = integer(game.points);
                      total += value ?? 0;
                      return (
                        <tr key={game.id}>
                          <td>{index + 1}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="1000000"
                              step="1"
                              aria-label={`Game ${index + 1} points`}
                              value={game.points}
                              aria-invalid={value === null}
                              onChange={(e) => {
                                setUndo(null);
                                patch({
                                  entries: tracker.entries.map((g) =>
                                    g.id === game.id
                                      ? { ...g, points: e.target.value }
                                      : g,
                                  ),
                                });
                              }}
                            />
                          </td>
                          <td>{format(total)}</td>
                          <td>
                            {game.finish ? `#${game.finish}` : "—"} /{" "}
                            {game.eliminations || "—"}
                          </td>
                          <td>{game.notes || "—"}</td>
                          <td>
                            <button
                              className="icon-button"
                              aria-label={`Remove game ${index + 1}`}
                              onClick={() => {
                                setUndo(tracker.entries);
                                patch({
                                  entries: tracker.entries.filter(
                                    (g) => g.id !== game.id,
                                  ),
                                });
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {undo && (
              <button
                className="comp-undo"
                onClick={() => {
                  patch({ entries: undo });
                  setUndo(null);
                }}
              >
                <RotateCcw size={14} /> Undo removal
              </button>
            )}
          </section>
        </div>
      </div>
      <StorageNote saved={saved} />
    </ToolPage>
  );
}
