import { useState, useMemo, useCallback } from "react";
import { useSolarMissions } from "../../hooks/useSolarMissions";
import type { SolarMission, MissionEvent, CelestialBody } from "../../hooks/useSolarMissions";
import { text, border, palette } from "../../theme";
import { LoadingState } from "../common";

const SVG_W = 1400;
const SVG_H = 800;
const CX = SVG_W / 2;
const CY = SVG_H / 2;
const MAX_ORBIT_R = 370;
const STRETCH_X = SVG_W / SVG_H;

const BODY_COLORS: Record<string, string> = {
  sun: "#FFD700",
  mercury: "#B0B0B0",
  venus: "#E8C87A",
  earth: "#4A9EE8",
  mars: "#E85A3A",
  jupiter: "#D4956A",
  saturn: "#E8C87A",
  uranus: "#67E8F9",
  neptune: "#4A6AE8",
  pluto: "#C0B8D0",
  ceres: "#A0A0A0",
  vesta: "#808080",
  "67p-churyumov-gerasimenko": "#8B9A6B",
};

const PLANET_ANGLES: Record<string, number> = {
  mercury: 25,
  venus: 70,
  earth: 125,
  mars: 175,
  jupiter: 225,
  saturn: 275,
  uranus: 320,
  neptune: 5,
  pluto: 50,
  ceres: 200,
  vesta: 190,
};

const MISSION_PALETTE = [
  palette.cyan, palette.rose, palette.amber, palette.emerald,
  palette.purple, "#4A9EE8", palette.orange, "#ff6b9d",
  "#00d4aa", "#ffd93d", "#6c5ce7", "#a8e6cf",
  "#ff8a5c", "#ea8685", "#7ec8e3", "#c7b198",
  "#b8e986", "#ffc5a1", "#d4a5ff", "#87ceeb",
  "#f0e68c", "#dda0dd", "#98fb98", "#ffa07a",
  "#20b2aa",
];

const STATUS_COLORS: Record<string, string> = {
  Active: palette.emerald,
  Completed: palette.cyan,
  Inactive: text.muted,
  InDevelopment: palette.amber,
};

function auToRadius(au: number): number {
  if (au <= 0) return 0;
  return Math.pow(au, 0.45) * (MAX_ORBIT_R / Math.pow(45, 0.45));
}

function polarToXY(au: number, deg: number): [number, number] {
  const r = auToRadius(au);
  const rad = (deg * Math.PI) / 180;
  return [CX + r * STRETCH_X * Math.cos(rad), CY - r * Math.sin(rad)];
}

function bodyKey(uri: string): string {
  const hash = uri.lastIndexOf("#");
  if (hash >= 0) return uri.substring(hash + 1);
  const slash = uri.lastIndexOf("/");
  if (slash >= 0) return uri.substring(slash + 1);
  return uri;
}

function bodyDisplayRadius(radiusKm: number, type: string): number {
  if (type === "Star") return 22;
  if (radiusKm <= 0) return 3;
  return Math.max(3, Math.min(14, 1.5 + Math.log10(radiusKm) * 2.2));
}

export interface SolarSystemExplorerProps {
  ontologyNs?: string;
}

