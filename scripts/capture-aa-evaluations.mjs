// Captures the raw chart and table data behind Artificial Analysis evaluation pages.
// Run with a Playwright module path, e.g. PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/capture-aa-evaluations.mjs
// Pass --only <key> to capture one page.
// Output: data/aa-captures/<page>.json, consumed by scripts/import-aa-evaluations.ts.
import { mkdir, open, rename, rm, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const pages = [
  { key: "aa-briefcase", url: "https://artificialanalysis.ai/evaluations/aa-briefcase", scoreCharts: ["AA-Briefcase Elo"] },
  { key: "automationbench-aa", url: "https://artificialanalysis.ai/evaluations/automationbench-aa", scoreCharts: ["AutomationBench-AA: Score"] },
  {
    key: "terminalbench-4-1", url: "https://artificialanalysis.ai/evaluations/terminalbench-4-1",
    scoreCharts: ["Terminal-Bench 4.1: Score"],
    requiredCharts: ["Terminal-Bench 4.1: Score vs. Cost per Task", "Terminal-Bench 4.1: Cost per Task", "Terminal-Bench 4.1: Time per Task"],
  },
  { key: "frontiercode-2-0", url: "https://artificialanalysis.ai/evaluations/frontiercode-2-0", scoreCharts: ["FrontierCode-AA 2.0: Score"] },
  {
    key: "swe-atlas-qna-aa", url: "https://artificialanalysis.ai/agents/coding",
    scoreCharts: ["SWE-Atlas-QnA-AA: Score"], breakdownSeries: "swe-atlas-qna",
  },
  { key: "gdp-pdf", url: "https://artificialanalysis.ai/evaluations/gdp-pdf", scoreCharts: ["GDP.pdf: All-pass Rate"] },
  { key: "critpt", url: "https://artificialanalysis.ai/evaluations/critpt", scoreCharts: ["CritPt: Score"] },
  { key: "critpt-v2-full", url: "https://artificialanalysis.ai/evaluations/critpt-v2", scoreCharts: ["CritPt v2: Score"] },
  { key: "critpt-v2-hard", url: "https://artificialanalysis.ai/evaluations/critpt-v2?critpt-subset=hard", scoreCharts: ["CritPt v2 (Hard Subset): Score"] },
  {
    key: "omniscience", url: "https://artificialanalysis.ai/evaluations/omniscience",
    scoreCharts: ["AA-Omniscience v1.1: Net Score", "AA-Omniscience Accuracy"],
  },
  {
    key: "omniscience-business",
    url: "https://artificialanalysis.ai/evaluations/omniscience?detailed-domain-results=omniscience-net-score-by-domain",
    scorePanel: "AA-Omniscience Net Score by Domain",
    scoreCharts: ["AA-Omniscience Net Score by Domain: Business"],
  },
  { key: "mmmu-pro", url: "https://artificialanalysis.ai/evaluations/mmmu-pro", scoreCharts: ["MMMU-Pro: Score"] },
  {
    key: "finance-and-accounting", url: "https://artificialanalysis.ai/models/capabilities/finance-and-accounting",
    scoreCharts: ["Artificial Analysis Finance & Accounting Index"],
  },
  { key: "economics", url: "https://artificialanalysis.ai/models/capabilities/economics", scoreCharts: ["Artificial Analysis Economics Index"] },
  { key: "strategy-and-ops", url: "https://artificialanalysis.ai/models/capabilities/strategy-and-ops", scoreCharts: ["Artificial Analysis Strategy & Ops Index"] },
  {
    key: "artificial-analysis-intelligence-index", url: "https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index",
    scoreCharts: ["Artificial Analysis Intelligence Index: Score"],
  },
];

const outDir = "data/aa-captures";
const MODEL_SELECTOR_LABEL = /^(\d+)\s+of\s+(\d+)\s+models$/;
// Keep only the fields the import reads; chart tooltips hold React element trees that aren't data.
const KEEP = ["id", "slug", "name", "shortName", "label", "tooltipLabel", "value", "displayValue", "url", "logo",
  "creatorName", "creatorLogo", "releaseDate", "intelligenceIndexIsEstimated", "intelligenceIndexCostPerTask", "totalCost"];
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
export function modelSelectors(scope) {
  return scope.locator("button[aria-controls]").filter({ hasText: MODEL_SELECTOR_LABEL });
}

export async function expandSelectors(page, scope) {
  // AA can remove controls after selecting models. Keep each menu's identity as the page updates.
  const menuIds = await modelSelectors(scope)
    .evaluateAll(buttons => buttons.map(button => button.getAttribute("aria-controls")));
  for (const [i, menuId] of menuIds.entries()) {
    const id = JSON.stringify(menuId);
    const selector = page.locator(`button[aria-controls=${id}]`);
    const label = await selector.evaluateAll(async ([button]) => {
      if (!button) return null;
      button.scrollIntoView({ block: "center", behavior: "instant" });
      // Give the lazy chart a frame to mount before moving on.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return button.isConnected ? button.innerText.trim() : null;
    });
    if (label === null) continue;
    const counts = MODEL_SELECTOR_LABEL.exec(label);
    if (counts && counts[1] === counts[2]) continue;
    try {
      await selector.click({ timeout: 8000 });
      const menu = page.locator(`[id=${id}]`);
      // AA may update the URL after selection. The score check verifies the result.
      await menu.getByText("Select all", { exact: true }).click({ timeout: 8000, noWaitAfter: true });
      await page.waitForTimeout(300);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    } catch (cause) {
      throw new Error(`failed to select all models in selector ${i + 1} (${label})`, { cause });
    }
  }
  return menuIds.length;
}

/** @param {string} label */
export function completeModelSelectionCount(label) {
  const counts = MODEL_SELECTOR_LABEL.exec(label);
  const count = counts && counts[1] === counts[2] ? Number(counts[2]) : null;
  return count !== null && count > 0 && Number.isSafeInteger(count) ? count : null;
}

/** @param {{ title: string, selectorLabels?: string[], items: unknown[] }[]} charts @param {string} title */
export function assertCompleteScoreChart(charts, title) {
  const matches = charts.filter(chart => chart.title === title);
  if (matches.length !== 1) throw new Error(`expected one score chart "${title}", found ${matches.length}`);
  const { selectorLabels = [], items } = matches[0];
  if (selectorLabels.length !== 1) {
    throw new Error(`score chart "${title}" needs one model selector, found ${selectorLabels.length}`);
  }
  const label = selectorLabels[0];
  if (items.length !== completeModelSelectionCount(label)) {
    throw new Error(`incomplete score chart "${title}" (${label}, ${items.length} scores)`);
  }
}

async function openPerformanceBreakdown(page) {
  const tab = page.getByRole("tab", { name: "Score by Benchmark", exact: true });
  await tab.click({ timeout: 10000 });
  const panelId = await tab.getAttribute("aria-controls");
  if (!panelId) throw new Error("Performance breakdown tab has no chart panel");
  const panel = page.locator(`[id=${JSON.stringify(panelId)}]`);
  await panel.locator(".recharts-wrapper").waitFor({ timeout: 10000 });
  return panel;
}

// Playwright runs this function in the browser against the breakdown's chart wrapper.
export function readBenchmarkItems(wrapper, seriesKey) {
  const fiberKey = Object.keys(wrapper).find(key => key.startsWith("__reactFiber"));
  for (let fiber = wrapper[fiberKey], depth = 0; fiber && depth < 150; fiber = fiber.return, depth++) {
    const { items, legends } = fiber.memoizedProps ?? {};
    if (!Array.isArray(items) || !Array.isArray(legends) || !legends.some(legend => legend.id === seriesKey)) continue;
    const ids = new Set();
    const names = new Set();
    return items.map(({ row, components }) => {
      const name = row?.displayLabel?.trim();
      const id = row?.id?.trim();
      if (!id || !name) throw new Error("missing setup ID or name in Performance breakdown");
      if (ids.has(id.toLowerCase()) || names.has(name.toLowerCase())) throw new Error(`duplicate setup "${name}"`);
      ids.add(id.toLowerCase());
      names.add(name.toLowerCase());
      const matches = Array.isArray(components) ? components.filter(component => component?.key === seriesKey) : [];
      const value = matches[0]?.meanReward;
      if (matches.length !== 1 || !Number.isFinite(value) || value < 0 || value > 1) {
        throw new Error(`expected one valid "${seriesKey}" score for "${name}"`);
      }
      return {
        id, name, value,
        agentCreator: row.agentCreator?.name ?? null,
        creatorName: row.modelCreators?.length === 1 ? row.modelCreators[0].name : null,
        modelName: row.model?.name ?? null,
        effort: row.model?.effort?.slug ?? null,
      };
    });
  }
  throw new Error(`missing "${seriesKey}" series in Performance breakdown`);
}

async function captureBenchmarkChart(panel, target) {
  const seriesKey = target.breakdownSeries;
  const items = await panel.locator(".recharts-wrapper").evaluate(readBenchmarkItems, seriesKey);
  const selectorLabels = (await modelSelectors(panel).allInnerTexts()).map(label => label.trim());
  return { charts: [{ title: target.scoreCharts[0], seriesKey, selectorLabels, items }], tables: [] };
}

async function captureEvaluationCharts(scope) {
  return scope.evaluate((root, selectorSource) => {
    const selectorPattern = new RegExp(selectorSource);
    const charts = [];
    for (const wrapper of root.querySelectorAll(".recharts-wrapper")) {
      let title = "";
      let card = wrapper;
      for (let i = 0; i < 12 && card; i++) {
        card = card.parentElement;
        const heading = card && card.querySelector("h1,h2,h3,h4");
        if (heading) { title = heading.innerText.trim(); break; }
      }
      // A selector belongs to this chart only when both are in the same chart card.
      const selectorLabels = card?.querySelectorAll(".recharts-wrapper").length === 1
        ? [...card.querySelectorAll("button")].map(button => button.innerText.trim()).filter(label => selectorPattern.test(label))
        : [];
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
        selectorLabels,
        items: best.map(item => JSON.parse(JSON.stringify(item))),
      });
    }
    const tables = [];
    for (const table of root.querySelectorAll("table")) {
      const headers = [...table.querySelectorAll("th")].map(th => th.innerText.trim());
      const rows = [...table.querySelectorAll("tbody tr")].map(tr => [...tr.querySelectorAll("td")].map(td => td.innerText.trim()));
      if (headers.length && rows.length) tables.push({ headers, rows });
    }
    return { charts, tables };
  }, MODEL_SELECTOR_LABEL.source);
}

