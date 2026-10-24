import test from "node:test";
import assert from "node:assert/strict";
import {
  parseScoringScreenshot,
  validateScoringImport,
} from "../src/scoring-import.js";

test("screenshot parsing uses total placement points and never adds the bracketed bonus", () => {
  const result = parseScoringScreenshot({
    text: "Placement Points\n1st 60 (+7)\n2nd 53 (+4)\n3rd 49 (+2)\n50th 1(+1)",
    confidence: 95,
  });
  assert.deepEqual(
    result.tiers.map(({ rank, points }) => [rank, points]),
    [
      ["1", "60"],
      ["2", "53"],
      ["3", "49"],
      ["50", "1"],
    ],
  );
  assert.equal(result.elimination, null);
  assert.ok(result.warnings.some((warning) => warning.includes("elimination")));
  assert.equal(validateScoringImport(result.tiers, ""), null);
});

test("screenshot parsing aligns physically adjacent words even if OCR reads whole columns", () => {
  const word = (text, x, y) => ({
    text,
    bbox: { x0: x, x1: x + 25, y0: y, y1: y + 12 },
    confidence: 95,
  });
  const blocks = [
    {
      paragraphs: [
        { lines: [{ words: [word("1st", 10, 20), word("2nd", 10, 45)] }] },
      ],
    },
    {
      paragraphs: [
        {
          lines: [
            {
              words: [
                word("60", 100, 20),
                word("(+7)", 140, 20),
                word("53", 100, 45),
                word("(+4)", 140, 45),
              ],
            },
          ],
        },
      ],
    },
  ];
  const result = parseScoringScreenshot({
    text: "1st\n2nd\n60 (+7)\n53 (+4)",
    blocks,
  });
  assert.deepEqual(
    result.tiers.map(({ rank, points }) => [rank, points]),
    [
      ["1", "60"],
      ["2", "53"],
    ],
  );
});

test("unreadable ordinal digits can be recovered between verified neighbors and are flagged", () => {
  const result = parseScoringScreenshot({
    text: "3rd 49 (+2)\nath 47 (+1)\n5th 46 (+1)\n8th 43 (+1)\noth 42 (+1)\n10th 41 (+1)",
  });
  assert.deepEqual(
    result.tiers.map((tier) => tier.rank),
    ["3", "4", "5", "8", "9", "10"],
  );
  assert.ok(result.tiers.find((tier) => tier.rank === "4").review);
  assert.ok(result.tiers.find((tier) => tier.rank === "9").review);
  const missing = parseScoringScreenshot({ text: "3rd 49\n5th 46" });
  assert.equal(missing.tiers.length, 2);
  const ambiguous = parseScoringScreenshot({ text: "1st 60\nath 47\n10th 41" });
  assert.equal(ambiguous.tiers.length, 2);
});

test("elimination points are extracted only from an explicit label, including zero", () => {
  assert.equal(
    parseScoringScreenshot({ text: "1st 60 (+7)\nPoints per elimination: 2" })
      .elimination,
    "2",
  );
  assert.equal(
    parseScoringScreenshot({ text: "1st 60\n0 points per elimination" })
      .elimination,
    "0",
  );
  assert.equal(
    parseScoringScreenshot({ text: "1st 60 (+7)" }).elimination,
    null,
  );
});

test("invalid or empty screenshot imports cannot replace existing scoring rules", () => {
  assert.ok(validateScoringImport([], ""));
  assert.ok(
    validateScoringImport(
      [
        { rank: "1", points: "60" },
        { rank: "1", points: "53" },
      ],
      "2",
    ),
  );
  assert.ok(
    validateScoringImport(
      [
        { rank: "1", points: "5" },
        { rank: "2", points: "10" },
      ],
      "2",
    ),
  );
  assert.ok(validateScoringImport([{ rank: "101", points: "60" }], "2"));
  assert.ok(validateScoringImport([{ rank: "1", points: "60" }], "-1"));
  assert.equal(
    parseScoringScreenshot({ text: "No table\n1st (+7)" }).tiers.length,
    0,
  );
});