export function SolarSystemExplorer({
  ontologyNs: _ontologyNs,
}: SolarSystemExplorerProps = {}) {
  const { bodies, missions, bodyMap, isLoading, error } = useSolarMissions();

  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [hoveredMission, setHoveredMission] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<MissionEvent | null>(null);

  const stars = useMemo(() => {
    const result: { x: number; y: number; r: number; opacity: number }[] = [];
    let seed = 42;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 400; i++) {
      result.push({
        x: rand() * SVG_W,
        y: rand() * SVG_H,
        r: rand() * 1.0 + 0.15,
        opacity: rand() * 0.5 + 0.08,
      });
    }
    return result;
  }, []);

  const orbitBodies = useMemo(() =>
    bodies.filter(b => b.type !== "Star" && !b.parentBody && b.distanceAu > 0),
  [bodies]);

  const missionColorMap = useMemo(() => {
    const map = new Map<string, string>();
    missions.forEach((m, i) => map.set(m.uri, MISSION_PALETTE[i % MISSION_PALETTE.length]));
    return map;
  }, [missions]);

  const trajectories = useMemo(() =>
    missions.map(m => {
      const points = m.events.map(e => polarToXY(e.distanceAu, e.longitudeDeg));
      return { mission: m, points, color: missionColorMap.get(m.uri) || palette.cyan };
    }),
  [missions, missionColorMap]);

  const activeMission = useMemo(() =>
    missions.find(m => m.uri === selectedMission) || null,
  [missions, selectedMission]);

  const handleMissionClick = useCallback((uri: string) => {
    setSelectedMission(prev => prev === uri ? null : uri);
    setSelectedEvent(null);
  }, []);

  const handleEventClick = useCallback((evt: MissionEvent) => {
    setSelectedEvent(prev => prev?.uri === evt.uri ? null : evt);
  }, []);

  if (isLoading) {
    return (
      <div style={{ height: "calc(100vh - 110px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingState message="Loading solar system data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: "calc(100vh - 110px)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ color: palette.rose, fontSize: 14, fontFamily: "'IBM Plex Mono', monospace" }}>
          Failed to load solar system data
        </div>
        <div style={{ color: text.muted, fontSize: 11 }}>{error.message}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 110px)", overflow: "hidden" }}>
      {/* Solar system SVG */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#030308" }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: "100%", height: "100%" }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Filters */}
            <filter id="glow-soft">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-strong">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-planet">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>

            {/* Sun */}
            <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFF8E1" stopOpacity="1" />
              <stop offset="20%" stopColor="#FFD700" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#FFA500" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#FF6B00" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#FF4500" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="sun-corona" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.12" />
              <stop offset="40%" stopColor="#FFA500" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#FF4500" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="sun-surface" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FFFDE7" />
              <stop offset="40%" stopColor="#FFD54F" />
              <stop offset="70%" stopColor="#FFB300" />
              <stop offset="100%" stopColor="#E65100" />
            </radialGradient>

            {/* Mercury — cratered gray */}
            <radialGradient id="planet-mercury" cx="38%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#C8C8C8" />
              <stop offset="50%" stopColor="#9E9E9E" />
              <stop offset="100%" stopColor="#5A5A5A" />
            </radialGradient>

            {/* Venus — hazy yellow atmosphere */}
            <radialGradient id="planet-venus" cx="40%" cy="38%" r="62%">
              <stop offset="0%" stopColor="#FFF3C4" />
              <stop offset="35%" stopColor="#F5DEB3" />
              <stop offset="70%" stopColor="#D4A04A" />
              <stop offset="100%" stopColor="#8B6914" />
            </radialGradient>
            <radialGradient id="venus-atmo" cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="#F5DEB3" stopOpacity="0" />
              <stop offset="85%" stopColor="#F5DEB3" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#F5DEB3" stopOpacity="0" />
            </radialGradient>

            {/* Earth — blue marble */}
            <radialGradient id="planet-earth" cx="38%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#87CEEB" />
              <stop offset="25%" stopColor="#4A9EE8" />
              <stop offset="55%" stopColor="#2E6BBF" />
              <stop offset="100%" stopColor="#1A3A5C" />
            </radialGradient>
            <radialGradient id="earth-atmo" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="#4A9EE8" stopOpacity="0" />
              <stop offset="90%" stopColor="#87CEEB" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#87CEEB" stopOpacity="0" />
            </radialGradient>

            {/* Mars — rust red */}
            <radialGradient id="planet-mars" cx="40%" cy="38%" r="62%">
              <stop offset="0%" stopColor="#E8A07A" />
              <stop offset="35%" stopColor="#CC5533" />
              <stop offset="70%" stopColor="#A0341A" />
              <stop offset="100%" stopColor="#5C1A0A" />
            </radialGradient>

            {/* Jupiter — banded gas giant */}
            <linearGradient id="planet-jupiter" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C4956A" />
              <stop offset="12%" stopColor="#E8C8A0" />
              <stop offset="22%" stopColor="#B87840" />
              <stop offset="30%" stopColor="#F0D8B0" />
              <stop offset="40%" stopColor="#D4956A" />
              <stop offset="48%" stopColor="#E0B888" />
              <stop offset="55%" stopColor="#C87840" />
              <stop offset="62%" stopColor="#E8C098" />
              <stop offset="70%" stopColor="#B06830" />
              <stop offset="78%" stopColor="#D4A878" />
              <stop offset="88%" stopColor="#C08050" />
              <stop offset="100%" stopColor="#A06030" />
            </linearGradient>
            <radialGradient id="jupiter-shading" cx="38%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#fff" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.4" />
            </radialGradient>

            {/* Saturn — golden banded */}
            <linearGradient id="planet-saturn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E8D5A0" />
              <stop offset="15%" stopColor="#D4C088" />
              <stop offset="30%" stopColor="#E8D8B0" />
              <stop offset="45%" stopColor="#C8A860" />
              <stop offset="60%" stopColor="#DCC890" />
              <stop offset="75%" stopColor="#C0A058" />
              <stop offset="100%" stopColor="#A08840" />
            </linearGradient>
            <radialGradient id="saturn-shading" cx="38%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.12" />
              <stop offset="50%" stopColor="#fff" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.35" />
            </radialGradient>
            <linearGradient id="saturn-ring" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#C8B888" stopOpacity="0" />
              <stop offset="15%" stopColor="#D8C898" stopOpacity="0.5" />
              <stop offset="30%" stopColor="#E8D8A8" stopOpacity="0.3" />
              <stop offset="45%" stopColor="#C0A878" stopOpacity="0.15" />
              <stop offset="55%" stopColor="#D8C898" stopOpacity="0.45" />
              <stop offset="75%" stopColor="#E0D0A0" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#C8B888" stopOpacity="0" />
            </linearGradient>

            {/* Uranus — pale cyan ice giant */}
            <radialGradient id="planet-uranus" cx="40%" cy="38%" r="62%">
              <stop offset="0%" stopColor="#B0F0F0" />
              <stop offset="35%" stopColor="#67E8F9" />
              <stop offset="70%" stopColor="#3BB8C8" />
              <stop offset="100%" stopColor="#1A6070" />
            </radialGradient>

            {/* Neptune — deep blue ice giant */}
            <radialGradient id="planet-neptune" cx="38%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#7090E8" />
              <stop offset="35%" stopColor="#4A6AE8" />
              <stop offset="70%" stopColor="#2844B8" />
              <stop offset="100%" stopColor="#142060" />
            </radialGradient>

            {/* Pluto — pale icy */}
            <radialGradient id="planet-pluto" cx="38%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#E0D8D0" />
              <stop offset="50%" stopColor="#C0B8B0" />
              <stop offset="100%" stopColor="#706860" />
            </radialGradient>

            {/* Small bodies */}
            <radialGradient id="planet-ceres" cx="38%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#B8B0A8" />
              <stop offset="100%" stopColor="#585048" />
            </radialGradient>
            <radialGradient id="planet-vesta" cx="38%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#A8A098" />
              <stop offset="100%" stopColor="#484040" />
            </radialGradient>
            <radialGradient id="planet-67p" cx="38%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#8B9A6B" />
              <stop offset="100%" stopColor="#3A4428" />
            </radialGradient>
          </defs>

          {/* Star field */}
          {stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.opacity} />
          ))}

          {/* Orbital rings */}
          {orbitBodies.map(b => {
            const r = auToRadius(b.distanceAu);
            const key = bodyKey(b.uri);
            const isTarget = activeMission?.targetBodies.includes(b.uri);
            return (
              <ellipse
                key={`orbit-${key}`}
                cx={CX} cy={CY} rx={r * STRETCH_X} ry={r}
                fill="none"
                stroke={isTarget ? (BODY_COLORS[key] || "#444") + "44" : "rgba(255,255,255,0.06)"}
                strokeWidth={isTarget ? 1 : 0.5}
                strokeDasharray={isTarget ? "none" : "2 4"}
              />
            );
          })}

          {/* Sun corona */}
          <circle cx={CX} cy={CY} r={90} fill="url(#sun-corona)" />

          {/* Sun */}
          <circle cx={CX} cy={CY} r={36} fill="url(#sun-glow)" filter="url(#glow-strong)" />
          <circle cx={CX} cy={CY} r={18} fill="url(#sun-surface)" />
          <circle cx={CX} cy={CY} r={18} fill="rgba(255,255,255,0.08)" />

          {/* Mission trajectories */}
          {trajectories.map(({ mission, points, color }) => {
            if (points.length < 2) return null;
            const isSelected = selectedMission === mission.uri;
            const isHovered = hoveredMission === mission.uri;
            const isDimmed = selectedMission && !isSelected;
            const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");

            return (
              <g key={`traj-${mission.uri}`}>
                {/* Glow underlay for selected/hovered */}
                {(isSelected || isHovered) && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth={4}
                    strokeOpacity={0.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow-soft)"
                  />
                )}
                <path
                  d={pathData}
                  fill="none"
                  stroke={color}
                  strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0.8}
                  strokeOpacity={isDimmed ? 0.1 : isSelected ? 0.9 : isHovered ? 0.8 : 0.35}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ cursor: "pointer", transition: "stroke-opacity 0.2s" }}
                  onMouseEnter={() => setHoveredMission(mission.uri)}
                  onMouseLeave={() => setHoveredMission(null)}
                  onClick={() => handleMissionClick(mission.uri)}
                />
                {/* Event dots along trajectory */}
                {mission.events.map((evt, ei) => {
                  const [ex, ey] = polarToXY(evt.distanceAu, evt.longitudeDeg);
                  const isEvtSelected = selectedEvent?.uri === evt.uri;
                  const dotR = evt.type === "Launch" ? 3 : evt.type === "Landing" ? 3 : 2;
                  return (
                    <circle
                      key={`evt-${evt.uri}-${ei}`}
                      cx={ex} cy={ey}
                      r={isEvtSelected ? dotR + 1.5 : dotR}
                      fill={isEvtSelected ? "#fff" : color}
                      stroke={isEvtSelected ? color : "none"}
                      strokeWidth={1.5}
                      opacity={isDimmed ? 0.08 : isSelected ? 0.9 : isHovered ? 0.7 : 0.2}
                      style={{ cursor: "pointer", transition: "all 0.2s" }}
                      onMouseEnter={() => setHoveredMission(mission.uri)}
                      onMouseLeave={() => setHoveredMission(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMission(mission.uri);
                        handleEventClick(evt);
                      }}
                    >
                      <title>{`${evt.date} — ${evt.type}`}</title>
                    </circle>
                  );
                })}
              </g>
            );
          })}

          {/* Planet markers */}
          {orbitBodies.map(b => {
            const key = bodyKey(b.uri);
            const angle = PLANET_ANGLES[key] ?? 0;
            const [px, py] = polarToXY(b.distanceAu, angle);
            const r = bodyDisplayRadius(b.radiusKm, b.type);
            const color = BODY_COLORS[key] || "#888";
            const isTarget = activeMission?.targetBodies.includes(b.uri);
            const gradId = key === "67p-churyumov-gerasimenko" ? "planet-67p" : `planet-${key}`;
            const hasGrad = [
              "mercury","venus","earth","mars","jupiter","saturn",
              "uranus","neptune","pluto","ceres","vesta","67p-churyumov-gerasimenko",
            ].includes(key);

            return (
              <g key={`planet-${key}`}>
                {/* Atmospheric glow for selected targets */}
                {isTarget && (
                  <circle cx={px} cy={py} r={r + 8} fill={color} opacity={0.15}
                    filter="url(#glow-planet)" />
                )}

                {/* Atmospheric halo for Earth and Venus */}
                {key === "earth" && (
                  <circle cx={px} cy={py} r={r + 2} fill="url(#earth-atmo)" />
                )}
                {key === "venus" && (
                  <circle cx={px} cy={py} r={r + 1.5} fill="url(#venus-atmo)" />
                )}

                {/* Saturn rings (behind planet for top half, front for bottom) */}
                {key === "saturn" && (
                  <ellipse
                    cx={px} cy={py}
                    rx={r * 2.2} ry={r * 0.5}
                    fill="none"
                    stroke="url(#saturn-ring)"
                    strokeWidth={r * 0.45}
                    opacity={isTarget ? 0.7 : 0.5}
                    transform={`rotate(-15 ${px} ${py})`}
                  />
                )}

                {/* Planet body */}
                <circle
                  cx={px} cy={py} r={r}
                  fill={hasGrad ? `url(#${gradId})` : color}
                  filter={isTarget ? "url(#glow-planet)" : undefined}
                />

                {/* 3D shading overlay for gas giants */}
                {(key === "jupiter") && (
                  <circle cx={px} cy={py} r={r} fill="url(#jupiter-shading)" />
                )}
                {(key === "saturn") && (
                  <circle cx={px} cy={py} r={r} fill="url(#saturn-shading)" />
                )}

                {/* Specular highlight for rocky/icy bodies */}
                {["mercury","venus","earth","mars","pluto","uranus","neptune"].includes(key) && (
                  <circle cx={px - r * 0.2} cy={py - r * 0.2} r={r * 0.35}
                    fill="rgba(255,255,255,0.12)" />
                )}

                {/* Jupiter Great Red Spot hint */}
                {key === "jupiter" && r > 6 && (
                  <ellipse cx={px + r * 0.25} cy={py + r * 0.15}
                    rx={r * 0.2} ry={r * 0.12}
                    fill="#C04020" opacity="0.35" />
                )}

                {/* Label */}
                <text
                  x={px} y={py - r - 6}
                  fill={isTarget ? color : text.hint}
                  fontSize={isTarget ? 9 : 7}
                  fontFamily="'IBM Plex Mono', monospace"
                  textAnchor="middle"
                  fontWeight={isTarget ? 600 : 400}
                >
                  {b.name}
                </text>
              </g>
            );
          })}

          {/* Hovered mission label */}
          {hoveredMission && !selectedMission && (() => {
            const m = missions.find(m => m.uri === hoveredMission);
            if (!m || m.events.length === 0) return null;
            const last = m.events[m.events.length - 1];
            const [lx, ly] = polarToXY(last.distanceAu, last.longitudeDeg);
            const color = missionColorMap.get(m.uri) || palette.cyan;
            return (
              <text
                x={lx + 8} y={ly - 6}
                fill={color}
                fontSize={9}
                fontFamily="'IBM Plex Mono', monospace"
                fontWeight={600}
                style={{ pointerEvents: "none" }}
              >
                {m.name}
              </text>
            );
          })()}
        </svg>
      </div>

      {/* Side panel */}
      <div style={{
        width: 340,
        borderLeft: `1px solid ${border.default}`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "rgba(10,10,15,0.95)",
      }}>
        {activeMission ? (
          <MissionDetail
            mission={activeMission}
            bodyMap={bodyMap}
            color={missionColorMap.get(activeMission.uri) || palette.cyan}
            selectedEvent={selectedEvent}
            onEventClick={handleEventClick}
            onBack={() => { setSelectedMission(null); setSelectedEvent(null); }}
          />
        ) : (
          <MissionList
            missions={missions}
            bodyMap={bodyMap}
            colorMap={missionColorMap}
            hoveredMission={hoveredMission}
            onSelect={handleMissionClick}
            onHover={setHoveredMission}
          />
        )}
      </div>
    </div>
  );
}