async function capturePage(page, target, capturedAt) {
  const response = await page.goto(target.url, { waitUntil: "networkidle", timeout: 120000 });
  if (!response?.ok()) throw new Error(`HTTP ${response?.status()}`);
  const url = new URL(target.url);
  await page.waitForTimeout(1000);
  const isCritPtSubset = url.pathname === "/evaluations/critpt-v2";
  if (isCritPtSubset && new URL(page.url()).searchParams.get("critpt-subset") !== url.searchParams.get("critpt-subset")) {
    throw new Error(`unexpected CritPt subset URL ${page.url()}`);
  }
  let scope = page.locator("body");
  if (target.breakdownSeries) scope = await openPerformanceBreakdown(page);
  if (target.scorePanel) scope = page.getByRole("tabpanel", { name: target.scorePanel, exact: true });
  if (isCritPtSubset || target.scorePanel) {
    // The default controls can render before the client mounts the requested chart.
    await scope.getByRole("heading", { name: target.scoreCharts[0], exact: true }).scrollIntoViewIfNeeded({ timeout: 15000 });
  }
  const selectors = await expandSelectors(page, scope);
  await page.waitForTimeout(800);
  const captured = target.breakdownSeries ? await captureBenchmarkChart(scope, target) : await captureEvaluationCharts(scope);
  for (const title of target.scoreCharts) assertCompleteScoreChart(captured.charts, title);
  for (const title of target.requiredCharts ?? []) {
    const count = captured.charts.filter(chart => chart.title === title).length;
    if (count !== 1) throw new Error(`expected one chart "${title}", found ${count}`);
  }
  // Keep the score, Elo, index, cost, and release charts; the import reads only these.
  if (target.scorePanel) {
    captured.charts = captured.charts.filter(chart => target.scoreCharts.includes(chart.title))
      .map(chart => ({ ...chart, items: chart.items.map(slim) }));
  } else if (!target.breakdownSeries) {
    captured.charts = captured.charts
      .filter(chart => USED_CHART.test(chart.title) && !UNUSED_CHART.test(chart.title))
      .map(({ title, items, selectorLabels }) => ({
        title,
        ...(target.requiredCharts && target.scoreCharts.includes(title) ? { selectorLabels } : {}),
        items: items.map(slim),
      }));
  }
  const sourceUrl = target.breakdownSeries ? response.url() : target.url;
  return { key: target.key, source_url: sourceUrl, captured_at: capturedAt, selectors, ...captured };
}

