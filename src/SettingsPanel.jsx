import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCheck,
  LayoutGrid,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Settings2,
  Sparkles,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { ACCENTS, DEFAULT_APPEARANCE, accentForeground } from "./appearance.js";
import { TOOLS } from "./tool-catalog.js";

const themeChoices = [
  {
    id: "battle",
    name: "Battle Royale",
    description: "Dark blue, cyan, purple, and victory yellow.",
    icon: Zap,
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep blue. Clear focus.",
    icon: Moon,
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "A quieter shade of dark.",
    icon: LayoutGrid,
  },
  {
    id: "daylight",
    name: "Daylight",
    description: "Light, crisp, and open.",
    icon: Sun,
  },
  {
    id: "system",
    name: "System",
    description: "Follow your device.",
    icon: Monitor,
  },
];

export default function SettingsPanel({
  settings,
  update,
  reset,
  saved,
  onClose,
}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const resetRef = useRef(null);
  const [customHex, setCustomHex] = useState(settings.customColor);
  useEffect(() => setCustomHex(settings.customColor), [settings.customColor]);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, []);

  function toggle(key, title, description) {
    return (
      <label className="preference-toggle">
        <span>
          <strong>{title}</strong>
          <small id={`preference-${key}-description`}>{description}</small>
        </span>
        <input
          type="checkbox"
          aria-label={title}
          aria-describedby={`preference-${key}-description`}
          className="preference-checkbox"
          checked={settings[key]}
          onChange={(event) => update({ [key]: event.target.checked })}
        />
        <span className="preference-track" aria-hidden="true">
          <span />
        </span>
      </label>
    );
  }

  function choice(key, title, description, options) {
    return (
      <label className="density-choice" htmlFor={`appearance-${key}`}>
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <select
          id={`appearance-${key}`}
          aria-label={title}
          value={settings[key]}
          onChange={(event) => update({ [key]: event.target.value })}
        >
          {options.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      className="settings-dialog"
      aria-labelledby="settings-title"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        if (event.shiftKey && document.activeElement === closeRef.current) {
          event.preventDefault();
          resetRef.current?.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === resetRef.current
        ) {
          event.preventDefault();
          closeRef.current?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          onClose();
      }}
    >
      <div className="settings-inner">
        <header className="settings-heading">
          <div>
            <span className="settings-eyebrow">
              <Settings2 size={12} /> YOUR WORKSPACE
            </span>
            <h2 id="settings-title">
              Make it yours<span>.</span>
            </h2>
            <p>A little more you. The same game plan.</p>
          </div>
          <button
            className="icon-button settings-close"
            aria-label="Close settings"
            ref={closeRef}
            onClick={onClose}
            autoFocus
          >
            <X size={20} />
          </button>
        </header>
        <div className="settings-scroll">
          <fieldset className="settings-section">
            <legend>
              <Palette size={15} /> Theme
            </legend>
            <div className="theme-choices">
              {themeChoices.map(({ id, name, description, icon: Icon }) => (
                <label
                  key={id}
                  className={`theme-choice ${settings.theme === id ? "choice-selected" : ""}`}
                >
                  <input
                    className="visually-hidden"
                    type="radio"
                    name="appearance-theme"
                    value={id}
                    aria-label={`${name} theme`}
                    checked={settings.theme === id}
                    onChange={() => update({ theme: id })}
                  />
                  <span
                    className={`theme-thumbnail preview-${id}`}
                    aria-hidden="true"
                  >
                    <i className="preview-nav" />
                    <span className="preview-content">
                      <i />
                      <span>
                        <b />
                        <i />
                        <i />
                      </span>
                    </span>
                    <span className="theme-preview-orb" />
                  </span>
                  <span className="theme-caption">
                    <Icon size={13} />
                    <strong>{name}</strong>
                    {settings.theme === id && <Check size={13} />}
                  </span>
                  <small>{description}</small>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="settings-section">
            <legend>
              <Sparkles size={15} /> Accent color
            </legend>
            <p className="settings-description">
              Your buttons, highlights, and finishing touches.
            </p>
            <div className="accent-choices">
              {Object.entries(ACCENTS).map(([id, accent]) => (
                <label
                  key={id}
                  className={`accent-choice ${settings.accent === id ? "choice-selected" : ""}`}
                >
                  <input
                    className="visually-hidden"
                    type="radio"
                    name="appearance-accent"
                    value={id}
                    aria-label={`${accent.name} accent`}
                    checked={settings.accent === id}
                    onChange={() => update({ accent: id })}
                  />
                  <span
                    className="accent-swatch"
                    style={{
                      background:
                        id === "custom" ? settings.customColor : accent.primary,
                      color: accentForeground(
                        id === "custom" ? settings.customColor : accent.primary,
                      ),
                    }}
                  >
                    {settings.accent === id && <Check size={14} />}
                  </span>
                  <small>{accent.name}</small>
                </label>
              ))}
            </div>
            <div className="custom-accent-editor">
              <label htmlFor="custom-accent-color">Your own accent</label>
              <div>
                <input
                  id="custom-accent-color"
                  type="color"
                  aria-label="Custom accent color"
                  value={settings.customColor}
                  onChange={(event) =>
                    update({
                      accent: "custom",
                      customColor: event.target.value,
                    })
                  }
                />
                <input
                  type="text"
                  aria-label="Custom accent hex"
                  maxLength={7}
                  spellCheck={false}
                  value={customHex}
                  aria-invalid={!/^#[0-9a-f]{6}$/i.test(customHex)}
                  onChange={(event) => {
                    setCustomHex(event.target.value);
                    if (/^#[0-9a-f]{6}$/i.test(event.target.value))
                      update({
                        accent: "custom",
                        customColor: event.target.value,
                      });
                  }}
                />
              </div>
              <p>
                Pick a color or enter its hex code. Button text and highlights
                adjust for readability.
              </p>
              {!/^#[0-9a-f]{6}$/i.test(customHex) && (
                <p className="custom-color-error">
                  Use a hex color such as #33c6ff.
                </p>
              )}
            </div>
          </fieldset>
          <section
            className="settings-section display-settings"
            aria-labelledby="layout-heading"
          >
            <h3 id="layout-heading">
              <Palette size={15} /> Layout and style
            </h3>
            {choice(
              "background",
              "Background style",
              "Grid adds a rolling light when Ambient glow is on.",
              [
                ["aurora", "Aurora"],
                ["grid", "Grid"],
                ["plain", "Plain"],
              ],
            )}
            {choice(
              "corners",
              "Card corners",
              "Choose the shape of your panels.",
              [
                ["soft", "Soft"],
                ["round", "Rounded"],
                ["sharp", "Sharp"],
              ],
            )}
            {choice(
              "textSize",
              "Text size",
              "Give labels, instructions, and tables more room.",
              [
                ["standard", "Standard"],
                ["large", "Larger"],
              ],
            )}
            {choice(
              "width",
              "Workspace width",
              "Use more screen space or keep things focused.",
              [
                ["standard", "Standard"],
                ["wide", "Wide"],
                ["focused", "Focused"],
              ],
            )}
            {choice(
              "homeLayout",
              "Home page layout",
              "Choose tool cards or a simpler list.",
              [
                ["grid", "Grid"],
                ["list", "List"],
              ],
            )}
            {choice(
              "startPage",
              "Start page",
              "Opens next visit when you use the website’s main link.",
              [["home", "Home"], ...TOOLS.map((tool) => [tool.id, tool.name])],
            )}
          </section>
          <section
            className="settings-section display-settings"
            aria-labelledby="display-heading"
          >
            <h3 id="display-heading">
              <LayoutGrid size={15} /> Display
            </h3>
            <label className="density-choice" htmlFor="appearance-density">
              <span>
                <strong>Layout spacing</strong>
                <small>Make room for the way you work.</small>
              </span>
              <select
                aria-label="Layout spacing"
                id="appearance-density"
                value={settings.density}
                onChange={(event) => update({ density: event.target.value })}
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </label>
            {toggle(
              "stickyNav",
              "Sticky navigation",
              "Keep your tools within reach as you scroll.",
            )}
            {toggle(
              "glow",
              "Ambient glow",
              "Add soft lighting to backgrounds and result cards.",
            )}
            {toggle(
              "reduceMotion",
              "Reduce motion",
              "Minimize transitions. Device preferences are respected.",
            )}
          </section>
          <div className="settings-reassurance">
            <CheckCheck size={15} />
            <p>
              Appearance only. Your points targets, zone settings, and map stay
              as they are.
            </p>
          </div>
        </div>
        <footer className="settings-footer">
          <span className={saved ? "preferences-saved" : "preferences-unsaved"}>
            <span />
            {saved ? "Saved in this browser" : "Applied for this session"}
          </span>
          <button
            onClick={() => {
              setCustomHex(DEFAULT_APPEARANCE.customColor);
              reset();
            }}
            ref={resetRef}
            className="preferences-reset"
          >
            <RotateCcw size={13} /> Reset appearance
          </button>
        </footer>
      </div>
    </dialog>
  );
}