function MissionList({ missions, bodyMap, colorMap, hoveredMission, onSelect, onHover }: {
  missions: SolarMission[];
  bodyMap: Map<string, CelestialBody>;
  colorMap: Map<string, string>;
  hoveredMission: string | null;
  onSelect: (uri: string) => void;
  onHover: (uri: string | null) => void;
}) {
  return (
    <>
      <div style={{
        padding: "14px 16px",
        borderBottom: `1px solid ${border.default}`,
      }}>
        <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Solar System Missions
        </div>
        <div style={{ fontSize: 9, color: text.hint, fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>
          {missions.length} missions · {missions.reduce((s, m) => s + m.events.length, 0)} events
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {missions.map(m => {
          const color = colorMap.get(m.uri) || palette.cyan;
          const statusColor = STATUS_COLORS[m.status] || text.muted;
          const isHovered = hoveredMission === m.uri;
          const targets = m.targetBodies.map(t => bodyMap.get(t)?.name || "").filter(Boolean).join(", ");
          return (
            <button
              key={m.uri}
              onClick={() => onSelect(m.uri)}
              onMouseEnter={() => onHover(m.uri)}
              onMouseLeave={() => onHover(null)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "10px 16px", border: "none",
                borderBottom: `1px solid ${border.default}`,
                background: isHovered ? "rgba(255,255,255,0.03)" : "transparent",
                cursor: "pointer", textAlign: "left", width: "100%",
                transition: "background 0.15s",
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: 4,
                background: color, marginTop: 4, flexShrink: 0,
                boxShadow: `0 0 6px ${color}44`,
              }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 12, color: "#fff", fontWeight: 600,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  lineHeight: 1.3,
                }}>
                  {m.name}
                </div>
                <div style={{
                  fontSize: 9, color: text.hint,
                  fontFamily: "'IBM Plex Mono', monospace",
                  marginTop: 3, display: "flex", gap: 6, alignItems: "center",
                }}>
                  <span>{m.agency}</span>
                  <span style={{ opacity: 0.3 }}>·</span>
                  <span>{m.launchDate.substring(0, 4)}</span>
                  <span style={{ opacity: 0.3 }}>·</span>
                  <span style={{ color: statusColor }}>{m.status === "InDevelopment" ? "In Dev" : m.status}</span>
                </div>
                {targets && (
                  <div style={{
                    fontSize: 9, color: text.disabled,
                    fontFamily: "'IBM Plex Mono', monospace",
                    marginTop: 2,
                  }}>
                    {targets}
                  </div>
                )}
              </div>
              <div style={{
                fontSize: 8, color: text.disabled,
                fontFamily: "'IBM Plex Mono', monospace",
                marginTop: 4,
              }}>
                {m.events.length} evt
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function MissionDetail({ mission, bodyMap, color, selectedEvent, onEventClick, onBack }: {
  mission: SolarMission;
  bodyMap: Map<string, CelestialBody>;
  color: string;
  selectedEvent: MissionEvent | null;
  onEventClick: (evt: MissionEvent) => void;
  onBack: () => void;
}) {
  const statusColor = STATUS_COLORS[mission.status] || text.muted;
  const targets = mission.targetBodies.map(t => bodyMap.get(t)?.name || "").filter(Boolean);
  const typeLabel = mission.type.replace(/([a-z])([A-Z])/g, "$1 $2");

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "16px 16px 0" }}>
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", color: text.hint,
            fontSize: 10, cursor: "pointer", padding: "2px 0", marginBottom: 14,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          &larr; All missions
        </button>

        <div style={{
          fontSize: 9, fontFamily: "'IBM Plex Mono', monospace",
          color, textTransform: "uppercase",
          letterSpacing: "0.05em", marginBottom: 6,
        }}>
          {typeLabel}
        </div>

        <div style={{
          fontSize: 18, fontWeight: 700, color: "#fff",
          lineHeight: 1.3, marginBottom: 10,
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}>
          {mission.name}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <Tag label={mission.agency} color={text.subtle} />
          <Tag label={mission.launchDate} color={text.subtle} />
          <Tag label={mission.status === "InDevelopment" ? "In Development" : mission.status} color={statusColor} />
        </div>

        {targets.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 9, color: text.hint, fontFamily: "'IBM Plex Mono', monospace",
              textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6,
            }}>
              Targets
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {targets.map(t => {
                const bKey = t.toLowerCase();
                const bColor = BODY_COLORS[bKey] || text.muted;
                return (
                  <span key={t} style={{
                    fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                    color: bColor, padding: "2px 8px", borderRadius: 10,
                    border: `1px solid ${bColor}33`, background: `${bColor}10`,
                  }}>
                    {t}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        <div style={{
          fontSize: 9, color: text.hint, fontFamily: "'IBM Plex Mono', monospace",
          textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10,
        }}>
          Events ({mission.events.length})
        </div>

        <div style={{ position: "relative", paddingLeft: 16 }}>
          {/* Timeline line */}
          <div style={{
            position: "absolute", left: 3, top: 6, bottom: 6,
            width: 1, background: `${color}33`,
          }} />

          {mission.events.map((evt, i) => {
            const isSelected = selectedEvent?.uri === evt.uri;
            const nearestName = bodyMap.get(evt.nearestBody)?.name || "";
            const evtLabel = evt.type.replace(/([a-z])([A-Z])/g, "$1 $2");
            return (
              <button
                key={evt.uri || i}
                onClick={() => onEventClick(evt)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "8px 10px", marginBottom: 2,
                  background: isSelected ? "rgba(255,255,255,0.04)" : "transparent",
                  border: "none", borderRadius: 6,
                  cursor: "pointer", position: "relative",
                  transition: "background 0.15s",
                }}
              >
                {/* Timeline dot */}
                <div style={{
                  position: "absolute", left: -13, top: 12,
                  width: 7, height: 7, borderRadius: 4,
                  background: isSelected ? "#fff" : color,
                  border: isSelected ? `2px solid ${color}` : "none",
                  boxShadow: isSelected ? `0 0 8px ${color}66` : "none",
                }} />

                <div style={{
                  fontSize: 9, color: text.disabled,
                  fontFamily: "'IBM Plex Mono', monospace",
                  marginBottom: 2,
                }}>
                  {evt.date}
                  {nearestName && <span style={{ marginLeft: 6, color: text.hint }}>near {nearestName}</span>}
                </div>
                <div style={{
                  fontSize: 10, color: isSelected ? "#fff" : text.subtle,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontWeight: 600, marginBottom: 2,
                }}>
                  {evtLabel}
                </div>
                {isSelected && evt.description && (
                  <div style={{
                    fontSize: 10, color: text.muted,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    lineHeight: 1.5, marginTop: 6,
                    padding: "8px 10px", borderRadius: 6,
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${border.default}`,
                  }}>
                    {evt.description}
                  </div>
                )}
                {isSelected && (
                  <div style={{
                    fontSize: 8, color: text.disabled,
                    fontFamily: "'IBM Plex Mono', monospace",
                    marginTop: 4, display: "flex", gap: 8,
                  }}>
                    <span>{evt.distanceAu.toFixed(2)} AU</span>
                    <span>{evt.longitudeDeg.toFixed(0)}° lon</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 9, fontFamily: "'IBM Plex Mono', monospace",
      padding: "2px 8px", borderRadius: 10,
      border: `1px solid ${color}33`,
      color, background: `${color}08`,
    }}>
      {label}
    </span>
  );
}
