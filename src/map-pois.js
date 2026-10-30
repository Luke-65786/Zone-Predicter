// Approximate named-label positions, manually mapped from the square image
// supplied by the user, normalized to the app's 1,000 × 1,000 map coordinates.
// These are image annotations, not live game coordinates. Update this catalog
// when replacing the map image; no API is used to discover or change POIs.
export const MAP_POIS = Object.freeze(
  [
    { name: "Lifty Lodge", x: 286, y: 210 },
    { name: "Freaky Fields", x: 565, y: 246 },
    { name: "Wonkeeland", x: 694, y: 325 },
    { name: "Chopped Shop", x: 159, y: 349 },
    { name: "Nightmare Neighborhood", x: 374, y: 368 },
    { name: "Green Hill Zone", x: 293, y: 496 },
    { name: "Reality's Reign", x: 552, y: 493 },
    { name: "Golden Grove", x: 728, y: 544 },
    { name: "Stone Sanctum", x: 421, y: 631 },
    { name: "Shaken Sanctuary", x: 617, y: 673 },
    { name: "Heatwave Harbor", x: 203, y: 681 },
    { name: "Sunken Shores", x: 404, y: 784 },
    { name: "Cluster Coast", x: 671, y: 799 },
  ].map((poi) => Object.freeze(poi)),
);

// Label anchors from the user's 786 × 809 Nightmare Island screenshot.
// SVG images fit inside the square map; include its horizontal letterboxing.
export const NIGHTMARE_POIS = Object.freeze(
  [
    ["Terror Turrets", 242, 190],
    ["Estranged Estate", 429, 235],
    ["Gravey Gates", 159, 325],
    ["Creepy Cabins", 549, 340],
    ["Haunted Hamlet", 354, 409],
    ["Leech Lake", 254, 484],
    ["Revenge Reels", 493, 487],
    ["Punishment Patch", 239, 586],
    ["Spooky Suburbs", 560, 615],
    ["Retail Ruin", 350, 684],
  ].map(([name, x, y]) =>
    Object.freeze({ name, x: ((x + 11.5) / 809) * 1000, y: (y / 809) * 1000 }),
  ),
);
