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
