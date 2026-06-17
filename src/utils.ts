import { existsSync, mkdirSync, readFileSync, mkdtempSync, rmSync } from "fs";
import { resolve, join, dirname } from "path";
import { tmpdir } from "os";
import type { RunSummary } from "./types.ts";

export const SOLUTIONS_DIR = resolve("./solutions");
export const RESULTS_DIR = resolve("./results");

export function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export function sanitizeModelName(model: string): string {
  return model
    .replace(/[^a-zA-Z0-9]/g, (match) => {
      if (match === "/" || match === ":" || match === "-") return "-";
      if (match === ".") return "-";
      return "_";
    })
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateRunId(): string {
  return `run_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
}

export function loadExistingResults(model: string): RunSummary | null {
  const sanitized = sanitizeModelName(model);
  const resultPath = join(RESULTS_DIR, `${sanitized}.json`);
  
  if (!existsSync(resultPath)) {
    return null;
  }

  const content = readFileSync(resultPath, "utf-8");
  try {
    const parsed = JSON.parse(content);
    if (isRunSummary(parsed)) {
      return parsed;
    } else {
      console.error(`❌ Invalid result format in ${resultPath}`);
      return null;
    }
  } catch (e) {
    console.error(`❌ Failed to parse ${resultPath}:`, e);
    return null;
  }
}

export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runOpencode(
  prompt: string,
  model: string,
  timeout: number
): Promise<{ output: string; error?: string; latencyMs?: number }> {
  // Validate model name to prevent command injection
  if (!validateModelName(model)) {
    return { output: "", error: `Invalid model name: ${model}` };
  }

  // Esegue opencode in una sandbox usa-e-getta: i tool agentici del modello possono
  // scrivere/cancellare file solo lì, mai nel repo del benchmark.
  const sandbox = mkdtempSync(join(tmpdir(), "opencode-bench-"));
  try {
    const startTime = Date.now();
    const proc = Bun.spawn([resolveOpencodeBin(), "run", "--model", model, prompt], {
      cwd: sandbox,
      env: { ...process.env, OPENCODE_MODEL: model },
      stdout: "pipe",
      stderr: "pipe"
    });

    let killed = false;
    const timeoutPromise = new Promise<{ output: string; error: string; latencyMs: number }>((_, reject) => {
      setTimeout(() => {
        killed = true;
        proc.kill("SIGTERM");
        setTimeout(() => {
          if (!proc.exited) proc.kill("SIGKILL");
        }, 5000);
        reject({ output: "", error: "Timeout", latencyMs: Date.now() - startTime });
      }, timeout);
    });

    const outputPromise = (async (): Promise<{ output: string; error?: string; latencyMs: number }> => {
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;
      const latencyMs = Date.now() - startTime;
      
      if (killed) {
        return { output: "", error: "Timeout", latencyMs };
      }
      
      // opencode scrive diagnostica/reasoning su stderr anche in caso di successo:
      // ci si fida del solo exit code, non di substring "error:" nello stderr.
      if (exitCode === 0) {
        return { output: stdout, error: undefined, latencyMs };
      } else {
        return { output: stdout, error: stderr || `Exit code: ${exitCode}`, latencyMs };
      }
    })();

    return await Promise.race([outputPromise, timeoutPromise]);
  } catch (e: any) {
    return { output: "", error: e.message || String(e), latencyMs: 0 };
  } finally {
    try { rmSync(sandbox, { recursive: true, force: true }); } catch {}
  }
}

export interface ArgsResult {
  model?: string;
  testCase?: string;
  timeout?: number;
}

export function parseArgs(args: string[]): ArgsResult {
  const result: ArgsResult = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-m" || args[i] === "--model") {
      result.model = args[i + 1];
      i++;
    } else if (args[i] === "-t" || args[i] === "--test") {
      result.testCase = args[i + 1];
      i++;
    } else if (args[i] === "-o" || args[i] === "--timeout") {
      result.timeout = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return result;
}

/**
 * Resolve a directly-spawnable opencode executable.
 * On Windows the npm shim is opencode.cmd/.ps1, which Bun.spawn cannot exec from
 * a bare name (ENOENT); resolve the real native binary it wraps. Cross-platform.
 */
export function resolveOpencodeBin(): string {
  const found = Bun.which("opencode");
  if (found) {
    const lower = found.toLowerCase();
    if (lower.endsWith(".cmd") || lower.endsWith(".ps1")) {
      const exe = join(dirname(found), "node_modules", "opencode-ai", "bin", "opencode.exe");
      if (existsSync(exe)) return exe;
    } else {
      return found;
    }
  }
  return found ?? "opencode";
}

export async function checkOpencodeCli(): Promise<boolean> {
  // Cross-platform lookup: `which` does not exist on native Windows.
  return Bun.which("opencode") !== null;
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Normalize code string for fuzzy comparison
 */
export function normalizeCode(code: string): string {
  return code
    .replace(/\s+/g, " ")
    .replace(/\s*([(){}:,])\s*/g, "$1")
    .trim()
    .toLowerCase();
}

/**
 * Validate model name to prevent command injection
 */
export function validateModelName(model: string): boolean {
  // Allow alphanumeric, slashes, colons, hyphens, underscores, dots
  // This is a basic validation - adjust pattern based on your model naming conventions
  const pattern = /^[a-zA-Z0-9_\-\.\/:]+$/;
  return pattern.test(model) && model.length > 0 && model.length <= 100;
}

/**
 * Type guard for BenchmarkResult
 */
export function isBenchmarkResult(obj: any): obj is import("./types.ts").BenchmarkResult {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.testCase === "string" &&
    typeof obj.model === "string" &&
    typeof obj.latencyMs === "number" &&
    typeof obj.correct === "boolean" &&
    typeof obj.score === "number" &&
    typeof obj.output === "string" &&
    typeof obj.expected === "string" &&
    (obj.error === undefined || typeof obj.error === "string")
  );
}

/**
 * Type guard for RunSummary
 */
export function mergeResults(existing: import("./types.ts").RunSummary, newResults: import("./types.ts").BenchmarkResult[]): import("./types.ts").RunSummary {
  const resultsMap = new Map<string, import("./types.ts").BenchmarkResult>();
  
  for (const r of existing.results) {
    resultsMap.set(`${r.model}|${r.testCase}`, r);
  }
  
  for (const r of newResults) {
    resultsMap.set(`${r.model}|${r.testCase}`, r);
  }
  
  const mergedResults = Array.from(resultsMap.values());
  
  const passed = mergedResults.filter(r => r.correct).length;
  const failed = mergedResults.length - passed;
  
  const avgLatency = mergedResults.reduce((sum, r) => sum + r.latencyMs, 0) / mergedResults.length;
  
  const modelStats: import("./types.ts").ModelStats[] = [{
    model: existing.modelStats[0]?.model || newResults[0]?.model || "",
    totalTests: mergedResults.length,
    passed,
    failed,
    avgLatencyMs: Math.round(avgLatency),
    accuracy: Math.round((passed / mergedResults.length) * 100)
  }];

  return {
    ...existing,
    totalTests: mergedResults.length,
    passed,
    failed,
    results: mergedResults,
    modelStats
  };
}

export function isRunSummary(obj: any): obj is import("./types.ts").RunSummary {
  if (!obj || typeof obj !== "object") return false;
  return (
    typeof obj.runId === "string" &&
    typeof obj.timestamp === "string" &&
    typeof obj.totalTests === "number" &&
    typeof obj.passed === "number" &&
    typeof obj.failed === "number" &&
    Array.isArray(obj.results) &&
    obj.results.every(isBenchmarkResult) &&
    Array.isArray(obj.modelStats)
  );
}
