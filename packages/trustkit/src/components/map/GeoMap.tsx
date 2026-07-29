import { useRef, useState, useMemo, useCallback } from "react";
import { geoMercator, geoPath, geoNaturalEarth1, geoOrthographic } from "d3-geo";
import type { GeoProjection, GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { useTheme } from "../../theme/ThemeContext";
import type { Theme } from "../../theme/types";

import worldTopo from "world-atlas/countries-110m.json";
import usTopo from "us-atlas/states-10m.json";

import londonData from "../../data/london-boroughs.json";

export interface MapPreset {
  id: string;
  label: string;
  icon?: string;
}

export const MAP_PRESETS: MapPreset[] = [
  { id: "world", label: "World", icon: "🌍" },
  { id: "europe", label: "Europe", icon: "🇪🇺" },
  { id: "uk", label: "United Kingdom", icon: "🇬🇧" },
  { id: "us", label: "United States", icon: "🇺🇸" },
  { id: "london", label: "London", icon: "🏙" },
  { id: "moon", label: "Moon", icon: "🌙" },
];

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  color?: string;
  size?: number;
}

export interface GeoMapProps {
  preset?: string;
  markers?: MapMarker[];
  width?: number;
  height?: number;
  onMarkerClick?: (marker: MapMarker) => void;
  onPresetChange?: (preset: string) => void;
  showPresetSelector?: boolean;
}

const EURO_IDS = new Set([
  "40","56","70","100","191","203","208","233","246","250","276",
  "300","348","352","372","380","428","440","442","499","528","578",
  "616","620","642","688","703","705","724","752","756","826","804",
  "112","8","807","51","31","268","196",
]);

const MOON_FEATURES: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { name: "Mare Imbrium" }, geometry: { type: "Polygon", coordinates: [circleCoords(-15.6, 36.0, 8)] } },
    { type: "Feature", properties: { name: "Mare Serenitatis" }, geometry: { type: "Polygon", coordinates: [circleCoords(17.5, 28.0, 5)] } },
    { type: "Feature", properties: { name: "Mare Tranquillitatis" }, geometry: { type: "Polygon", coordinates: [circleCoords(24.0, 8.5, 6)] } },
    { type: "Feature", properties: { name: "Oceanus Procellarum" }, geometry: { type: "Polygon", coordinates: [circleCoords(-57.4, 18.4, 12)] } },
    { type: "Feature", properties: { name: "Mare Nubium" }, geometry: { type: "Polygon", coordinates: [circleCoords(-16.6, -21.3, 5)] } },
    { type: "Feature", properties: { name: "Mare Frigoris" }, geometry: { type: "Polygon", coordinates: [circleCoords(1.4, 56.0, 7)] } },
    { type: "Feature", properties: { name: "Mare Humorum" }, geometry: { type: "Polygon", coordinates: [circleCoords(-38.6, -24.4, 3.5)] } },
    { type: "Feature", properties: { name: "Mare Crisium" }, geometry: { type: "Polygon", coordinates: [circleCoords(59.1, 17.0, 4.5)] } },
    { type: "Feature", properties: { name: "Mare Fecunditatis" }, geometry: { type: "Polygon", coordinates: [circleCoords(51.3, -7.8, 5)] } },
    { type: "Feature", properties: { name: "Mare Vaporum" }, geometry: { type: "Polygon", coordinates: [circleCoords(3.6, 13.3, 2.5)] } },
    { type: "Feature", properties: { name: "Mare Nectaris" }, geometry: { type: "Polygon", coordinates: [circleCoords(35.5, -15.2, 3)] } },
    { type: "Feature", properties: { name: "Apollo 11" }, geometry: { type: "Point", coordinates: [23.47, 0.67] } },
    { type: "Feature", properties: { name: "Apollo 12" }, geometry: { type: "Point", coordinates: [-23.42, -3.01] } },
    { type: "Feature", properties: { name: "Apollo 14" }, geometry: { type: "Point", coordinates: [-17.47, -3.65] } },
    { type: "Feature", properties: { name: "Apollo 15" }, geometry: { type: "Point", coordinates: [3.63, 26.13] } },
    { type: "Feature", properties: { name: "Apollo 16" }, geometry: { type: "Point", coordinates: [15.50, -8.97] } },
    { type: "Feature", properties: { name: "Apollo 17" }, geometry: { type: "Point", coordinates: [30.77, 20.19] } },
  ],
};

function circleCoords(lng: number, lat: number, radius: number): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i <= 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    pts.push([
      lng + radius * Math.cos(angle) * 1.2,
      lat + radius * Math.sin(angle),
    ]);
  }
  return pts;
}

