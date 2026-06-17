# Benchmark summary

Task: `CODING-typescript-rust` · giudice: `ollama-clean/gpt-oss:120b`.

- **clean** = opencode isolato, senza plugin
- **cloud** = config opencode globale (con plugin `oh-my-openagent`/ultraworker)

## Confronto latenza clean vs cloud

Latenza media answer: **clean 12.3s** vs **cloud 61.4s** (cloud ~5.0× piu' lento).

| Modello | clean | cloud | cloud/clean |
|---|--:|--:|:--:|
| `kimi-k2.7-code` | 6.0s | 102.7s | 17.1× |
| `qwen3-coder-next` | 5.6s | 94.3s | 16.8× |
| `gpt-oss:20b` | 5.3s | 54.7s | 10.4× |
| `rnj-1:8b` | 3.4s | 34.6s | 10.1× |
| `gemma4:31b` | 5.9s | 51.7s | 8.8× |
| `ministral-3:14b` | 7.4s | 65.1s | 8.8× |
| `minimax-m2.5` | 7.3s | 64.0s | 8.7× |
| `qwen3.5:397b` | 7.1s | 59.2s | 8.4× |
| `minimax-m2.1` | 7.5s | 61.2s | 8.2× |
| `glm-5` | 8.2s | 67.2s | 8.2× |
| `minimax-m3` | 10.0s | 79.9s | 8.0× |
| `glm-5.1` | 6.0s | 47.1s | 7.9× |
| `gpt-oss:120b` | 6.8s | 52.1s | 7.6× |
| `minimax-m2.7` | 10.6s | 79.0s | 7.5× |
| `devstral-small-2:24b` | 9.4s | 67.7s | 7.2× |
| `devstral-2:123b` | 9.0s | 59.8s | 6.6× |
| `mistral-large-3:675b` | 6.5s | 42.5s | 6.6× |
| `nemotron-3-nano:30b` | 7.4s | 41.3s | 5.6× |
| `gemma3:27b` | 9.4s | 49.9s | 5.3× |
| `nemotron-3-super` | 17.0s | 89.9s | 5.3× |
| `kimi-k2.6` | 14.1s | 73.7s | 5.2× |
| `kimi-k2.5` | 15.1s | 76.5s | 5.1× |
| `ministral-3:3b` | 10.7s | 53.8s | 5.0× |
| `gemini-3-flash-preview` | 12.9s | 61.1s | 4.7× |
| `qwen3-coder:480b` | 8.7s | 40.8s | 4.7× |
| `deepseek-v3.2` | 13.5s | 59.4s | 4.4× |
| `glm-5.2` | 21.9s | 94.7s | 4.3× |
| `gemma3:4b` | 12.9s | 50.7s | 3.9× |
| `deepseek-v4-pro` | 12.4s | 45.7s | 3.7× |
| `ministral-3:8b` | 11.7s | 39.6s | 3.4× |
| `deepseek-v3.1:671b` | 30.4s | 94.0s | 3.1× |
| `gemma3:12b` | 15.6s | 44.6s | 2.9× |
| `glm-4.7` | 15.4s | 43.7s | 2.8× |
| `deepseek-v4-flash` | 19.3s | 36.6s | 1.9× |
| `nemotron-3-ultra` | 59.4s | 69.7s | 1.2× |

## Leaderboard — clean

| Modello | OK | Score | Latenza |
|---|:--:|:--:|--:|
| `gpt-oss:20b` | ✅ | 1.00 | 5.3s |
| `qwen3-coder-next` | ✅ | 1.00 | 5.6s |
| `gemma4:31b` | ✅ | 1.00 | 5.9s |
| `glm-5.1` | ✅ | 1.00 | 6.0s |
| `kimi-k2.7-code` | ✅ | 1.00 | 6.0s |
| `qwen3.5:397b` | ✅ | 1.00 | 7.1s |
| `nemotron-3-nano:30b` | ✅ | 1.00 | 7.4s |
| `ministral-3:14b` | ✅ | 1.00 | 7.4s |
| `qwen3-coder:480b` | ✅ | 1.00 | 8.7s |
| `minimax-m3` | ✅ | 1.00 | 10.0s |
| `minimax-m2.7` | ✅ | 1.00 | 10.6s |
| `gemini-3-flash-preview` | ✅ | 1.00 | 12.9s |
| `kimi-k2.6` | ✅ | 1.00 | 14.1s |
| `kimi-k2.5` | ✅ | 1.00 | 15.1s |
| `glm-4.7` | ✅ | 1.00 | 15.4s |
| `nemotron-3-super` | ✅ | 1.00 | 17.0s |
| `nemotron-3-ultra` | ✅ | 1.00 | 59.4s |
| `deepseek-v4-flash` | ✅ | 0.90 | 19.3s |
| `minimax-m2.5` | ❌ | 0.85 | 7.3s |
| `minimax-m2.1` | ❌ | 0.80 | 7.5s |
| `deepseek-v4-pro` | ❌ | 0.75 | 12.4s |
| `glm-5.2` | ❌ | 0.75 | 21.9s |
| `ministral-3:8b` | ❌ | 0.60 | 11.7s |
| `mistral-large-3:675b` | ❌ | 0.50 | 6.5s |
| `gemma3:27b` | ❌ | 0.50 | 9.4s |
| `ministral-3:3b` | ❌ | 0.40 | 10.7s |
| `rnj-1:8b` | ❌ | 0.00 | 3.4s |
| `gpt-oss:120b` | ❌ | 0.00 | 6.8s |
| `glm-5` | ❌ | 0.00 | 8.2s |
| `devstral-2:123b` | ❌ | 0.00 | 9.0s |
| `devstral-small-2:24b` | ❌ | 0.00 | 9.4s |
| `gemma3:4b` | ❌ | 0.00 | 12.9s |
| `deepseek-v3.2` | ❌ | 0.00 | 13.5s |
| `gemma3:12b` | ❌ | 0.00 | 15.6s |
| `deepseek-v3.1:671b` | ❌ | 0.00 | 30.4s |

## Leaderboard — cloud

| Modello | OK | Score | Latenza |
|---|:--:|:--:|--:|
| `deepseek-v4-flash` | ✅ | 1.00 | 36.6s |
| `nemotron-3-nano:30b` | ✅ | 1.00 | 41.3s |
| `glm-4.7` | ✅ | 1.00 | 43.7s |
| `glm-5.1` | ✅ | 1.00 | 47.1s |
| `gemma3:27b` | ✅ | 1.00 | 49.9s |
| `gemma4:31b` | ✅ | 1.00 | 51.7s |
| `gpt-oss:120b` | ✅ | 1.00 | 52.1s |
| `gpt-oss:20b` | ✅ | 1.00 | 54.7s |
| `qwen3.5:397b` | ✅ | 1.00 | 59.2s |
| `gemini-3-flash-preview` | ✅ | 1.00 | 61.1s |
| `minimax-m2.1` | ✅ | 1.00 | 61.2s |
| `minimax-m2.5` | ✅ | 1.00 | 64.0s |
| `glm-5` | ✅ | 1.00 | 67.2s |
| `minimax-m3` | ✅ | 1.00 | 79.9s |
| `kimi-k2.7-code` | ✅ | 1.00 | 102.7s |
| `deepseek-v3.2` | ✅ | 0.90 | 59.4s |
| `devstral-small-2:24b` | ✅ | 0.90 | 67.7s |
| `nemotron-3-super` | ✅ | 0.90 | 89.9s |
| `glm-5.2` | ✅ | 0.90 | 94.7s |
| `nemotron-3-ultra` | ❌ | 0.80 | 69.7s |
| `qwen3-coder:480b` | ❌ | 0.70 | 40.8s |
| `ministral-3:14b` | ❌ | 0.70 | 65.1s |
| `ministral-3:8b` | ❌ | 0.50 | 39.6s |
| `gemma3:12b` | ❌ | 0.30 | 44.6s |
| `ministral-3:3b` | ❌ | 0.30 | 53.8s |
| `rnj-1:8b` | ❌ | 0.00 | 34.6s |
| `mistral-large-3:675b` | ❌ | 0.00 | 42.5s |
| `deepseek-v4-pro` | ❌ | 0.00 | 45.7s |
| `gemma3:4b` | ❌ | 0.00 | 50.7s |
| `devstral-2:123b` | ❌ | 0.00 | 59.8s |
| `kimi-k2.6` | ❌ | 0.00 | 73.7s |
| `kimi-k2.5` | ❌ | 0.00 | 76.5s |
| `minimax-m2.7` | ❌ | 0.00 | 79.0s |
| `deepseek-v3.1:671b` | ❌ | 0.00 | 94.0s |
| `qwen3-coder-next` | ❌ | 0.00 | 94.3s |
