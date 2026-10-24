export const APPEARANCE_KEY = "compiq-appearance-v1";
export const THEMES = ["midnight", "graphite", "daylight", "system"];
export const ACCENTS = {
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
};
export const DEFAULT_APPEARANCE = Object.freeze({
  theme: "midnight",
  accent: "indigo",
  density: "comfortable",
  stickyNav: true,
  glow: true,
  reduceMotion: false,
});

export function normalizeAppearance(value) {
  const raw = value && typeof value === "object" ? value : {};
  return {
    theme: THEMES.includes(raw.theme) ? raw.theme : DEFAULT_APPEARANCE.theme,
    accent: Object.hasOwn(ACCENTS, raw.accent)
      ? raw.accent
      : DEFAULT_APPEARANCE.accent,
    density: ["comfortable", "compact"].includes(raw.density)
      ? raw.density
      : DEFAULT_APPEARANCE.density,
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

export function readAppearance() {
  try {
    return normalizeAppearance(
      JSON.parse(localStorage.getItem(APPEARANCE_KEY)),
    );
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function resolveTheme(theme, systemDark) {
  return theme === "system" ? (systemDark ? "midnight" : "daylight") : theme;
}

export function applyAppearance(settings, systemDark) {
  const root = document.documentElement;
  const theme = resolveTheme(settings.theme, systemDark);
  const accent = ACCENTS[settings.accent];
  root.dataset.theme = theme;
  root.dataset.themeMode = settings.theme;
  root.dataset.accent = settings.accent;
  root.dataset.density = settings.density;
  root.dataset.stickyNav = String(settings.stickyNav);
  root.dataset.glow = String(settings.glow);
  root.dataset.reduceMotion = String(settings.reduceMotion);
  root.style.setProperty("--primary", accent.primary);
  root.style.setProperty(
    "--blue",
    theme === "daylight" ? accent.light : accent.dark,
  );
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    {
      midnight: "#0a1020",
      graphite: "#101114",
      daylight: "#f3f5fa",
    }[theme],
  );
}