function getMapData(preset: string, theme: Theme): { geo: GeoJSON.FeatureCollection; projection: GeoProjection; fillColor: string; strokeColor: string } {
  const worldGeo = feature(worldTopo as unknown as Topology, (worldTopo as any).objects.countries) as unknown as GeoJSON.FeatureCollection;
  const usGeo = feature(usTopo as unknown as Topology, (usTopo as any).objects.states) as unknown as GeoJSON.FeatureCollection;

  switch (preset) {
    case "europe": {
      const geo: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: worldGeo.features.filter((f: any) => EURO_IDS.has(f.id)),
      };
      return {
        geo,
        projection: geoMercator().center([15, 52]).scale(600),
        fillColor: theme.palette.emerald + "18",
        strokeColor: theme.palette.emerald + "66",
      };
    }
    case "uk": {
      const geo: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: worldGeo.features.filter((f: any) => f.id === "826" || f.id === "372"),
      };
      return {
        geo,
        projection: geoMercator().center([-3, 54.5]).scale(2000),
        fillColor: theme.palette.cyan + "18",
        strokeColor: theme.palette.cyan + "66",
      };
    }
    case "us": {
      return {
        geo: usGeo,
        projection: geoMercator().center([-98, 38]).scale(800),
        fillColor: theme.palette.blue + "18",
        strokeColor: theme.palette.blue + "66",
      };
    }
    case "london": {
      return {
        geo: londonData as unknown as GeoJSON.FeatureCollection,
        projection: geoMercator(),
        fillColor: theme.palette.amber + "08",
        strokeColor: theme.palette.amber + "aa",
      };
    }
    case "moon": {
      return {
        geo: MOON_FEATURES,
        projection: geoOrthographic().rotate([0, 0]).scale(250).clipAngle(90),
        fillColor: theme.palette.purple + "28",
        strokeColor: theme.palette.purple + "66",
      };
    }
    default: {
      return {
        geo: worldGeo,
        projection: geoNaturalEarth1().scale(150),
        fillColor: theme.palette.emerald + "12",
        strokeColor: theme.palette.emerald + "44",
      };
    }
  }
}

