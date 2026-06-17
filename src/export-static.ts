/**
 * Genera una versione STATICA della dashboard in ./dist, pubblicabile su GitHub Pages.
 * Riusa i loader di dashboard.ts (stessa logica del server live), serializza i dati in
 * file JSON statici e riscrive le chiamate fetch + i path assoluti in relativi cosi'
 * il sito funziona anche servito da una sottocartella (es. /repo-name/).
 *
 * Non esegue benchmark: legge solo i results gia' presenti nel repo.
 * Eseguire dopo `build:dashboard` (che produce public/dashboard.js).
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from "fs";
import { resolve, join } from "path";
import { loadAllRuns, loadModelData } from "./dashboard.ts";

const ROOT = process.cwd();
const PUBLIC = resolve(ROOT, "public");
const DIST = resolve(ROOT, "dist");
const API = resolve(DIST, "api");

mkdirSync(API, { recursive: true });

// 1) Dati statici (stessa forma delle API /api/runs e /api/models del server)
const runs = loadAllRuns();
const models = Object.fromEntries(loadModelData());
writeFileSync(join(API, "runs.json"), JSON.stringify(runs));
writeFileSync(join(API, "models.json"), JSON.stringify(models));

// 2) index.html con path relativi
const indexSrc = join(PUBLIC, "index.html");
if (!existsSync(indexSrc)) { console.error("public/index.html mancante"); process.exit(1); }
let html = readFileSync(indexSrc, "utf-8")
  .replace('href="/dashboard.css"', 'href="dashboard.css"')
  .replace('src="/dashboard.js"', 'src="dashboard.js"');
writeFileSync(join(DIST, "index.html"), html);

// 3) bundle JS con fetch -> file statici relativi
const jsSrc = join(PUBLIC, "dashboard.js");
if (!existsSync(jsSrc)) { console.error("public/dashboard.js mancante: esegui prima `bun run build:dashboard`"); process.exit(1); }
let js = readFileSync(jsSrc, "utf-8")
  .replaceAll("'/api/runs'", "'api/runs.json'")
  .replaceAll('"/api/runs"', '"api/runs.json"')
  .replaceAll("'/api/models'", "'api/models.json'")
  .replaceAll('"/api/models"', '"api/models.json"');
writeFileSync(join(DIST, "dashboard.js"), js);

// 4) css + asset
copyFileSync(join(PUBLIC, "dashboard.css"), join(DIST, "dashboard.css"));
// disabilita Jekyll su Pages (serve file/cartelle con _ o particolari)
writeFileSync(join(DIST, ".nojekyll"), "");

console.log(`✅ Export statico in ${DIST}`);
console.log(`   modelli: ${Object.keys(models).length} · runs: ${runs.runs.length}`);
