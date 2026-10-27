import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDirectory, "..");

const [siteText, championshipText] = await Promise.all([
  readFile(path.join(projectRoot, "data", "site.json"), "utf8"),
  readFile(path.join(projectRoot, "data", "championship.json"), "utf8")
]);

const snapshot = {
  site: JSON.parse(siteText),
  championship: JSON.parse(championshipText)
};

const serialized = JSON.stringify(snapshot).replaceAll("</", "<\\/");
const output = `// Generado desde data/site.json y data/championship.json.\nwindow.ASSETTO_F1_SNAPSHOT = ${serialized};\n`;

await writeFile(path.join(projectRoot, "js", "data-snapshot.js"), output, "utf8");
console.log("Snapshot local actualizado: js/data-snapshot.js");
