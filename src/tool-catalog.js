import {
  Activity,
  Calculator,
  CheckSquare,
  Crosshair,
  Route,
  Send,
  Trophy,
} from "lucide-react";

export const TOOLS = [
  {
    id: "points",
    name: "Points calculator",
    icon: Calculator,
    label: "PLAN YOUR POINTS",
    description:
      "Set your target. See the points you need per game and build your tournament plan.",
    features: [
      "Your own points target",
      "Game-by-game breakdown",
      "Track your progress",
    ],
  },
  {
    id: "zones",
    name: "Zone predictor",
    icon: Crosshair,
    label: "EXPLORE YOUR ROTATION",
    description:
      "Place the first zone on your map and explore possible zone-four pulls and rotations.",
    features: [
      "Interactive Fortnite map",
      "Zone and rotation estimates",
      "POI-based deadside overlay",
    ],
  },
  {
    id: "drops",
    name: "Drop map",
    icon: Send,
    label: "OWN YOUR LANDING",
    description:
      "Plot your bus route and landing spot to explore a jump point, glider deployment, and approach timing.",
    features: [
      "Bus, jump, and glide map",
      "Zoom in on your landing",
      "Save drops and export your map",
    ],
  },
  {
    id: "tracker",
    name: "Tournament tracker",
    icon: Activity,
    label: "EVERY GAME COUNTS",
    description:
      "Log each result and see whether you are ahead or behind your tournament target.",
    features: [
      "Editable game log",
      "Live remaining pace",
      "Load a saved plan’s target",
    ],
  },
  {
    id: "scoring",
    name: "Scoring calculator",
    icon: Trophy,
    label: "KNOW YOUR SCORING",
    description:
      "Use your event’s placement and elimination rules to work out scores and target combinations.",
    features: [
      "Custom event scoring",
      "Calculate a game result",
      "Placement and elimination options",
    ],
  },
  {
    id: "plans",
    name: "Tournament planner",
    icon: Route,
    label: "YOUR WHOLE GAME PLAN",
    description:
      "Save your tournament target, landing spots, loot route, and rotation notes in one place.",
    features: [
      "Multiple named tournament plans",
      "Draw drops and routes on the map",
      "Save positions and rotation notes",
    ],
  },
  {
    id: "practice",
    name: "Practice checklist",
    icon: CheckSquare,
    label: "MAKE PRACTICE COUNT",
    description:
      "Build a routine for warm-ups, aim, building, scrims, and reviewing your games.",
    features: [
      "Daily session checklists",
      "Add your own practice drills",
      "Keep notes and track progress",
    ],
  },
];
