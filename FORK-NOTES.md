# Fork notes — Ollama Cloud + risultati pubblici

Fork di [`grigio/opencode-benchmark-dashboard`](https://github.com/grigio/opencode-benchmark-dashboard)
che usa **Ollama Cloud** come provider e pubblica i risultati su **GitHub Pages**.

## Cosa cambia rispetto all'upstream

- **Provider Ollama Cloud** via endpoint OpenAI-compatibile `https://ollama.com/v1`,
  configurato in opencode. La chiave si legge dall'ambiente (`OLLAMA_API_KEY`), non è committata.
- **Fix cross-platform (Windows)** in `src/utils.ts` / `src/evaluate.ts`:
  - `checkOpencodeCli()` usa `Bun.which` invece di `which` (assente su Windows nativo);
  - le chiamate a opencode risolvono il binario reale (`opencode.exe`) tramite
    `resolveOpencodeBin()`, perché su Windows `Bun.spawn(["opencode", …])` non risolve lo shim `.cmd`.
- **`src/sweep.ts`** — esegue answer+evaluate su tutti i modelli Ollama Cloud, in due varianti:
  - `ollama-clean/<model>` → opencode isolato, **senza plugin** (config in `bench-config/opencode.clean.json`,
    attivata via `XDG_CONFIG_HOME` su una dir temporanea);
  - `ollama-cloud/<model>` → config opencode **globale dell'utente** (con eventuali plugin).
  Il giudice della fase evaluate è fisso e sempre in config pulita, così le differenze
  riflettono il modello generatore e non il giudice.
- **`src/export-static.ts` + `npm run export:static`** — genera in `dist/` una dashboard
  statica (HTML + `api/runs.json` + `api/models.json`) servibile da Pages.
- **`.github/workflows/pages.yml`** — ricostruisce e pubblica la dashboard su Pages a ogni push.
  Non esegue benchmark in CI: legge solo i `results/` committati.

## Riprodurre i risultati

```bash
bun install

# il provider ollama-cloud va presente in ~/.config/opencode/opencode.json
# (vedi bench-config/opencode.clean.json per la forma minima del provider)
export OLLAMA_API_KEY=...        # la tua chiave Ollama Cloud

# giro completo (tutte e due le varianti, tutti i modelli da /api/tags)
OC_CLEAN_XDG=/tmp/oc-clean bun run sweep
#   (prima copia bench-config/opencode.clean.json in $OC_CLEAN_XDG/opencode/opencode.json)

# dashboard locale
bun run dashboard            # http://localhost:3000

# export statico per Pages
bun run export:static        # -> dist/
```

I file in `results/*.json` sono i dati pubblici del benchmark (latenza + valutazione del giudice
per ogni modello e variante).
