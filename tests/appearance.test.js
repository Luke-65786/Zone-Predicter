import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_APPEARANCE,
  normalizeAppearance,
  resolveTheme,
} from "../src/appearance.js";

test("saved appearance retains valid choices and explicit false preferences", () => {
  const preferences = {
    theme: "daylight",
    accent: "mint",
    density: "compact",
    stickyNav: false,
    glow: false,
    reduceMotion: true,
  };
  assert.deepEqual(normalizeAppearance(preferences), preferences);
  assert.equal(normalizeAppearance({ glow: false }).glow, false);
});

test("invalid or partial saved settings fall back safely without arbitrary attributes", () => {
  assert.deepEqual(normalizeAppearance(null), DEFAULT_APPEARANCE);
  assert.deepEqual(
    normalizeAppearance({
      theme: "unknown",
      accent: "__proto__",
      density: "tiny",
      stickyNav: "false",
      glow: 0,
      reduceMotion: "true",
      extra: "ignored",
    }),
    DEFAULT_APPEARANCE,
  );
  assert.deepEqual(normalizeAppearance({ theme: "graphite" }), {
    ...DEFAULT_APPEARANCE,
    theme: "graphite",
  });
});

test("system preference follows the device without overriding an explicit theme", () => {
  assert.equal(resolveTheme("system", true), "midnight");
  assert.equal(resolveTheme("system", false), "daylight");
  assert.equal(resolveTheme("graphite", false), "graphite");
  assert.equal(resolveTheme("daylight", true), "daylight");
});
