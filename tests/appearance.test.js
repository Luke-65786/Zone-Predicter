import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_APPEARANCE,
  normalizeAppearance,
  resolveTheme,
  migrateAppearance,
  resolveAccent,
  contrastRatio,
  ACCENTS,
} from "../src/appearance.js";

test("saved appearance retains valid choices and explicit false preferences", () => {
  const preferences = {
    ...DEFAULT_APPEARANCE,
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
      customColor: "url(https://invalid.example)",
      textSize: "huge",
      corners: "invalid",
      background: "remote",
      width: "99999px",
      homeLayout: "unknown",
      startPage: "https://invalid.example",
    }),
    DEFAULT_APPEARANCE,
  );
  assert.deepEqual(normalizeAppearance({ theme: "graphite" }), {
    ...DEFAULT_APPEARANCE,
    theme: "graphite",
  });
});

test("system preference follows the device without overriding an explicit theme", () => {
  assert.equal(resolveTheme("system", true), "battle");
  assert.equal(resolveTheme("system", false), "daylight");
  assert.equal(resolveTheme("graphite", false), "graphite");
  assert.equal(resolveTheme("daylight", true), "daylight");
});

test("only untouched old defaults migrate to the new dark Fortnite-inspired palette", () => {
  const old = {
    theme: "midnight",
    accent: "indigo",
    density: "comfortable",
    stickyNav: true,
    glow: true,
    reduceMotion: false,
  };
  assert.equal(migrateAppearance(old).theme, "battle");
  assert.equal(migrateAppearance(old).accent, "victory");
  assert.equal(migrateAppearance({ ...old, accent: "rose" }).accent, "rose");
  assert.equal(
    migrateAppearance({ ...old, density: "compact" }).theme,
    "midnight",
  );
  assert.equal(migrateAppearance({ ...old, version: 2 }).theme, "midnight");
});

test("custom accent foregrounds and highlights retain readable contrast for extreme colors", () => {
  for (const color of [
    "#000000",
    "#ffffff",
    "#ffff00",
    "#777777",
    "#0000ff",
    "#ff0099",
  ]) {
    const settings = normalizeAppearance({
      accent: "custom",
      customColor: color,
    });
    const accent = resolveAccent(settings);
    assert.ok(contrastRatio(accent.primary, accent.foreground) >= 4.5);
    assert.ok(contrastRatio(accent.dark, "#28344f") >= 4.5);
    assert.ok(contrastRatio(accent.light, "#e7edf6") >= 4.5);
  }
  for (const accent of Object.keys(ACCENTS)) {
    const resolved = resolveAccent(normalizeAppearance({ accent }));
    assert.ok(contrastRatio(resolved.primary, resolved.foreground) >= 4.5);
  }
});
