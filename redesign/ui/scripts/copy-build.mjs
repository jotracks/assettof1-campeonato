import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildDir = path.resolve(__dirname, "../../__ui_build");
const outJs = path.resolve(__dirname, "../../js/ui.bundle.js");

if (!fs.existsSync(buildDir)) {
  console.error("Build dir not found:", buildDir);
  process.exit(1);
}

const built = path.resolve(buildDir, "ui.bundle.js");
if (!fs.existsSync(built)) {
  console.error("Built file not found:", built);
  process.exit(1);
}

fs.mkdirSync(path.dirname(outJs), { recursive: true });
fs.copyFileSync(built, outJs);

const map = built + ".map";
if (fs.existsSync(map)) {
  fs.copyFileSync(map, outJs + ".map");
}

console.log("Copied:", built, "->", outJs);
