// Captures the raw chart and table data behind each Artificial Analysis evaluation page.
// Run with a Playwright module path, e.g. PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/capture-aa-evaluations.mjs
// Output: data/aa-captures/<page>.json, consumed by scripts/import-aa-evaluations.ts.
import { mkdir, writeFile } from "node:fs/promises";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

const pages = [
  { key: "aa-briefcase", url: "https://artificialanalysis.ai/evaluations/aa-briefcase" },
  { key: "gdpval-aa", url: "https://artificialanalysis.ai/evaluations/gdpval-aa" },
  { key: "automationbench-aa", url: "https://artificialanalysis.ai/evaluations/automationbench-aa" },
  { key: "terminalbench-4-0", url: "https://artificialanalysis.ai/evaluations/terminalbench-4-0" },
  { key: "scicode", url: "https://artificialanalysis.ai/evaluations/scicode" },
  { key: "humanitys-last-exam", url: "https://artificialanalysis.ai/evaluations/humanitys-last-exam" },
  { key: "gdp-pdf", url: "https://artificialanalysis.ai/evaluations/gdp-pdf" },
  { key: "critpt", url: "https://artificialanalysis.ai/evaluations/critpt" },
  { key: "omniscience", url: "https://artificialanalysis.ai/evaluations/omniscience" },
  { key: "artificial-analysis-long-context-reasoning", url: "https://artificialanalysis.ai/evaluations/artificial-analysis-long-context-reasoning" },
  { key: "mmmu-pro", url: "https://artificialanalysis.ai/evaluations/mmmu-pro" },
  { key: "finance-and-accounting", url: "https://artificialanalysis.ai/models/capabilities/finance-and-accounting" },
  { key: "economics", url: "https://artificialanalysis.ai/models/capabilities/economics" },
  { key: "strategy-and-ops", url: "https://artificialanalysis.ai/models/capabilities/strategy-and-ops" },
  { key: "artificial-analysis-intelligence-index", url: "https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index" },
];

const outDir = "data/aa-captures";
// Keep only the fields the import reads; chart tooltips hold React element trees that aren't data.
const KEEP = ["id", "slug", "name", "shortName", "label", "tooltipLabel", "value", "displayValue", "url", "logo",
  "creatorName", "creatorLogo", "releaseDate", "intelligenceIndexIsEstimated", "intelligenceIndexCostPerTask"];
const USED_CHART = /Score|Elo|Index|Leaderboard|Accuracy|Rate|Cost per|Release Date|Intelligence Index/;
const UNUSED_CHART = /Output Tokens|Time per Task|Turns|Tool Calls|Token Usage|Parameters|Hallucination|Breakdown|Objectives|Violation|Exploration|Knowledge|Capability/;
function slim(item) {
  const out = {};
  for (const key of KEEP) if (item[key] !== undefined) out[key] = item[key];
  if (out.creatorName === undefined && item.creator?.name !== undefined) out.creatorName = item.creator.name;
  if (typeof item.costPerTask === "number") out.costPerTask = item.costPerTask;
  else if (item.costPerTask?.total !== undefined) out.costPerTask = { total: item.costPerTask.total };
  if (item.cost?.total !== undefined) out.cost = { total: item.cost.total };
  for (const key of ["mid", "lower", "upper"]) if (item[key]?.value !== undefined) out[key] = { value: item[key].value };
  return out;
}
await mkdir(outDir, { recursive: true });
const capturedAt = new Date().toISOString().slice(0, 10);
const browser = await chromium.launch({ headless: true });

async function expandSelectors(page) {
  // Each chart has a "N of M models" selector; select all so the charts carry the full model list.
  const selectors = page.locator("button").filter({ hasText: /\d+ of \d+ models/ });
  const count = await selectors.count();
  for (let i = 0; i < count; i++) {
    try {
      await selectors.nth(i).scrollIntoViewIfNeeded({ timeout: 4000 });
      await selectors.nth(i).click({ timeout: 8000 });
      await page.waitForTimeout(400);
      await page.getByText("Select all", { exact: true }).last().click({ timeout: 4000 });
      await page.waitForTimeout(300);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    } catch {
      await page.keyboard.press("Escape").catch(() => {});
    }
  }
  return count;
}

for (const target of pages) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(target.url, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(1000);
  const selectors = await expandSelectors(page);
  await page.waitForTimeout(800);
  const captured = await page.evaluate(() => {
    const charts = [];
    for (const wrapper of document.querySelectorAll(".recharts-wrapper")) {
      let title = "";
      let card = wrapper;
      for (let i = 0; i < 12 && card; i++) {
        card = card.parentElement;
        const heading = card && card.querySelector("h1,h2,h3,h4");
        if (heading) { title = heading.innerText.trim(); break; }
      }
      // The chart's React props hold the series; take the longest array of model records.
      const key = Object.keys(wrapper).find(k => k.startsWith("__reactFiber"));
      let fiber = key ? wrapper[key] : null;
      let depth = 0;
      let best = [];
      while (fiber && depth < 150) {
        const props = fiber.memoizedProps || {};
        for (const value of Object.values(props)) {
          if (!Array.isArray(value) || !value.length || !value[0] || typeof value[0] !== "object") continue;
          if (!("id" in value[0]) || value[0].$$typeof) continue;
          const keys = Object.keys(value[0]);
          if (!keys.some(k => ["value", "score", "costPerTask", "intelligenceIndexCostPerTask", "label", "name"].includes(k))) continue;
          if (value.length > best.length) best = value;
        }
        fiber = fiber.return;
        depth++;
      }
      charts.push({
        title,
        items: best.map(item => JSON.parse(JSON.stringify(item))),
      });
    }
    const tables = [];
    for (const table of document.querySelectorAll("table")) {
      const headers = [...table.querySelectorAll("th")].map(th => th.innerText.trim());
      const rows = [...table.querySelectorAll("tbody tr")].map(tr => [...tr.querySelectorAll("td")].map(td => td.innerText.trim()));
      if (headers.length && rows.length) tables.push({ headers, rows });
    }
    return { charts, tables };
  });
  // Keep the score, Elo, index, cost, and release charts; the import reads only these.
  captured.charts = captured.charts
    .filter(chart => USED_CHART.test(chart.title) && !UNUSED_CHART.test(chart.title))
    .map(chart => ({ ...chart, items: chart.items.map(slim) }));
  const file = { key: target.key, source_url: target.url, captured_at: capturedAt, selectors, ...captured };
  await writeFile(`${outDir}/${target.key}.json`, `${JSON.stringify(file, null, 1)}\n`);
  console.log(`${target.key}: charts ${captured.charts.map(c => `${c.title.slice(0, 40)}=${c.items.length}`).join(" | ")}; tables ${captured.tables.length}`);
  await page.close();
}
await browser.close();
