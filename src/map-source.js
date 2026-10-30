// The image URL selected by the user. No map API or automatic map selection.
export const MAP_SOURCE_URL = "https://fortnite-api.com/images/map_en.png";
export const BUNDLED_MAP_PATH = "maps/fortnite-map.png";

export const DEFAULT_MAP_ID = "battle-royale";
export const MAPS = [
  {
    id: DEFAULT_MAP_ID,
    name: "Battle Royale · Original map",
    path: BUNDLED_MAP_PATH,
    source: MAP_SOURCE_URL,
  },
  {
    id: "nightmare-reload",
    name: "Nightmare Island · Reload",
    path: "maps/nightmare-island-reload.png",
    source: null,
  },
];
export const normalizeMapId = (id) =>
  MAPS.some((map) => map.id === id) ? id : DEFAULT_MAP_ID;
export const getMap = (id) => MAPS.find((map) => map.id === normalizeMapId(id));
