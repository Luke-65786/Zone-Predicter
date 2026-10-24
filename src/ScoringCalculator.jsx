import React, { useState } from "react";
import { Calculator, Plus, RotateCcw, Trash2 } from "lucide-react";
import ScoringScreenshotImport from "./ScoringScreenshotImport.jsx";
import {
  blankScoring,
  format,
  integer,
  matchScore,
  normalizeScoring,
  scoreCombinations,
  scoringRules,
  uid,
} from "./competition.js";
import useSavedState from "./useSavedState.js";
import { Metric, NumberField, StorageNote, ToolPage } from "./ToolUI.jsx";

export default function ScoringCalculator() {
  const {
    value: form,
    setValue,
    saved,
  } = useSavedState("compiq-scoring-v1", blankScoring, normalizeScoring);
  const [touched, setTouched] = useState(false);
  const [beforeImport, setBeforeImport] = useState(null);
  const [clearedTiers, setClearedTiers] = useState(null);
  const patch = (values) => {
    if (Object.hasOwn(values, "tiers")) setClearedTiers(null);
    setValue((previous) => ({ ...previous, ...values }));
  };
  const field = (key) => ({
    value: form[key],
    onChange: (e) => {
      patch({ [key]: e.target.value });
      setTouched(true);
    },
  });
  const rules = scoringRules(form);
  const score = matchScore(rules, form.finish, form.eliminations);
  const combinations = scoreCombinations(rules, form.target);
  return (
    <ToolPage
      title="Build your score."
      accent="Find your options."
      description="Enter your event’s scoring rules to calculate a result or explore placement and elimination combinations."
      icon={Calculator}
    >
      <div className="comp-columns">
        <section className="card comp-card">
          <h2>Your event’s scoring rules</h2>
          <p className="comp-hint">
            Use the published rules for your event. No official scoring format
            is assumed.
          </p>
          <ScoringScreenshotImport
            onApply={({ tiers, elimination }) => {
              setBeforeImport({
                tiers: form.tiers,
                elimination: form.elimination,
              });
              patch({
                tiers,
                ...(elimination !== null ? { elimination } : {}),
              });
              setTouched(true);
            }}
          />
          {beforeImport && (
            <button
              className="comp-undo"
              onClick={() => {
                patch(beforeImport);
                setBeforeImport(null);
              }}
            >
              <RotateCcw size={14} /> Undo screenshot import
            </button>
          )}
          <NumberField
            label="Points per elimination"
            max="1000"
            {...field("elimination")}
          />
          <h3 className="comp-subheading">Placement tiers</h3>
          <p className="comp-hint">
            Enter total placement points at each threshold, rather than extra
            points. For example, Top 1: 20 and Top 10: 5 awards 20 for a win, 5
            for finishes 2–10, and zero below that.
          </p>
          <div
            className="scoring-tier-list"
            role="group"
            aria-label="Placement scoring rules"
          >
            {form.tiers.map((tier, index) => (
              <div className="scoring-tier" key={tier.id}>
                <NumberField
                  label={`Tier ${index + 1} top finish`}
                  min="1"
                  max="100"
                  value={tier.rank}
                  onChange={(e) => {
                    patch({
                      tiers: form.tiers.map((t) =>
                        t.id === tier.id ? { ...t, rank: e.target.value } : t,
                      ),
                    });
                    setTouched(true);
                  }}
                />
                <NumberField
                  label={`Tier ${index + 1} total points`}
                  max="1000000"
                  value={tier.points}
                  onChange={(e) => {
                    patch({
                      tiers: form.tiers.map((t) =>
                        t.id === tier.id ? { ...t, points: e.target.value } : t,
                      ),
                    });
                    setTouched(true);
                  }}
                />
                <button
                  className="icon-button"
                  aria-label={`Remove tier ${index + 1}`}
                  onClick={() =>
                    patch({ tiers: form.tiers.filter((t) => t.id !== tier.id) })
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="comp-actions">
            <button
              className="button button-white"
              disabled={form.tiers.length >= 100}
              onClick={() =>
                patch({
                  tiers: [...form.tiers, { id: uid(), rank: "", points: "" }],
                })
              }
            >
              <Plus size={14} /> Add placement tier
            </button>
            <button
              className="button button-white"
              disabled={!form.tiers.length}
              onClick={() => {
                patch({ tiers: [] });
                setClearedTiers(form.tiers);
                setBeforeImport(null);
              }}
            >
              <Trash2 size={14} /> Clear all placements
            </button>
          </div>
          {clearedTiers && (
            <button
              className="comp-undo"
              onClick={() => patch({ tiers: clearedTiers })}
            >
              <RotateCcw size={14} /> Undo clear placements
            </button>
          )}
          {touched && rules.error && (
            <p className="comp-error" role="alert">
              {rules.error}
            </p>
          )}
          {!form.tiers.length && (
            <p className="comp-hint">
              Without placement tiers, only elimination points count.
            </p>
          )}
        </section>
        <div className="comp-stack">
          <section className="card comp-card">
            <h2>Calculate a game result</h2>
            <div className="comp-field-row">
              <NumberField
                label="Scoring finish"
                min="1"
                max="100"
                {...field("finish")}
              />
              <NumberField
                label="Scoring eliminations"
                max="1000"
                {...field("eliminations")}
              />
            </div>
            {score ? (
              <div className="comp-metrics">
                <Metric label="Placement" value={format(score.placement)} />
                <Metric
                  label="Eliminations"
                  value={format(score.eliminations)}
                />
                <Metric
                  label="Total points"
                  value={format(score.total)}
                  testId="match-score"
                />
              </div>
            ) : (
              <p className="comp-empty">
                Enter valid scoring rules, a finish from 1–100, and eliminations
                from 0–1,000.
              </p>
            )}
            <p className="comp-hint">
              Once the game is complete, enter its total in the{" "}
              <a href="#tracker">tournament tracker</a>.
            </p>
          </section>
          <section className="card comp-card">
            <h2>Ways to reach a game target</h2>
            <NumberField
              label="Points needed this game"
              max="1000000"
              {...field("target")}
            />
            {form.target !== "" && integer(form.target) === null && (
              <p className="comp-error" role="alert">
                Enter whole target points from 0 to 1,000,000.
              </p>
            )}
            {combinations.length ? (
              <div className="comp-table-scroll">
                <table className="comp-table">
                  <caption className="visually-hidden">
                    Placement and elimination combinations
                  </caption>
                  <thead>
                    <tr>
                      <th>Finish</th>
                      <th>Placement pts</th>
                      <th>Minimum elims</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinations.map((row) => (
                      <tr key={row.rank}>
                        <td>
                          {row.rank}
                          {row.rank === 1 ? "st" : row.rank === 3 ? "rd" : "th"}
                        </td>
                        <td>{format(row.points)}</td>
                        <td>
                          {row.eliminations === null
                            ? "Not reachable"
                            : format(row.eliminations)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="comp-empty">
                Add your scoring rules and a points target to see combinations.
              </p>
            )}
            <p className="comp-hint">
              These are arithmetic requirements, not predicted results.
              Combinations may exceed what is practical in a match.
            </p>
          </section>
        </div>
      </div>
      <StorageNote saved={saved} />
    </ToolPage>
  );
}
