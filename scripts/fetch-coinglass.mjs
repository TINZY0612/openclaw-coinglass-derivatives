import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const HEATMAP_URL = "https://www.coinglass.com/pro/futures/LiquidationHeatMap";
const TV_URL = "https://www.coinglass.com/tv/Binance_BTCUSDT";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function utcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function outputDir() {
  const base = process.env.COINGLASS_OUTPUT_DIR || "/data/coinglass";
  return path.join(base, utcDateString());
}

function normalizeText(text) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1] ?? match[0];
  }
  return null;
}

function pairMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return [match[1], match[2]];
  }
  return null;
}

function parseHeatmapText(text) {
  const clean = normalizeText(text);

  const longShort = pairMatch(clean, [
    /Long\s*\/\s*Short[^0-9-]*([0-9.]+%)\s*\/\s*([0-9.]+%)/i,
    /Long\s*Short[^0-9-]*([0-9.]+%)\s*[/ ]+\s*([0-9.]+%)/i,
    /([0-9.]+%)\s*\/\s*([0-9.]+%)\s*Long\s*\/\s*Short/i
  ]);

  return {
    source: HEATMAP_URL,
    captured_at: new Date().toISOString(),
    volume_24h: firstMatch(clean, [
      /24h\s*Volume\s*\$?\s*([0-9,.]+[KMBT]?)/i,
      /Volume\s*\(24h\)\s*\$?\s*([0-9,.]+[KMBT]?)/i
    ]),
    volume_24h_change: firstMatch(clean, [
      /24h\s*Volume\s*\$?\s*[0-9,.]+[KMBT]?\s*\(?([+-]?[0-9.]+%)\)?/i
    ]),
    open_interest: firstMatch(clean, [
      /Open\s*Interest\s*\$?\s*([0-9,.]+[KMBT]?)/i,
      /\bOI\b\s*\$?\s*([0-9,.]+[KMBT]?)/i
    ]),
    open_interest_change: firstMatch(clean, [
      /Open\s*Interest\s*\$?\s*[0-9,.]+[KMBT]?\s*\(?([+-]?[0-9.]+%)\)?/i
    ]),
    liquidation_24h: firstMatch(clean, [
      /24h\s*Liquidation\s*\$?\s*([0-9,.]+[KMBT]?)/i,
      /Liquidation\s*\(24h\)\s*\$?\s*([0-9,.]+[KMBT]?)/i
    ]),
    liquidation_24h_change: firstMatch(clean, [
      /24h\s*Liquidation\s*\$?\s*[0-9,.]+[KMBT]?\s*\(?([+-]?[0-9.]+%)\)?/i
    ]),
    long_short_long: longShort?.[0] ?? null,
    long_short_short: longShort?.[1] ?? null,
    raw_text_sample: clean.slice(0, 5000)
  };
}

function parseTvText(text) {
  const clean = normalizeText(text);

  const longShort = pairMatch(clean, [
    /Long\s*\/\s*Short[^0-9-]*([0-9.]+%)\s*\/\s*([0-9.]+%)/i,
    /Long\s*Short[^0-9-]*([0-9.]+%)\s*[/ ]+\s*([0-9.]+%)/i
  ]);

  const returns = {
    "7d": firstMatch(clean, [/\b7d\b\s*([+-]?[0-9.]+%)/i]),
    "30d": firstMatch(clean, [/\b30d\b\s*([+-]?[0-9.]+%)/i]),
    "90d": firstMatch(clean, [/\b90d\b\s*([+-]?[0-9.]+%)/i]),
    "180d": firstMatch(clean, [/\b180d\b\s*([+-]?[0-9.]+%)/i])
  };

  return {
    source: TV_URL,
    captured_at: new Date().toISOString(),
    symbol: "Binance_BTCUSDT",
    btc_price: firstMatch(clean, [
      /BTC(?:USDT)?[^$0-9]*\$?\s*([0-9,]+(?:\.[0-9]+)?)/i,
      /\$([0-9,]+(?:\.[0-9]+)?)\s*(?:BTC|Bitcoin)?/i
    ]),
    change_24h: firstMatch(clean, [
      /24h[^+\-0-9]*([+-]?[0-9.]+%)/i,
      /Change[^+\-0-9]*([+-]?[0-9.]+%)/i
    ]),
    volume_24h: firstMatch(clean, [
      /24h\s*Volume\s*\$?\s*([0-9,.]+[KMBT]?)/i,
      /Volume\s*\$?\s*([0-9,.]+[KMBT]?)/i
    ]),
    funding_rate: firstMatch(clean, [
      /Funding\s*Rate\s*([+-]?[0-9.]+%)/i,
      /Funding\s*([+-]?[0-9.]+%)/i
    ]),
    open_interest: firstMatch(clean, [
      /Open\s*Interest\s*\$?\s*([0-9,.]+[KMBT]?)/i
    ]),
    binance_long_short_long: longShort?.[0] ?? null,
    binance_long_short_short: longShort?.[1] ?? null,
    returns,
    raw_text_sample: clean.slice(0, 8000)
  };
}

async function screenshotLargestCanvas(page, outputPath) {
  const canvases = await page.locator("canvas").elementHandles();
  if (!canvases.length) {
    throw new Error("No canvas found on page");
  }

  let best = canvases[0];
  let bestArea = 0;

  for (const canvas of canvases) {
    const box = await canvas.boundingBox();
    const area = box ? box.width * box.height : 0;
    if (area > bestArea) {
      best = canvas;
      bestArea = area;
    }
  }

  await best.screenshot({ path: outputPath });
}

async function gotoRendered(page, url) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await sleep(2500);
}

async function collectHeatmap(browser, dir) {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1
  });

  await gotoRendered(page, HEATMAP_URL);
  await page.waitForSelector("canvas", { timeout: 45000 });

  const heatmapPng = path.join(dir, "heatmap.png");
  await screenshotLargestCanvas(page, heatmapPng);

  const bodyText = await page.locator("body").innerText({ timeout: 15000 });
  const data = parseHeatmapText(bodyText);

  await fs.writeFile(path.join(dir, "data.json"), JSON.stringify(data, null, 2));
  await page.close();

  return data;
}

async function collectTradingView(browser, dir) {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1200 },
    deviceScaleFactor: 1
  });

  await gotoRendered(page, TV_URL);

  const tvPng = path.join(dir, "tv-btc-cvd.png");
  await page.screenshot({ path: tvPng, fullPage: true });

  const bodyText = await page.locator("body").innerText({ timeout: 15000 });
  const data = parseTvText(bodyText);

  await fs.writeFile(path.join(dir, "tv-data.json"), JSON.stringify(data, null, 2));
  await page.close();

  return data;
}

async function main() {
  const dir = outputDir();
  await fs.mkdir(dir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled"
    ]
  });

  const result = {
    output_dir: dir,
    captured_at: new Date().toISOString(),
    heatmap: null,
    trading_view: null,
    errors: []
  };

  try {
    result.heatmap = await collectHeatmap(browser, dir);
  } catch (error) {
    result.errors.push({ stage: "heatmap", message: error.message });
  }

  try {
    result.trading_view = await collectTradingView(browser, dir);
  } catch (error) {
    result.errors.push({ stage: "trading_view", message: error.message });
  }

  await browser.close();

  await fs.writeFile(path.join(dir, "run-result.json"), JSON.stringify(result, null, 2));

  if (result.errors.length) {
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
