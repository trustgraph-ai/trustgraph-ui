import { useState } from "react";
import {
  SectionLabel,
  GeoMap,
  useTheme,
} from "@trustgraph/trustkit";
import type { MapMarker } from "@trustgraph/trustkit";

const SAMPLE_MARKERS: Record<string, MapMarker[]> = {
  world: [
    { id: "london", lat: 51.51, lng: -0.13, label: "London", color: "#FCD34D" },
    { id: "nyc", lat: 40.71, lng: -74.01, label: "New York", color: "#93C5FD" },
    { id: "tokyo", lat: 35.68, lng: 139.69, label: "Tokyo", color: "#F9A8D4" },
  ],
  europe: [
    { id: "london", lat: 51.51, lng: -0.13, label: "London", color: "#FCD34D" },
    { id: "paris", lat: 48.86, lng: 2.35, label: "Paris", color: "#93C5FD" },
    { id: "berlin", lat: 52.52, lng: 13.41, label: "Berlin", color: "#F9A8D4" },
  ],
  uk: [
    { id: "london", lat: 51.51, lng: -0.13, label: "London", color: "#FCD34D" },
    { id: "edinburgh", lat: 55.95, lng: -3.19, label: "Edinburgh", color: "#93C5FD" },
    { id: "cardiff", lat: 51.48, lng: -3.18, label: "Cardiff", color: "#F9A8D4" },
  ],
  us: [
    { id: "nyc", lat: 40.71, lng: -74.01, label: "New York", color: "#FCD34D" },
    { id: "la", lat: 34.05, lng: -118.24, label: "Los Angeles", color: "#93C5FD" },
    { id: "chicago", lat: 41.88, lng: -87.63, label: "Chicago", color: "#F9A8D4" },
  ],
  london: [
    { id: "city", lat: 51.514, lng: -0.092, label: "City of London", color: "#FCD34D" },
    { id: "westminster", lat: 51.497, lng: -0.137, label: "Westminster", color: "#93C5FD" },
    { id: "greenwich", lat: 51.483, lng: 0.006, label: "Greenwich", color: "#F9A8D4" },
  ],
  moon: [],
};

export default function Playground() {
  const { theme, sz } = useTheme();
  const [preset, setPreset] = useState("world");

  return (
    <>
      <div style={{
        padding: "10px 28px",
        borderBottom: `1px solid ${theme.border.default}`,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}>
        <SectionLabel>PLAYGROUND</SectionLabel>
        <span style={{
          fontSize: sz(11),
          color: theme.text.subtle,
          fontStyle: "italic",
          marginLeft: 8,
        }}>
          Experimental sandbox.
        </span>
      </div>

      <div style={{ padding: "0 28px" }}>
        <GeoMap
          preset={preset}
          onPresetChange={setPreset}
          markers={SAMPLE_MARKERS[preset] || []}
          onMarkerClick={(m) => console.log("clicked:", m.label)}
        />
      </div>
    </>
  );
}
