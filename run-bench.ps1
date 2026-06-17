<#
.SYNOPSIS
  Esegue il benchmark Ollama Cloud (sweep -> summarize -> export statico) e, opzionale, pubblica.

.DESCRIPTION
  Prepara l'ambiente (chiave, config opencode pulita isolata) e lancia tutto con i parametri giusti.
  - "clean" = opencode senza plugin (config isolata via XDG_CONFIG_HOME)
  - "cloud" = config opencode globale dell'utente (con i plugin)

.PARAMETER Variants
  Varianti da eseguire: "clean", "cloud" o "clean,cloud". Default: "clean".

.PARAMETER Models
  CSV opzionale per limitare i modelli (es. "gpt-oss:20b,glm-5"). Default: tutti quelli di /api/tags.

.PARAMETER AnswerTimeout
  Timeout (ms) per ogni generazione. Default: 300000.

.PARAMETER Push
  Se presente, fa commit+push di results/ a fine corsa (aggiorna la dashboard su Pages).

.EXAMPLE
  .\run-bench.ps1                      # clean, tutti i modelli
  .\run-bench.ps1 -Variants clean,cloud -Push
  .\run-bench.ps1 -Models "gpt-oss:20b,glm-5" -Variants clean
#>
param(
  [string]$Variants = "clean",
  [string]$Models = "",
  [int]$AnswerTimeout = 300000,
  [switch]$Push
)

$ErrorActionPreference = "Stop"
$repo = $PSScriptRoot
Set-Location $repo

# 1) Chiave: dalla sessione o dal registro utente (setx)
$key = $env:OLLAMA_API_KEY
if (-not $key) { $key = [Environment]::GetEnvironmentVariable('OLLAMA_API_KEY', 'User') }
if (-not $key) { throw "OLLAMA_API_KEY non trovata (ne' in sessione ne' nel registro utente)." }
$env:OLLAMA_API_KEY = $key

# 2) opencode disponibile?
if (-not (Get-Command opencode -ErrorAction SilentlyContinue)) {
  throw "opencode non e' nel PATH. Installa: https://opencode.ai"
}

# 3) Config pulita isolata (per la variante 'clean')
$xdg = Join-Path $env:TEMP "oc-bench-xdg"
New-Item -ItemType Directory -Force -Path (Join-Path $xdg "opencode") | Out-Null
Copy-Item (Join-Path $repo "bench-config\opencode.clean.json") (Join-Path $xdg "opencode\opencode.json") -Force

# 4) Env per lo sweep
$env:OC_CLEAN_XDG    = $xdg
$env:OC_VARIANTS     = $Variants
$env:OC_ANSWER_TIMEOUT = "$AnswerTimeout"
$env:OC_MODELS       = $Models
$env:OPENCODE_CONFIG = ''
$env:XDG_CONFIG_HOME = ''   # lo sweep imposta XDG per variante; qui deve partire "neutro"

Write-Host "=== Benchmark: varianti=$Variants · modelli=$(if($Models){$Models}else{'tutti'}) · timeout=${AnswerTimeout}ms ===" -ForegroundColor Cyan

# 5) Pipeline
& bun run sweep
& bun run summarize
& bun run export:static

Write-Host "=== Fatto. Dashboard statica in .\dist, riepilogo in .\results\SUMMARY.md ===" -ForegroundColor Green

# 6) Pubblicazione opzionale
if ($Push) {
  Write-Host "=== Commit + push results/ ===" -ForegroundColor Cyan
  git add results/
  git commit -m "bench: aggiornamento risultati ($Variants)"
  git push origin master
  Write-Host "Pushato: GitHub Pages si rigenera da solo." -ForegroundColor Green
}
