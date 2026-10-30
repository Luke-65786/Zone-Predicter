import { MAPS, normalizeMapId } from "./map-source.js";

export function normalizeLayouts(raw, normalize, keys) {
  return Object.fromEntries(
    MAPS.filter((map) => raw?.[map.id] && typeof raw[map.id] === "object").map(
      (map) => {
        const layout = normalize(raw[map.id]);
        return [
          map.id,
          Object.fromEntries(keys.map((key) => [key, layout[key]])),
        ];
      },
    ),
  );
}
export function switchIsland(value, mapId, blank, keys) {
  const mapLayouts = {
    ...value.mapLayouts,
    [normalizeMapId(value.mapId)]: Object.fromEntries(
      keys.map((key) => [key, value[key]]),
    ),
  };
  return {
    mapId: normalizeMapId(mapId),
    mapLayouts,
    ...Object.fromEntries(
      keys.map((key) => [key, (mapLayouts[mapId] ?? blank)[key]]),
    ),
  };
}
