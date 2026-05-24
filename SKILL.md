---
name: coinglass-derivatives
description: Fetch public Coinglass derivatives data and screenshots for daily crypto market reports.
metadata: {"openclaw":{"emoji":"📊","os":["linux"],"requires":{"bins":["node","npm","npx"]}}}
---

# Coinglass Derivatives Skill

Use this skill when the user wants to collect Coinglass derivatives data for a daily crypto market report.

## What this skill does

It runs a local Playwright script that opens public Coinglass webpages, waits for the rendered page, reads DOM text, extracts key derivatives metrics with regex, and saves screenshots.

Target pages:

- `https://www.coinglass.com/pro/futures/LiquidationHeatMap`
- `https://www.coinglass.com/tv/Binance_BTCUSDT`

Default output path:

- `/data/coinglass/YYYY-MM-DD/`

Generated files:

- `heatmap.png` — Liquidation Heatmap canvas screenshot
- `data.json` — heatmap page metrics
- `tv-btc-cvd.png` — TradingView page screenshot
- `tv-data.json` — BTC / Binance derivatives metrics and extracted text

## How to run

From the skill directory:

```bash
npm install
npx playwright install chromium
npm run fetch
```

Or directly:

```bash
node {baseDir}/scripts/fetch-coinglass.mjs
```

Optional output override:

```bash
COINGLASS_OUTPUT_DIR="$HOME/coinglass-data" node {baseDir}/scripts/fetch-coinglass.mjs
```

## How the agent should use the results

For a daily crypto market report:

1. Run the fetch script.
2. Read the current date folder under `/data/coinglass/YYYY-MM-DD/`.
3. If `data.json` exists, use it for:
   - 24h liquidation
   - 24h volume
   - open interest
   - global long/short ratio
4. If `tv-data.json` exists, use it for:
   - BTC price
   - 24h change
   - funding rate
   - Binance BTCUSDT long/short ratio
   - multi-period returns
   - Top 20 contract-market text if present
5. If screenshots exist, attach or reference them as visual context.
6. If any file is missing, skip that part gracefully. Do not fail the whole report.

## Safety and compliance rules

- Do not run this in a high-frequency loop.
- Do not bypass login, paywalls, CAPTCHAs, or access controls.
- Do not store exchange API keys, wallet keys, seed phrases, or private credentials.
- Do not place trades or give automated financial decisions based only on this data.
- Keep user approval before publishing investment conclusions.
- Treat webpage parsing as best-effort because Coinglass may change DOM text or layout.

## Key insight

The Coinglass API is paid and requires an API key, but public Coinglass pages render many of the same daily derivatives metrics into DOM text and charts. This skill uses browser automation as a low-frequency reporting data source.
