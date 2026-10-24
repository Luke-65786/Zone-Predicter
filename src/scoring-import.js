import { integer, scoringRules } from "./competition.js";

const digits = (value) =>
  value
    .replace(/[Il|]/g, "1")
    .replace(/[Oo]/g, "0")
    .replace(/[Ss]/g, "5")
    .replace(/,/g, "");

function parseLines(lines) {
  const candidates = [];
  for (const line of lines) {
    // Read the total before the parenthesized incremental bonus: 60 (+7) = 60.
    const raw = line.text.replace(/[−–—]/g, "-").trim();
    const match = raw.match(
      /^(?:top\s*|#\s*)?([\dIl|OoSaAqQgG]{1,3})\s*(st|nd|rd|th)?\s*[.:|\-]?\s+([\dOoIl|S][\dOoIl|S,]*)(?=\s|[+(]|$)/i,
    );
    if (!match) continue;
    const rank = integer(digits(match[1]), 1, 100);
    const points = integer(digits(match[3]));
    if (points === null) continue;
    const corrected = /[A-Za-z|]/.test(match[1] + match[3]);
    const review =
      corrected || (Number.isFinite(line.confidence) && line.confidence < 70);
    candidates.push({
      rank,
      points,
      review,
      token: match[1],
      ordinal: !!match[2],
    });
  }
  // Repair an unreadable ordinal only when this exact row exists, both
  // neighboring ranks are consecutive, and every readable digit agrees.
  // Never invent a missing row or infer a points total from the sequence.
  for (let i = 1; i < candidates.length - 1; i++) {
    const row = candidates[i],
      before = candidates[i - 1].rank,
      after = candidates[i + 1].rank;
    if (
      row.rank !== null ||
      !row.ordinal ||
      before === null ||
      after !== before + 2
    )
      continue;
    const expected = String(before + 1);
    if (
      row.token.length === expected.length &&
      [...row.token].every(
        (char, j) => !/\d/.test(char) || char === expected[j],
      )
    ) {
      row.rank = before + 1;
      row.review = true;
    }
  }
  const tiers = candidates
    .filter((row) => row.rank !== null)
    .map(({ rank, points, review }) => ({
      rank: String(rank),
      points: String(points),
      review,
    }));
  const uncertain = tiers.filter((row) => row.review).length;
  return {
    tiers: tiers.sort((a, b) => Number(a.rank) - Number(b.rank)),
    uncertain,
  };
}

function visualLines(blocks) {
  const words = (blocks ?? [])
    .flatMap((block) =>
      (block.paragraphs ?? []).flatMap((paragraph) =>
        (paragraph.lines ?? []).flatMap((line) => line.words ?? []),
      ),
    )
    .filter(
      (word) =>
        word.text?.trim() &&
        word.bbox &&
        Number.isFinite(word.bbox.y0) &&
        Number.isFinite(word.bbox.y1),
    );
  if (!words.length) return [];
  const heights = words
    .map((word) => word.bbox.y1 - word.bbox.y0)
    .filter((height) => height > 0)
    .sort((a, b) => a - b);
  const tolerance = Math.max(
    3,
    (heights[Math.floor(heights.length / 2)] ?? 10) * 0.6,
  );
  const rows = [];
  for (const word of words.sort(
    (a, b) => a.bbox.y0 + a.bbox.y1 - (b.bbox.y0 + b.bbox.y1),
  )) {
    const y = (word.bbox.y0 + word.bbox.y1) / 2;
    let row = rows.at(-1);
    if (!row || Math.abs(row.y - y) > tolerance) {
      row = { y, words: [] };
      rows.push(row);
    }
    row.words.push(word);
    row.y =
      row.words.reduce((sum, w) => sum + (w.bbox.y0 + w.bbox.y1) / 2, 0) /
      row.words.length;
  }
  return rows.map((row) => ({
    text: row.words
      .sort((a, b) => a.bbox.x0 - b.bbox.x0)
      .map((word) => word.text)
      .join(" "),
    confidence: Math.min(...row.words.map((word) => word.confidence ?? 100)),
  }));
}

export function parseScoringScreenshot(data) {
  const text = String(data?.text ?? "");
  const byText = parseLines(
    text.split(/\r?\n/).map((text) => ({ text, confidence: data?.confidence })),
  );
  const byPosition = parseLines(visualLines(data?.blocks));
  const result =
    byPosition.tiers.length >= byText.tiers.length ? byPosition : byText;
  const eliminationPatterns = [
    /(?:points?\s+per\s+elimination|eliminations?(?:\s+points?)?|points?\s+per\s+kill)\s*[:=\-]?\s*(\d{1,4})(?![\d.])/i,
    /\b(\d{1,4})\s*(?:points?\s*)?(?:per|\/)\s*(?:elimination|kill)\b/i,
  ];
  let elimination = null;
  for (const pattern of eliminationPatterns) {
    const match = text.match(pattern);
    if (match && integer(match[1], 0, 1000) !== null) {
      elimination = match[1];
      break;
    }
  }
  const warnings = [];
  if (!result.tiers.length)
    warnings.push(
      "No placement rows were read. Try a sharper crop with both Placement and Points visible.",
    );
  if (result.uncertain)
    warnings.push(
      `${result.uncertain} row${result.uncertain === 1 ? " needs" : "s need"} a closer look. Check the highlighted numbers against your screenshot.`,
    );
  const ranks = new Set(result.tiers.map((tier) => Number(tier.rank)));
  if (
    result.tiers.length &&
    (!ranks.has(1) ||
      [...ranks].some((rank) => rank > 1 && !ranks.has(rank - 1)))
  )
    warnings.push(
      "Some placement numbers are missing. Check that these are intentional scoring tiers rather than missed rows.",
    );
  if (elimination === null)
    warnings.push(
      "No elimination score was found. Your current elimination points will be kept; enter them separately if needed.",
    );
  return { ...result, elimination, warnings, text };
}

export function validateScoringImport(tiers, elimination) {
  if (!tiers.length) return "Add at least one placement row before applying.";
  if (tiers.length > 100) return "Use no more than 100 placement rows.";
  return (
    scoringRules({ tiers, elimination: elimination === "" ? "0" : elimination })
      .error ?? null
  );
}
