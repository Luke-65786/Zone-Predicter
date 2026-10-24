import React from "react";
import { ArrowRight, Check, Palette } from "lucide-react";
import { TOOLS } from "./tool-catalog.js";

export default function HomePage({ onOpenSettings }) {
  return (
    <div className="page-shell home-page">
      <section className="home-intro">
        <div className="eyebrow">
          <span /> FORTNITE COMPETITIVE TOOLKIT
        </div>
        <h1>
          Your game plan <span>starts here.</span>
        </h1>
        <p>Plan your tournament. Track your games. Make your practice count.</p>
      </section>
      <div className="home-tools" aria-label="Choose your tool">
        {TOOLS.map(({ id, name, icon: Icon, label, description, features }) => (
          <a
            key={id}
            className={`home-tool home-tool-${id}`}
            href={`#${id}`}
            aria-label={`Open ${name.toLowerCase()}`}
          >
            <div className="home-tool-preview" aria-hidden="true">
              <span className="home-tool-icon">
                <Icon size={27} />
              </span>
              <span className="home-preview-label">{label}</span>
              {id === "points" ? (
                <div className="home-preview-bars">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              ) : id === "zones" ? (
                <div className="home-preview-rings">
                  <i />
                  <i />
                  <i />
                  <span />
                </div>
              ) : (
                <Icon
                  className="home-preview-symbol"
                  size={115}
                  strokeWidth={1}
                />
              )}
            </div>
            <div className="home-tool-content">
              <h2>{name}</h2>
              <p>{description}</p>
              <ul>
                {features.map((feature) => (
                  <li key={feature}>
                    <Check size={14} />
                    {feature}
                  </li>
                ))}
              </ul>
              <span className="home-tool-action">
                Open {name.toLowerCase()} <ArrowRight size={18} />
              </span>
            </div>
          </a>
        ))}
      </div>
      <section
        className="home-appearance"
        aria-label="Customize your workspace"
      >
        <span className="home-appearance-icon">
          <Palette size={20} />
        </span>
        <div>
          <h2>Make it yours.</h2>
          <p>Pick a theme, accent color, and layout that feels right.</p>
        </div>
        <button onClick={onOpenSettings}>
          Customize appearance <ArrowRight size={15} />
        </button>
      </section>
    </div>
  );
}
