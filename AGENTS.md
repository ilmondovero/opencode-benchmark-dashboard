# Harness Test - Opencode Benchmark

Keep this document minimal, just add non-trivial development info.

## Usage
```bash
bun install
bun run build:dashboard    # Build frontend TypeScript
bun run answer -m "opencode/minimax-m2.5-free"
bun test src/runner.test.ts
```

## Project Structure
```
harness-test/
├── src/           # Main code (index.ts, runner.ts, evaluate.ts)
├── public/        # Frontend (index.html, dashboard.css, dashboard.ts)
├── config/        # benchmark.json (timeout, verifier model)
├── prompts/       # Test case prompts ({test_id}.txt)
├── solutions/     # Model outputs ({model}/{test_id}.txt)
└── results/       # JSON results ({model}.json)
```

## Notes
- Requires `opencode` CLI in PATH
- Models configured in `~/.config/opencode/opencode.json`
- Dashboard: `bun run dashboard` (port 3000)
- Run `bun run build:dashboard` after editing public/dashboard.ts
