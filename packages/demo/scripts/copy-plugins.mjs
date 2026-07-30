import { cpSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dest = resolve(__dirname, "../public/plugins");

const plugins = [
  {
    pkg: "plugin-solar-missions",
    files: [
      { src: "dist/solar-missions.iife.js", name: "solar-missions.iife.js" },
      { src: "screenshot.png", name: "solar-missions.png" },
    ],
  },
  {
    pkg: "plugin-game-theory",
    files: [
      { src: "dist/game-theory.iife.js", name: "game-theory.iife.js" },
      { src: "screenshot.png", name: "game-theory.png" },
    ],
  },
  {
    pkg: "plugin-hwsec",
    files: [
      { src: "dist/hwsec.iife.js", name: "hwsec.iife.js" },
    ],
  },
  {
    pkg: "plugin-retail-brand",
    files: [
      { src: "dist/retail-brand.iife.js", name: "retail-brand.iife.js" },
    ],
  },
  {
    pkg: "plugin-risk",
    files: [
      { src: "dist/risk.iife.js", name: "risk.iife.js" },
    ],
  },
  {
    pkg: "plugin-innovation",
    files: [
      { src: "dist/innovation.iife.js", name: "innovation.iife.js" },
    ],
  },
  {
    pkg: "plugin-law",
    files: [
      { src: "dist/law.iife.js", name: "law.iife.js" },
    ],
  },
  {
    pkg: "plugin-threat",
    files: [
      { src: "dist/threat.iife.js", name: "threat.iife.js" },
    ],
  },
  {
    pkg: "plugin-playground",
    files: [
      { src: "dist/playground.iife.js", name: "playground.iife.js" },
    ],
  },
  {
    pkg: "plugin-world-events",
    files: [
      { src: "dist/world-events.iife.js", name: "world-events.iife.js" },
    ],
  },
];

mkdirSync(dest, { recursive: true });

for (const plugin of plugins) {
  const pkgRoot = resolve(__dirname, "../..", plugin.pkg);
  for (const f of plugin.files) {
    const src = resolve(pkgRoot, f.src);
    if (!existsSync(src)) {
      console.warn(`  skip: ${plugin.pkg}/${f.src} (not built yet)`);
      continue;
    }
    cpSync(src, resolve(dest, f.name));
    console.log(`  copy: ${plugin.pkg}/${f.src} → plugins/${f.name}`);
  }
}
