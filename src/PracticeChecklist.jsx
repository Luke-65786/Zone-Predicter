import React, { useState } from "react";
import { CheckSquare, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  blankPractice,
  CATEGORIES,
  format,
  integer,
  normalizePractice,
  uid,
} from "./competition.js";
import useSavedState from "./useSavedState.js";
import {
  Field,
  Metric,
  NumberField,
  StorageNote,
  ToolPage,
} from "./ToolUI.jsx";

const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
export default function PracticeChecklist() {
  const { value, setValue, saved } = useSavedState(
    "compiq-practice-v1",
    blankPractice,
    normalizePractice,
  );
  const [date, setDate] = useState(localDate);
  const [draft, setDraft] = useState({
    label: "",
    category: "Warm-up",
    minutes: "",
  });
  const [error, setError] = useState("");
  const [undo, setUndo] = useState(null);
  const session = value.sessions[date] ?? { done: [], notes: "" };
  const completed = value.tasks.filter((t) => session.done.includes(t.id));
  const minutes = (tasks) =>
    tasks.reduce((sum, t) => sum + Number(t.minutes), 0);
  function updateSession(patch, keepUndo = false) {
    if (!keepUndo) setUndo(null);
    setValue((previous) =>
      normalizePractice({
        ...previous,
        sessions: {
          ...previous.sessions,
          [date]: {
            ...(previous.sessions[date] ?? { done: [], notes: "" }),
            ...patch,
          },
        },
      }),
    );
  }
  return (
    <ToolPage
      title="Build the habit."
      accent="Sharpen your game."
      description="Plan a practice session, check off your work, and keep a takeaway for next time."
      icon={CheckSquare}
    >
      <div className="comp-columns">
        <div className="comp-stack">
          <section className="card comp-card">
            <h2>Your practice session</h2>
            <Field
              label="Practice date"
              type="date"
              value={date}
              onChange={(e) => {
                if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) {
                  setDate(e.target.value);
                  setUndo(null);
                }
              }}
              hint="Choose another date to start a fresh session or revisit earlier work. The most recent 366 session dates are kept."
            />
            <div className="comp-metrics">
              <Metric
                label="Tasks done"
                value={`${completed.length} / ${value.tasks.length}`}
                testId="practice-completed"
              />
              <Metric
                label="Minutes planned"
                value={format(minutes(value.tasks))}
              />
              <Metric
                label="Minutes checked off"
                value={format(minutes(completed))}
              />
            </div>
            <div
              className="comp-progress"
              role="progressbar"
              aria-label="Practice progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={
                value.tasks.length
                  ? Math.round((completed.length / value.tasks.length) * 100)
                  : 0
              }
            >
              <span
                style={{
                  width: `${value.tasks.length ? (completed.length / value.tasks.length) * 100 : 0}%`,
                }}
              />
            </div>
            <Field label="Session notes and takeaway">
              <textarea
                maxLength={4000}
                rows={5}
                value={session.notes}
                onChange={(e) => updateSession({ notes: e.target.value })}
              />
            </Field>
            <button
              className="button button-white"
              onClick={() => {
                setUndo({ value, date });
                updateSession({ done: [], notes: "" }, true);
              }}
            >
              Reset this session
            </button>
            <p className="comp-hint">
              Minutes are your estimates, not a running timer. Changing the task
              library applies to every date.
            </p>
          </section>
          <section className="card comp-card">
            <h2>Add your own drill</h2>
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  !draft.label.trim() ||
                  integer(draft.minutes, 1, 180) === null
                ) {
                  setError("Name your drill and enter 1–180 minutes.");
                  return;
                }
                if (value.tasks.length >= 100) {
                  setError("You can keep up to 100 drills.");
                  return;
                }
                setValue((previous) => ({
                  ...previous,
                  tasks: [
                    ...previous.tasks,
                    { ...draft, label: draft.label.trim(), id: uid() },
                  ],
                }));
                setDraft({ label: "", category: "Warm-up", minutes: "" });
                setError("");
                setUndo(null);
              }}
            >
              <Field
                label="Drill name"
                maxLength={120}
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              />
              <div className="comp-field-row">
                <Field label="Drill category">
                  <select
                    value={draft.category}
                    onChange={(e) =>
                      setDraft({ ...draft, category: e.target.value })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <NumberField
                  label="Drill minutes"
                  min="1"
                  max="180"
                  value={draft.minutes}
                  onChange={(e) =>
                    setDraft({ ...draft, minutes: e.target.value })
                  }
                />
              </div>
              {error && (
                <p className="comp-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button button-primary">
                <Plus size={15} /> Add drill
              </button>
            </form>
          </section>
        </div>
        <section className="card comp-card">
          <h2>Practice checklist</h2>
          <p className="comp-hint">
            Work through your warm-up, aim, building, scrims, and review.
          </p>
          {!value.tasks.length && (
            <p className="comp-empty">Add a drill to build your routine.</p>
          )}
          <div className="practice-list">
            {value.tasks.map((task) => (
              <div
                className={`practice-task ${session.done.includes(task.id) ? "task-done" : ""}`}
                key={task.id}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={session.done.includes(task.id)}
                    onChange={(e) =>
                      updateSession({
                        done: e.target.checked
                          ? [...session.done, task.id]
                          : session.done.filter((id) => id !== task.id),
                      })
                    }
                  />
                  <span>
                    <strong>{task.label}</strong>
                    <small>
                      {task.category} · {task.minutes} min
                    </small>
                  </span>
                </label>
                <button
                  className="icon-button"
                  aria-label={`Remove drill ${task.label}`}
                  onClick={() => {
                    setUndo({ value, date });
                    setValue((previous) => ({
                      ...previous,
                      tasks: previous.tasks.filter((t) => t.id !== task.id),
                    }));
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          {undo && (
            <button
              className="comp-undo"
              onClick={() => {
                setValue(undo.value);
                setDate(undo.date);
                setUndo(null);
              }}
            >
              <RotateCcw size={14} /> Undo last reset or removal
            </button>
          )}
        </section>
      </div>
      <StorageNote saved={saved} />
    </ToolPage>
  );
}
