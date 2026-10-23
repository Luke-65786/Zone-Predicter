import React from "react";

export default function ZoneSides({ circle, sides }) {
  if (!sides || sides.status !== "ready") return null;
  const radius = circle.radius;
  return (
    <g
      data-testid="zone-sides-overlay"
      role="img"
      aria-label={`Estimated zone 4 sides: green faces ${sides.deadsideCount} POIs, red faces ${sides.congestedCount} POIs. No live player data.`}
      transform={`translate(${circle.x} ${circle.y}) rotate(${sides.angle})`}
    >
      <title>
        POI-based deadside: green faces fewer mapped POIs; red faces more
      </title>
      <path
        data-testid="deadside-region"
        d={`M0 ${-radius} A${radius} ${radius} 0 0 1 0 ${radius} Z`}
        fill="#45df92"
        fillOpacity="0.6"
      />
      <path
        data-testid="congested-region"
        d={`M0 ${-radius} A${radius} ${radius} 0 0 0 0 ${radius} Z`}
        fill="#fa6478"
        fillOpacity="0.6"
      />
      <path
        d={`M0 ${-radius}V${radius}`}
        stroke="#fff"
        strokeWidth="1.8"
        strokeDasharray="4 5"
        strokeOpacity="0.8"
      />
    </g>
  );
}
