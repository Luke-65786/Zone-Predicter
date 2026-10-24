import React from "react";
import { ArrowRight, Calculator, Check, Crosshair, Palette } from "lucide-react";

const tools = [
  {
    id: "points",
    name: "Points calculator",
    icon: Calculator,
    label: "PLAN YOUR POINTS",
    description: "Set your target. See the points you need per game and build your tournament plan.",
    features: ["Your own points target", "Game-by-game breakdown", "Track your progress"],
  },
  {
    id: "zones",
    name: "Zone predictor",
    icon: Crosshair,
    label: "EXPLORE YOUR ROTATION",
    description: "Place the first zone on your map and explore possible zone-four pulls and rotations.",
    features: ["Interactive Fortnite map", "Zone and rotation estimates", "POI-based deadside overlay"],
  },
];

export default function HomePage({ onOpenSettings }) {
  return (
    <div className="page-shell home-page">
      <section className="home-intro">
        <div className="eyebrow"><span /> FORTNITE COMPETITIVE TOOLKIT</div>
        <h1>Your game plan <span>starts here.</span></h1>
        <p>Choose a tool to plan your points or explore your next rotation.</p>
      </section>
      <div className="home-tools" aria-label="Choose your tool">
        {tools.map(({ id, name, icon: Icon, label, description, features }) => (
          <a
            key={id}
            className={`home-tool home-tool-${id}`}
            href={`#${id}`}
            aria-label={`Open ${name.toLowerCase()}`}
          >
            <div className="home-tool-preview" aria-hidden="true">
              <span className="home-tool-icon"><Icon size={27} /></span>
              <span className="home-preview-label">{label}</span>
              {id === "points" ? (
                <div className="home-preview-bars"><i /><i /><i /><i /><i /></div>
              ) : (
                <div className="home-preview-rings"><i /><i /><i /><span /></div>
              )}
            </div>
            <div className="home-tool-content">
              <h2>{name}</h2>
              <p>{description}</p>
              <ul>
                {features.map((feature) => <li key={feature}><Check size={14} />{feature}</li>)}
              </ul>
              <span className="home-tool-action">Open {name.toLowerCase()} <ArrowRight size={18} /></span>
            </div>
          </a>
        ))}
      </div>
      <section className="home-appearance" aria-label="Customize your workspace">
        <span className="home-appearance-icon"><Palette size={20} /></span>
        <div>
          <h2>Make it yours.</h2>
          <p>Pick a theme, accent color, and layout that feels right.</p>
        </div>
        <button onClick={onOpenSettings}>Customize appearance <ArrowRight size={15} /></button>
      </section>
    </div>
  );
}
