import React, { useEffect, useRef, useState } from "react";
import { ImagePlus, Plus, Trash2, Upload, X } from "lucide-react";
import { NumberField } from "./ToolUI.jsx";
import { uid } from "./competition.js";
import {
  parseScoringScreenshot,
  validateScoringImport,
} from "./scoring-import.js";
import { readScoringImage } from "./read-scoring-image.js";

export default function ScoringScreenshotImport({ onApply }) {
  const [state, setState] = useState("idle");
  const [preview, setPreview] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [elimination, setElimination] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ message: "", progress: 0 });
  const [appliedCount, setAppliedCount] = useState(0);
  const controllerRef = useRef(null);
  const runRef = useRef(0);
  const inputRef = useRef(null);
  useEffect(
    () => () => {
      runRef.current++;
      controllerRef.current?.abort();
    },
    [],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );
  const validation = validateScoringImport(tiers, elimination);

  async function read(file) {
    const run = ++runRef.current;
    controllerRef.current?.abort();
    setError("");
    setTiers([]);
    setWarnings([]);
    if (
      !file ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setState("error");
      setPreview(null);
      setError("Choose a PNG, JPG, or WebP screenshot smaller than 10 MB.");
      return;
    }
    setPreview({ url: URL.createObjectURL(file), name: file.name });
    const controller = new AbortController();
    controllerRef.current = controller;
    setState("reading");
    setProgress({ message: "Preparing screenshot…", progress: 0 });
    try {
      const data = await readScoringImage(file, {
        signal: controller.signal,
        onProgress: (value) => {
          if (runRef.current === run) setProgress(value);
        },
      });
      if (runRef.current !== run) return;
      const result = parseScoringScreenshot(data);
      setTiers(result.tiers.map((tier) => ({ ...tier, id: uid() })));
      setElimination(result.elimination ?? "");
      setWarnings(result.warnings);
      setState("review");
    } catch (error) {
      if (runRef.current !== run) return;
      setState(error?.name === "AbortError" ? "idle" : "error");
      setError(
        error?.name === "AbortError"
          ? ""
          : error?.message ||
              "This screenshot could not be read. Try a clearer crop of the scoring table.",
      );
    }
  }
  function cancel() {
    runRef.current++;
    controllerRef.current?.abort();
    setState("idle");
    setPreview(null);
    setError("");
  }
  function edit(id, key, value) {
    setTiers((previous) =>
      previous.map((tier) =>
        tier.id === id ? { ...tier, [key]: value } : tier,
      ),
    );
  }

  return (
    <section
      className="scoring-import"
      aria-labelledby="screenshot-import-title"
    >
      <div className="screenshot-heading">
        <ImagePlus size={19} />
        <h3 id="screenshot-import-title">Import a scoring screenshot</h3>
      </div>
      <p className="comp-hint">
        Upload the placement and points table to fill your rules. The reader
        uses total points: <strong>60 (+7) becomes 60.</strong>
      </p>
      <input
        ref={inputRef}
        className="visually-hidden"
        tabIndex={-1}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        aria-label="Upload scoring screenshot"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) read(file);
        }}
      />
      <div className="comp-actions">
        <button
          className="button button-white"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={14} />{" "}
          {state === "idle" ? "Upload screenshot" : "Choose another screenshot"}
        </button>
        {state === "reading" && (
          <button className="button button-white" onClick={cancel}>
            <X size={14} /> Cancel reading
          </button>
        )}
      </div>
      <p className="screenshot-privacy">
        PNG, JPG, or WebP · up to 10 MB. The image stays in your browser. The
        reader loads when you choose a screenshot.
      </p>
      {preview && (
        <div className="screenshot-preview">
          <img src={preview.url} alt="Your uploaded scoring table" />
          <span>{preview.name}</span>
        </div>
      )}
      {state === "reading" && (
        <div className="screenshot-progress" role="status">
          <p>{progress.message}</p>
          <progress
            aria-label="Screenshot reading progress"
            max={1}
            value={progress.progress}
          />
          <small>
            Small text can take a moment. You can keep using the other tools.
          </small>
        </div>
      )}
      {error && (
        <p className="comp-error" role="alert">
          {error}
        </p>
      )}
      {state === "review" && (
        <div className="screenshot-review">
          <p className="visually-hidden" role="status">
            Reading complete. {tiers.length} placement rows are ready to review.
          </p>
          <h4>
            Review {tiers.length} placement{" "}
            {tiers.length === 1 ? "row" : "rows"}
          </h4>
          <p className="comp-hint">
            Check these against your screenshot. You can correct numbers, remove
            a row, or add one before applying.
          </p>
          {warnings.length > 0 && (
            <ul className="screenshot-warnings">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          <div className="comp-table-scroll screenshot-rows">
            <table className="comp-table">
              <caption className="visually-hidden">
                Read placement scoring rows
              </caption>
              <thead>
                <tr>
                  <th>Top finish</th>
                  <th>Total points</th>
                  <th>
                    <span className="visually-hidden">Remove row</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier, index) => (
                  <tr
                    key={tier.id}
                    className={tier.review ? "screenshot-check-row" : ""}
                  >
                    <td>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        aria-label={`Read row ${index + 1} finish`}
                        value={tier.rank}
                        onChange={(event) =>
                          edit(tier.id, "rank", event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="1000000"
                        step="1"
                        aria-label={`Read row ${index + 1} points`}
                        value={tier.points}
                        onChange={(event) =>
                          edit(tier.id, "points", event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Remove read row ${index + 1}`}
                        onClick={() =>
                          setTiers((previous) =>
                            previous.filter((t) => t.id !== tier.id),
                          )
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="comp-undo"
            disabled={tiers.length >= 100}
            onClick={() =>
              setTiers((previous) => [
                ...previous,
                { id: uid(), rank: "", points: "", review: true },
              ])
            }
          >
            <Plus size={14} /> Add missing row
          </button>
          <NumberField
            label="Imported points per elimination (optional)"
            max="1000"
            value={elimination}
            onChange={(event) => setElimination(event.target.value)}
            hint="Leave blank to keep the elimination score already in your calculator."
          />
          {validation && (
            <p className="comp-error" role="alert">
              {validation}
            </p>
          )}
          <button
            className="button button-primary"
            disabled={!!validation}
            onClick={() => {
              onApply({
                tiers: tiers
                  .map(({ rank, points }) => ({ id: uid(), rank, points }))
                  .sort((a, b) => Number(a.rank) - Number(b.rank)),
                elimination: elimination === "" ? null : elimination,
              });
              setAppliedCount(tiers.length);
              setState("applied");
            }}
          >
            Apply screenshot numbers
          </button>
          <p className="comp-hint">
            Replaces placement tiers when applied. Your target and game result
            inputs stay as they are.
          </p>
        </div>
      )}
      {state === "applied" && (
        <p className="screenshot-applied" role="status">
          Filled {appliedCount} placement rows. You can edit them below.
        </p>
      )}
    </section>
  );
}