async function captureTarget(browser, target, capturedAt) {
  const lockPath = `${outDir}/.${target.key}.lock`;
  const lock = await open(lockPath, "wx").catch(error => {
    if (error.code === "EEXIST") {
      throw new Error(`capture is already running (${lockPath}; check the recorded PID before removing a leftover lock)`);
    }
    throw error;
  });
  try {
    await lock.writeFile(`${process.pid}\n`);
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    const file = await capturePage(page, target, capturedAt);
    await page.close();
    const temporary = `${outDir}/.${target.key}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(file, null, 1)}\n`);
      await rename(temporary, `${outDir}/${target.key}.json`);
    } finally {
      await rm(temporary, { force: true });
    }
    console.log(`${target.key}: charts ${file.charts.map(c => `${c.title.slice(0, 40)}=${c.items.length}`).join(" | ")}; tables ${file.tables.length}`);
  } finally {
    await lock.close();
    await rm(lockPath);
  }
}

export function selectCaptureTargets(args, envOnly) {
  const { values: { only: key } } = parseArgs({ args, options: { only: { type: "string" } } });
  // Keep AA_CAPTURE_ONLY=key1,key2 for existing scripts. The CLI flag takes precedence.
  const only = key === undefined ? envOnly?.split(",") : [key];
  const selected = only ? pages.filter(target => only.includes(target.key)) : pages;
  if (key !== undefined && !selected.length) throw new Error(`Unknown capture key "${key}"`);
  return selected;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const selected = selectCaptureTargets(process.argv.slice(2), process.env.AA_CAPTURE_ONLY);
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
  await mkdir(outDir, { recursive: true });
  const capturedAt = new Date().toISOString().slice(0, 10);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const target of selected) {
      try {
        await captureTarget(browser, target, capturedAt);
      } catch (cause) {
        throw new Error(`${target.key}: ${cause.message}`, { cause });
      }
    }
  } finally {
    await browser.close();
  }
}
