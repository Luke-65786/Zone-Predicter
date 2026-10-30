import React from "react";
import { Field } from "./ToolUI.jsx";
import { MAPS } from "./map-source.js";

export default function MapSelector({ value, onChange }) {
  return (
    <Field label="Island map">
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {MAPS.map((map) => (
          <option key={map.id} value={map.id}>
            {map.name}
          </option>
        ))}
      </select>
    </Field>
  );
}
