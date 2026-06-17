/**
 * Sweep runner: per ogni modello Ollama Cloud esegue answer + evaluate in una o piu'
 * "varianti" di configurazione opencode, per confrontarle.
 *
 *   clean  -> opencode isolato (solo provider ollama-clean, nessun plugin) via XDG_CONFIG_HOME
 *   cloud  -> config opencode globale dell'utente (con i plugin), provider ollama-cloud
 *
 * Il giudice della fase evaluate e' sempre lo stesso modello, sempre in config pulita,
 * cosi' le differenze riflettono il modello generatore e non il giudice.
 *
 * Env:
 *   OLLAMA_API_KEY     (obbligatoria) chiave Ollama Cloud
 *   OC_CLEAN_XDG       (obbligatoria) path della dir XDG isolata con la config pulita
 *   OC_VARIANTS        default "clean,cloud"
 *   OC_JUDGE           default "ollama-clean/gpt-oss:120b"
 *   OC_ANSWER_TIMEOUT  default 300000 (ms) passato ad answer via -o
 *   OC_MODELS          opzionale: lista CSV per limitare i modelli (debug)
 */
import { writeFileSync, appendFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

const KEY = process.env.OLLAMA_API_KEY;
const CLEAN_XDG = process.env.OC_CLEAN_XDG;
const VARIANTS = (process.env.OC_VARIANTS || "clean,cloud").split(",").map(s => s.trim()).filter(Boolean);
const JUDGE = process.env.OC_JUDGE || "ollama-clean/gpt-oss:120b";
const ANSWER_TIMEOUT = parseInt(process.env.OC_ANSWER_TIMEOUT || "300000", 10);
const REPO = process.cwd();
const LOG = resolve(REPO, "results", "sweep.log");
const STATUS = resolve(REPO, "results", "sweep-status.json");

if (!KEY) { console.error("OLLAMA_API_KEY mancante"); process.exit(1); }
if (!CLEAN_XDG) { console.error("OC_CLEAN_XDG mancante"); process.exit(1); }
if (!existsSync(resolve(REPO, "results"))) mkdirSync(resolve(REPO, "results"), { recursive: true });

const PROVIDER_OF: Record<string, string> = { clean: "ollama-clean", cloud: "ollama-cloud" };

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  appendFileSync(LOG, line + "\n");
}

type StepStatus = { variant: string; model: string; answerMs: number; answerOk: boolean; evalOk: boolean; error?: string };
const status: { startedAt: string; updatedAt: string; total: number; done: number; steps: StepStatus[] } = {
  startedAt: new Date().toISOString(), updatedAt: "", total: 0, done: 0, steps: []
};
function saveStatus() { status.updatedAt = new Date().toISOString(); writeFileSync(STATUS, JSON.stringify(status, null, 2)); }

async function runStep(args: string[], env: Record<string, string | undefined>, hardTimeoutMs: number): Promise<{ ok: boolean; ms: number; err?: string }> {
  const start = Date.now();
  try {
    const proc = Bun.spawn([process.execPath, "run", ...args], { cwd: REPO, env, stdout: "pipe", stderr: "pipe" });
    let killed = false;
    const timer = setTimeout(() => { killed = true; proc.kill(); }, hardTimeoutMs);
    const exitCode = await proc.exited;
    clearTimeout(timer);
    const ms = Date.now() - start;
    if (killed) return { ok: false, ms, err: "hard-timeout" };
    return { ok: exitCode === 0, ms, err: exitCode === 0 ? undefined : `exit ${exitCode}` };
  } catch (e: any) {
    return { ok: false, ms: Date.now() - start, err: e?.message || String(e) };
  }
}

async function main() {
  log(`=== SWEEP START · varianti=${VARIANTS.join(",")} · giudice=${JUDGE} ===`);
  const tags: any = await fetch("https://ollama.com/api/tags", { headers: { Authorization: `Bearer ${KEY}` } }).then(r => r.json());
  let models: string[] = (tags.models || []).map((m: any) => m.name).sort();
  if (process.env.OC_MODELS) {
    const only = new Set(process.env.OC_MODELS.split(",").map(s => s.trim()));
    models = models.filter(m => only.has(m));
  }
  status.total = models.length * VARIANTS.length;
  log(`Modelli: ${models.length} · step totali (answer+eval): ${status.total}`);

  for (const variant of VARIANTS) {
    const provider = PROVIDER_OF[variant];
    if (!provider) { log(`Variante sconosciuta: ${variant}, salto`); continue; }
    // env base per la variante: clean isola via XDG, cloud usa il globale dell'utente
    const answerEnv: Record<string, string | undefined> = { ...process.env };
    if (variant === "clean") answerEnv.XDG_CONFIG_HOME = CLEAN_XDG;
    else answerEnv.XDG_CONFIG_HOME = undefined; // usa ~/.config globale con i plugin
    // evaluate sempre in config pulita (giudice costante)
    const evalEnv: Record<string, string | undefined> = { ...process.env, XDG_CONFIG_HOME: CLEAN_XDG };

    for (const m of models) {
      const modelId = `${provider}/${m}`;
      const st: StepStatus = { variant, model: m, answerMs: 0, answerOk: false, evalOk: false };
      log(`--- [${variant}] ${modelId} : ANSWER`);
      const a = await runStep(["src/answer.ts", "-m", modelId, "-o", String(ANSWER_TIMEOUT)], answerEnv, ANSWER_TIMEOUT + 120000);
      st.answerMs = a.ms; st.answerOk = a.ok; if (!a.ok) st.error = `answer: ${a.err}`;
      log(`    answer ${a.ok ? "OK" : "FAIL(" + a.err + ")"} in ${(a.ms / 1000).toFixed(1)}s`);
      if (a.ok) {
        log(`--- [${variant}] ${modelId} : EVALUATE (judge ${JUDGE})`);
        const e = await runStep(["src/evaluate.ts", "-m", modelId, "-e", JUDGE], evalEnv, 180000);
        st.evalOk = e.ok; if (!e.ok) st.error = (st.error ? st.error + " | " : "") + `eval: ${e.err}`;
        log(`    evaluate ${e.ok ? "OK" : "FAIL(" + e.err + ")"} in ${(e.ms / 1000).toFixed(1)}s`);
      }
      status.steps.push(st); status.done++; saveStatus();
    }
  }
  log(`=== SWEEP DONE · ${status.done}/${status.total} step ===`);
  saveStatus();
  process.exit(0);
}

main().catch(e => { log("FATAL: " + (e?.stack || e)); process.exit(1); });