export function GeoMap({
  preset = "world",
  markers = [],
  width = 900,
  height = 500,
  onMarkerClick,
  onPresetChange,
  showPresetSelector = true,
}: GeoMapProps) {
  const { theme, sz } = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);

  const { geo, projection, fillColor, strokeColor } = useMemo(() => getMapData(preset, theme), [preset, theme]);

  const fitProjection = useMemo(() => {
    const p = projection.translate([width / 2, height / 2]);
    if (preset !== "moon") {
      p.fitSize([width - 40, height - 40], geo);
    } else {
      p.translate([width / 2, height / 2]);
    }
    return p;
  }, [projection, geo, width, height, preset]);

  const pathGenerator = useMemo(() => geoPath(fitProjection), [fitProjection]);

  const featurePaths = useMemo(() => {
    return geo.features
      .filter(f => f.geometry.type !== "Point")
      .map((f, i) => ({
        key: (f.properties as any)?.name || `f-${i}`,
        d: pathGenerator(f as GeoPermissibleObjects) || "",
        name: (f.properties as any)?.name || "",
      }));
  }, [geo, pathGenerator]);

  const pointFeatures = useMemo(() => {
    return geo.features
      .filter(f => f.geometry.type === "Point")
      .map(f => {
        const coords = (f.geometry as GeoJSON.Point).coordinates;
        const projected = fitProjection(coords as [number, number]);
        return {
          name: (f.properties as any)?.name || "",
          x: projected?.[0] || 0,
          y: projected?.[1] || 0,
        };
      })
      .filter(p => p.x > 0 && p.y > 0);
  }, [geo, fitProjection]);

  const projectedMarkers = useMemo(() => {
    return markers.map(m => {
      const projected = fitProjection([m.lng, m.lat]);
      return {
        ...m,
        x: projected?.[0] || 0,
        y: projected?.[1] || 0,
      };
    }).filter(m => m.x > 0 && m.y > 0);
  }, [markers, fitProjection]);

  const handleMarkerClick = useCallback((marker: MapMarker) => {
    onMarkerClick?.(marker);
  }, [onMarkerClick]);

  const isMoon = preset === "moon";
  const gridColor = "rgba(255,255,255,0.03)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {showPresetSelector && (
        <div style={{
          display: "flex",
          gap: 4,
          padding: "8px 12px",
          borderBottom: `1px solid ${theme.border.default}`,
        }}>
          {MAP_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => onPresetChange?.(p.id)}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: `1px solid ${preset === p.id ? strokeColor : theme.border.default}`,
                background: preset === p.id ? fillColor : "transparent",
                color: preset === p.id ? theme.text.primary : theme.text.faint,
                fontSize: sz(10),
                fontFamily: "'IBM Plex Mono', monospace",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: "100%",
          maxHeight: "calc(100vh - 200px)",
          background: "transparent",
        }}
      >
        {/* Grid lines */}
        <defs>
          <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={gridColor} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#map-grid)" />

        {/* Moon disc background */}
        {isMoon && (
          <circle
            cx={width / 2}
            cy={height / 2}
            r={250}
            fill="rgba(255,255,255,0.02)"
            stroke={theme.palette.purple + "33"}
            strokeWidth={1}
          />
        )}

        {/* Graticule for moon */}
        {isMoon && (
          <g opacity={0.15}>
            {[-60, -30, 0, 30, 60].map(lat => {
              const gratPath = pathGenerator({
                type: "LineString",
                coordinates: Array.from({ length: 73 }, (_, i) => [i * 5 - 180, lat]),
              } as GeoPermissibleObjects);
              return gratPath ? <path key={`lat-${lat}`} d={gratPath} fill="none" stroke={theme.palette.purple} strokeWidth={0.5} /> : null;
            })}
            {[-120, -60, 0, 60, 120].map(lng => {
              const gratPath = pathGenerator({
                type: "LineString",
                coordinates: Array.from({ length: 37 }, (_, i) => [lng, i * 5 - 90]),
              } as GeoPermissibleObjects);
              return gratPath ? <path key={`lng-${lng}`} d={gratPath} fill="none" stroke={theme.palette.purple} strokeWidth={0.5} /> : null;
            })}
          </g>
        )}

        {/* Map features */}
        {featurePaths.map(fp => (
          <path
            key={fp.key}
            d={fp.d}
            fill={hoveredFeature === fp.key ? fillColor.replace(/[0-9a-f]{2}$/, "44") : fillColor}
            stroke={strokeColor}
            strokeWidth={hoveredFeature === fp.key ? 2 : (preset === "london" ? 1.2 : 0.5)}
            style={{ cursor: "default", transition: "fill 0.15s, stroke-width 0.15s" }}
            onMouseEnter={() => setHoveredFeature(fp.key)}
            onMouseLeave={() => setHoveredFeature(null)}
          >
            <title>{fp.name}</title>
          </path>
        ))}

        {/* Point features (moon landing sites etc.) */}
        {pointFeatures.map(pf => (
          <g key={pf.name}>
            <circle cx={pf.x} cy={pf.y} r={3} fill={theme.palette.amber} opacity={0.8} />
            <text
              x={pf.x + 6}
              y={pf.y + 3}
              fill={theme.palette.amber}
              fontSize={sz(8)}
              fontFamily="'IBM Plex Mono', monospace"
              opacity={0.7}
            >
              {pf.name}
            </text>
          </g>
        ))}

        {/* Markers */}
        {projectedMarkers.map(m => (
          <g
            key={m.id}
            style={{ cursor: onMarkerClick ? "pointer" : "default" }}
            onClick={() => handleMarkerClick(m)}
            onMouseEnter={() => setHoveredMarker(m.id)}
            onMouseLeave={() => setHoveredMarker(null)}
          >
            {/* Glow */}
            <circle
              cx={m.x}
              cy={m.y}
              r={hoveredMarker === m.id ? (m.size || 4) + 4 : (m.size || 4) + 2}
              fill={m.color || theme.palette.amber}
              opacity={hoveredMarker === m.id ? 0.3 : 0.15}
              style={{ transition: "all 0.15s" }}
            />
            {/* Dot */}
            <circle
              cx={m.x}
              cy={m.y}
              r={m.size || 4}
              fill={m.color || theme.palette.amber}
              opacity={0.9}
            />
            {/* Label */}
            {m.label && (
              <text
                x={m.x + (m.size || 4) + 4}
                y={m.y + 3}
                fill={m.color || theme.palette.amber}
                fontSize={sz(9)}
                fontFamily="'IBM Plex Mono', monospace"
                opacity={hoveredMarker === m.id ? 1 : 0.7}
              >
                {m.label}
              </text>
            )}
          </g>
        ))}

        {/* Hovered feature tooltip */}
        {hoveredFeature && !isMoon && (
          <text
            x={12}
            y={height - 12}
            fill={theme.text.subtle}
            fontSize={sz(10)}
            fontFamily="'IBM Plex Mono', monospace"
          >
            {hoveredFeature}
          </text>
        )}
      </svg>
    </div>
  );
}
