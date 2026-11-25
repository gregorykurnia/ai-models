// Read-only check: every bar on each AA Time per Task chart equals the stored time, to AA's one decimal (minutes).
// Run it right after capture:aa-speed and import:aa-index-costs; AA's times move as its measured output speeds update.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node --import tsx scripts/check-aa-time-charts.mjs [--name "Model A" ...]
import { readFile } from "node:fs/promises";
import { evaluationTimingSources } from "./aa-speed-sources.ts";

const names = process.argv.flatMap((arg, index, args) => arg === "--name" ? [args[index + 1]] : []);
const speed = JSON.parse(await readFile("data/aa-model-speed.json", "utf8"));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true });
let failed = false;
try {
  for (const source of evaluationTimingSources.filter(source => source.timeChart)) {
    const stored = new Map(speed.records.flatMap(record =>
      record.aa_model_id && record.evaluation_times_s[source.slug] !== undefined ? [[record.aa_model_id, record.evaluation_times_s[source.slug]]] : []));
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    try {
      await page.goto(source.url, { waitUntil: "networkidle", timeout: 120000 });
      const selector = page.locator("button").filter({ hasText: /\d+ of \d+ models/ }).first();
      await selector.click();
      await page.getByText("Select all", { exact: true }).last().click();
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => {
        const text = [...document.querySelectorAll("button")].map(button => button.textContent).find(text => /\d+ of \d+ models/.test(text || ""));
        const counts = /^(\d+) of (\d+) models$/.exec(text || "");
        return counts && counts[1] === counts[2];
      });
      await page.locator("h1,h2,h3,h4").filter({ hasText: /^(?:.*: )?Time per Task$/ }).first().scrollIntoViewIfNeeded();
      let bars = null;
      for (let attempt = 0; attempt < 30 && !bars; attempt++) {
        bars = await page.evaluate(() => {
          // Each chart's title is the first heading in the nearest ancestor that has one; a lazy chart has no wrapper yet.
          const titleOf = wrapper => { for (let node = wrapper.parentElement; node; node = node.parentElement) { const heading = node.querySelector("h1,h2,h3,h4"); if (heading) return heading.innerText.trim(); } };
          const wrapper = [...document.querySelectorAll(".recharts-wrapper")].find(wrapper => /^(?:.*: )?Time per Task$/.test(titleOf(wrapper) || ""));
          const key = wrapper && Object.keys(wrapper).find(key => key.startsWith("__reactFiber"));
          let fiber = key ? wrapper[key] : null;
          for (let depth = 0; fiber && depth < 20; depth++, fiber = fiber.return) {
            const data = fiber.memoizedProps?.data;
            if (Array.isArray(data) && data.length && data.every(bar => typeof bar?.displayValue === "string")) {
              return data.map(bar => ({ id: bar.id, label: bar.tooltipLabel || bar.label, shown: bar.displayValue }));
            }
          }
          return null;
        });
        if (!bars) await page.waitForTimeout(500);
      }
      if (!bars) throw new Error("Time per Task bars not found");
      const mismatches = [];
      for (const bar of bars) {
        const seconds = stored.get(bar.id);
        const ours = seconds === undefined ? "missing" : (seconds / 60).toFixed(1);
        // AA labels tiny times "<0.1" rather than rounding them.
        const below = /^<([\d.]+)$/.exec(bar.shown);
        const agrees = below ? seconds !== undefined && seconds / 60 < Number(below[1]) : ours === bar.shown.replace(/,/g, "");
        if (!agrees) mismatches.push(`${bar.label}: chart ${bar.shown}, stored ${ours}`);
        if (source.slug === "terminalbench-4-1" && names.includes(bar.label)) console.log(`  ${bar.label}: chart ${bar.shown} min, stored ${ours} min`);
      }
      const plotted = new Set(bars.map(bar => bar.id));
      const extra = [...stored.entries()].filter(([id, seconds]) => seconds > 0 && !plotted.has(id)).length;
      console.log(`${source.slug}: ${bars.length} bars, ${bars.length - mismatches.length} match, ${mismatches.length} differ; ${extra} stored times not on the chart`);
      for (const line of mismatches.slice(0, 10)) console.log(`  DIFF ${line}`);
      if (mismatches.length || extra) failed = true;
    } catch (error) {
      failed = true;
      console.error(`FAILED ${source.slug}: ${error.message.split("\n")[0]}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
if (failed) process.exit(1);
