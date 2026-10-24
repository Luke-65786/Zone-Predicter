export const APPEARANCE_KEY = "compiq-appearance-v1";
export const THEMES = ["battle", "midnight", "graphite", "daylight", "system"];
export const ACCENTS = {
  victory: {
    name: "Victory",
    primary: "#f7d343",
    dark: "#69e5ff",
    light: "#006078",
  },
  storm: {
    name: "Storm",
    primary: "#7139d8",
    dark: "#c5a2ff",
    light: "#6530ad",
  },
  slurp: {
    name: "Slurp",
    primary: "#08678d",
    dark: "#68e7f5",
    light: "#00657c",
  },
  indigo: {
    name: "Indigo",
    primary: "#5365ed",
    dark: "#a3b2ff",
    light: "#4355c1",
  },
  mint: { name: "Mint", primary: "#137654", dark: "#7ce3b7", light: "#116d4d" },
  rose: { name: "Rose", primary: "#b4356c", dark: "#ffa1ca", light: "#a82a62" },
  amber: {
    name: "Amber",
    primary: "#8b570b",
    dark: "#f5ca7a",
    light: "#805008",
  },
  custom: { name: "Custom", primary: "#33c6ff" },
};
export const DEFAULT_APPEARANCE = Object.freeze({
  version: 2,
  theme: "battle",
  accent: "victory",
  customColor: "#33c6ff",
  density: "comfortable",
  textSize: "standard",
  corners: "soft",
  background: "aurora",
  width: "standard",
  homeLayout: "grid",
  startPage: "home",
  stickyNav: true,
  glow: true,
  reduceMotion: false,
});

export function normalizeAppearance(value) {
  const raw = value && typeof value === "object" ? value : {};
  return {
    version: 2,
    theme: THEMES.includes(raw.theme) ? raw.theme : DEFAULT_APPEARANCE.theme,
    accent: Object.hasOwn(ACCENTS, raw.accent)
      ? raw.accent
      : DEFAULT_APPEARANCE.accent,
    customColor: /^#[0-9a-f]{6}$/i.test(raw.customColor)
      ? raw.customColor.toLowerCase()
      : DEFAULT_APPEARANCE.customColor,
    density: ["comfortable", "compact"].includes(raw.density)
      ? raw.density
      : DEFAULT_APPEARANCE.density,
    textSize: ["standard", "large"].includes(raw.textSize)
      ? raw.textSize
      : DEFAULT_APPEARANCE.textSize,
    corners: ["soft", "round", "sharp"].includes(raw.corners)
      ? raw.corners
      : DEFAULT_APPEARANCE.corners,
    background: ["aurora", "grid", "plain"].includes(raw.background)
      ? raw.background
      : DEFAULT_APPEARANCE.background,
    width: ["standard", "wide", "focused"].includes(raw.width)
      ? raw.width
      : DEFAULT_APPEARANCE.width,
    homeLayout: ["grid", "list"].includes(raw.homeLayout)
      ? raw.homeLayout
      : DEFAULT_APPEARANCE.homeLayout,
    startPage: [
      "home",
      "points",
      "zones",
      "tracker",
      "scoring",
      "plans",
      "practice",
    ].includes(raw.startPage)
      ? raw.startPage
      : DEFAULT_APPEARANCE.startPage,
    stickyNav:
      typeof raw.stickyNav === "boolean"
        ? raw.stickyNav
        : DEFAULT_APPEARANCE.stickyNav,
    glow: typeof raw.glow === "boolean" ? raw.glow : DEFAULT_APPEARANCE.glow,
    reduceMotion:
      typeof raw.reduceMotion === "boolean"
        ? raw.reduceMotion
        : DEFAULT_APPEARANCE.reduceMotion,
  };
}

export function migrateAppearance(raw) {
  const oldDefaults = {
    theme: "midnight",
    accent: "indigo",
    density: "comfortable",
    stickyNav: true,
    glow: true,
    reduceMotion: false,
  };
  const untouched =
    raw &&
    raw.version === undefined &&
    Object.entries(oldDefaults).every(([key, value]) => raw[key] === value);
  return normalizeAppearance(
    untouched ? { ...raw, theme: "battle", accent: "victory" } : raw,
  );
}

export function readAppearance() {
  try {
    return migrateAppearance(JSON.parse(localStorage.getItem(APPEARANCE_KEY)));
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function resolveTheme(theme, systemDark) {
  return theme === "system" ? (systemDark ? "battle" : "daylight") : theme;
}

function luminance(hex) {
  const values = hex
    .slice(1)
    .match(/../g)
    .map((value) => {
      const channel = parseInt(value, 16) / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
export function contrastRatio(a, b) {
  const light = luminance(a),
    dark = luminance(b);
  return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
}
export function accentForeground(primary) {
  const dark = contrastRatio(primary, "#0a1020") >= 4.5 ? "#0a1020" : "#000000";
  return contrastRatio(primary, dark) > contrastRatio(primary, "#ffffff")
    ? dark
    : "#ffffff";
}
function readableAccent(color, light) {
  const original = color
    .slice(1)
    .match(/../g)
    .map((value) => parseInt(value, 16));
  const background = light ? "#e7edf6" : "#28344f";
  for (let step = 0; step <= 20; step++) {
    const candidate =
      "#" +
      original
        .map((channel) =>
          Math.round(channel + (((light ? 0 : 255) - channel) * step) / 20)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("");
    if (contrastRatio(candidate, background) >= 4.5) return candidate;
  }
  return light ? "#000000" : "#ffffff";
}
export function resolveAccent(settings) {
  const accent =
    settings.accent === "custom"
      ? {
          name: "Custom",
          primary: settings.customColor,
          dark: readableAccent(settings.customColor, false),
          light: readableAccent(settings.customColor, true),
        }
      : ACCENTS[settings.accent];
  return { ...accent, foreground: accentForeground(accent.primary) };
}

export function applyAppearance(settings, systemDark) {
  const root = document.documentElement;
  const theme = resolveTheme(settings.theme, systemDark);
  const accent = resolveAccent(settings);
  root.dataset.theme = theme;
  root.dataset.themeMode = settings.theme;
  root.dataset.accent = settings.accent;
  root.dataset.density = settings.density;
  root.dataset.stickyNav = String(settings.stickyNav);
  root.dataset.glow = String(settings.glow);
  root.dataset.reduceMotion = String(settings.reduceMotion);
  for (const key of [
    "textSize",
    "corners",
    "background",
    "width",
    "homeLayout",
  ])
    root.dataset[key] = settings[key];
  root.style.setProperty("--primary", accent.primary);
  root.style.setProperty("--on-primary", accent.foreground);
  root.style.setProperty(
    "--blue",
    theme === "daylight" ? accent.light : accent.dark,
  );
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    {
      battle: "#080e24",
      midnight: "#0a1020",
      graphite: "#101114",
      daylight: "#f3f5fa",
    }[theme],
  );
}
