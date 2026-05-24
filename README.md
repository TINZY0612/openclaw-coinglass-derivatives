# OpenClaw Coinglass Derivatives Skill

<p align="center">
  <img src="./coinglass-description" alt="OpenClaw Coinglass Derivatives Skill" width="100%">
</p>

Free Coinglass public-webpage data collector for daily crypto market reports.

This OpenClaw skill uses Playwright browser automation to read public Coinglass pages and save:

- `heatmap.png` — Liquidation Heatmap canvas screenshot
- `data.json` — 24h volume, open interest, liquidation, global long/short ratio
- `tv-btc-cvd.png` — Coinglass TradingView page screenshot
- `tv-data.json` — BTC price, funding rate, open interest, Binance long/short ratio, multi-period returns, and detected text fields

Core idea:

> Coinglass API requires a paid API key, but the public website renders many of the same daily derivatives metrics into DOM text and canvas/SVG charts. For low-frequency daily reporting, a browser automation skill can capture useful market data without relying on a paid API.

## Important notes

This is intended for **low-frequency personal/research reporting**. Do not hammer Coinglass. Respect robots.txt, rate limits, website terms, and local laws. The script defaults to one daily run.

The parser is best-effort because public webpages can change. Keep the raw text and screenshots as fallback evidence.

## Requirements

- Linux VPS, tested conceptually for Ubuntu 24.04
- Node.js 20+
- npm
- Chromium installed through Playwright
- OpenClaw with skills enabled

## Install as an OpenClaw skill

From a public GitHub repo:

```bash
openclaw skills install git:YOUR_GITHUB_USERNAME/openclaw-coinglass-derivatives@main
```

Or locally:

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/openclaw-coinglass-derivatives.git
openclaw skills install ./openclaw-coinglass-derivatives --as coinglass-derivatives
```

OpenClaw skill directories require a `SKILL.md` at the skill root. This repo is structured so the repository root is also the skill root.

## Install runtime dependencies

```bash
cd openclaw-coinglass-derivatives
npm install
npx playwright install chromium
```

## Manual run

```bash
npm run fetch
```

Default output directory:

```bash
/data/coinglass/YYYY-MM-DD/
```

Override with:

```bash
COINGLASS_OUTPUT_DIR="$HOME/coinglass-data" npm run fetch
```

## Install daily systemd timer

```bash
sudo bash scripts/install-systemd.sh
```

Default schedule:

- UTC 23:50
- Intended to run before an 00:00 daily crypto report agent

## Output structure

```text
/data/coinglass/YYYY-MM-DD/
├── heatmap.png
├── data.json
├── tv-btc-cvd.png
└── tv-data.json
```

## Example agent instruction

Ask your OpenClaw agent:

```text
Run the Coinglass derivatives collector, then use today's JSON files to update the "主要市场数据与杠杆" section of my crypto daily report. If files are missing, skip the section instead of failing.
```

## What the skill collects

From:

```text
https://www.coinglass.com/pro/futures/LiquidationHeatMap
```

It tries to collect:

- 24h Volume
- Open Interest
- 24h Liquidation
- global Long/Short ratio
- Liquidation Heatmap canvas screenshot

From:

```text
https://www.coinglass.com/tv/Binance_BTCUSDT
```

It tries to collect:

- BTC price
- 24h change
- 24h volume
- Funding Rate
- Open Interest
- Binance BTCUSDT Long/Short ratio
- 7d / 30d / 90d / 180d returns
- page text for Top 20 contract ranking extraction
- full-page chart screenshot

## Security

This skill executes a local Node.js script and writes files to disk. Read the code before installing. Do not add wallet keys, exchange API keys, seed phrases, or trading credentials to this project.

Recommended:

- Run on a separate VPS or sandbox
- Use read-only report workflows
- Do not let agents place trades based on this data
- Keep human review for final market commentary

## License

MIT
