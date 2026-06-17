/**
 * Legge tutti i results/*.json e produce:
 *   - results/SUMMARY.md  : leaderboard leggibile (per variante) + confronto latenza clean vs cloud
 *   - results/sweep-status.json : stato derivato e completo (una riga per modello/variante)
 * Non chiama modelli: pura aggregazione dei dati gia' prodotti.
 */
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import type { RunSummary } from "./types.ts";

const RESULTS = resolve("./results");
type Row = { variant: string; model: string; testCase: string; latencyMs: number; correct: boolean; score: number };

const rows: Row[] = [];
for (const f of readdirSync(RESULTS).filter(f => f.endsWith(".json") && f !== "sweep-status.json")) {
  let run: RunSummary;
  try { run = JSON.parse(readFileSync(join(RESULTS, f), "utf-8")); } catch { continue; }
  for (const r of run.results || []) {
    const variant = r.model.startsWith("ollama-clean/") ? "clean" : r.model.startsWith("ollama-cloud/") ? "cloud" : "other";
    const base = r.model.includes("/") ? r.model.split("/").slice(1).join("/") : r.model;
    rows.push({
      variant,
      model: base,
      testCase: r.testCase,
      latencyMs: r.latencyMs || 0,
      correct: r.llmVerification ? r.llmVerification.correct : r.correct,
      score: r.llmVerification ? r.llmVerification.score : r.score,
    });
  }
}

function fmtTable(variant: string): string {
  const rs = rows.filter(r => r.variant === variant).sort((a, b) => (b.score - a.score) || (a.latencyMs - b.latencyMs));
  const lines = ["| Modello | OK | Score | Latenza |", "|---|:--:|:--:|--:|"];
  for (const r of rs) lines.push(`| \`${r.model}\` | ${r.correct ? "✅" : "❌"} | ${r.score.toFixed(2)} | ${(r.latencyMs / 1000).toFixed(1)}s |`);
  return lines.join("\n");
}

// confronto latenza per modello presente in entrambe le varianti
const byModel = new Map<string, { clean?: number; cloud?: number }>();
for (const r of rows) {
  const e = byModel.get(r.model) || {};
  if (r.variant === "clean") e.clean = r.latencyMs; else if (r.variant === "cloud") e.cloud = r.latencyMs;
  byModel.set(r.model, e);
}
const cmp = [...byModel.entries()].filter(([, v]) => v.clean && v.cloud)
  .map(([m, v]) => ({ m, clean: v.clean!, cloud: v.cloud!, ratio: v.cloud! / v.clean! }))
  .sort((a, b) => b.ratio - a.ratio);

const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const cleanAvg = avg(rows.filter(r => r.variant === "clean").map(r => r.latencyMs));
const cloudAvg = avg(rows.filter(r => r.variant === "cloud").map(r => r.latencyMs));

let md = `# Benchmark summary\n\n`;
md += `Task: \`CODING-typescript-rust\` · giudice: \`ollama-clean/gpt-oss:120b\`.\n\n`;
md += `- **clean** = opencode isolato, senza plugin\n- **cloud** = config opencode globale (con plugin \`oh-my-openagent\`/ultraworker)\n\n`;
md += `## Confronto latenza clean vs cloud\n\n`;
md += `Latenza media answer: **clean ${(cleanAvg / 1000).toFixed(1)}s** vs **cloud ${(cloudAvg / 1000).toFixed(1)}s** `;
md += `(cloud ~${(cloudAvg / cleanAvg).toFixed(1)}× piu' lento).\n\n`;
md += `| Modello | clean | cloud | cloud/clean |\n|---|--:|--:|:--:|\n`;
for (const c of cmp) md += `| \`${c.m}\` | ${(c.clean / 1000).toFixed(1)}s | ${(c.cloud / 1000).toFixed(1)}s | ${c.ratio.toFixed(1)}× |\n`;
md += `\n## Leaderboard — clean\n\n${fmtTable("clean")}\n\n## Leaderboard — cloud\n\n${fmtTable("cloud")}\n`;
writeFileSync(join(RESULTS, "SUMMARY.md"), md);

// stato derivato completo
const status = {
  generatedAt: new Date().toISOString(),
  task: "CODING-typescript-rust",
  judge: "ollama-clean/gpt-oss:120b",
  totalRows: rows.length,
  byVariant: { clean: rows.filter(r => r.variant === "clean").length, cloud: rows.filter(r => r.variant === "cloud").length },
  rows: rows.sort((a, b) => a.variant.localeCompare(b.variant) || a.model.localeCompare(b.model)),
};
writeFileSync(join(RESULTS, "sweep-status.json"), JSON.stringify(status, null, 2));

console.log(`SUMMARY: ${rows.length} righe (clean=${status.byVariant.clean}, cloud=${status.byVariant.cloud})`);
console.log(`Latenza media: clean ${(cleanAvg / 1000).toFixed(1)}s · cloud ${(cloudAvg / 1000).toFixed(1)}s`);
