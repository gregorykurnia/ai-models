// Timing-only capture of AA's evaluation pages; leaves score captures unchanged. Pages with a Time per Task chart
// store the chart's own items (what it plots); AutomationBench and Omniscience have no chart and keep the page payload.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs npm run capture:aa-speed
import { createHash } from "node:crypto";
import { rename, rm, writeFile } from "node:fs/promises";
import { chooseTimingItems, evaluationTimingSources, validateTimingCapture, withSpeedCaptureLock } from "./aa-speed-sources.ts";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
await withSpeedCaptureLock(async () => {
  const browser = await chromium.launch({ headless: true });
  const evaluations = [];
  const failures = [];
  let unitEvidence;
  try {
    for (const source of evaluationTimingSources) {
      const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
      try {
        const response = await page.goto(source.url, { waitUntil: "networkidle", timeout: 120000 });
        if (!response?.ok()) throw new Error(`HTTP ${response?.status()}`);
        const selector = page.locator("button").filter({ hasText: /\d+ of \d+ models/ }).first();
        await selector.click();
        await page.getByText("Select all", { exact: true }).last().click();
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => {
          const text = [...document.querySelectorAll("button")].map(button => button.textContent).find(text => /\d+ of \d+ models/.test(text || ""));
          const counts = /^(\d+) of (\d+) models$/.exec(text || "");
          return counts && counts[1] === counts[2];
        });
        const captured = await page.evaluate(() => {
          const wrapper = document.querySelector(".recharts-wrapper");
          if (!wrapper) throw new Error("Evaluation chart is missing");
          const key = Object.keys(wrapper).find(key => key.startsWith("__reactFiber"));
          let fiber = key ? wrapper[key] : null;
          for (let depth = 0; fiber && depth < 150; depth++, fiber = fiber.return) {
            const models = fiber.memoizedProps?.value?.selectedModels;
            if (!Array.isArray(models) || !models.length || !models.every(model => "evalTimePerTask" in model)) continue;
            return {
              title: document.querySelector("h1").innerText.trim(),
              selected_model_count: models.length,
              time_chart_present: [...document.querySelectorAll("h1,h2,h3,h4")].some(heading => /^(?:.*: )?Time per Task$/.test(heading.innerText.trim())),
              payload_items: models.filter(model => model.evalTimePerTask !== undefined && model.evalTimePerTask !== null)
                .map(model => ({ id: model.id, name: model.name, url: model.modelUrl || `/models/${model.slug}`, seconds: model.evalTimePerTask })),
            };
          }
          throw new Error("Complete EvaluationDataProvider.selectedModels timing payload is missing");
        });
        let chartItems = null;
        if (captured.time_chart_present) {
          // The chart renders lazily: bring its card into view, then read the items the bar chart is built from.
          const heading = page.locator("h1,h2,h3,h4").filter({ hasText: /^(?:.*: )?Time per Task$/ }).first();
          await heading.scrollIntoViewIfNeeded();
          const readChart = () => page.evaluate(() => {
            // Each chart's title is the first heading in the nearest ancestor that has one; a lazy chart has no wrapper yet.
            const titleOf = wrapper => { for (let node = wrapper.parentElement; node; node = node.parentElement) { const heading = node.querySelector("h1,h2,h3,h4"); if (heading) return heading.innerText.trim(); } };
            const wrapper = [...document.querySelectorAll(".recharts-wrapper")].find(wrapper => /^(?:.*: )?Time per Task$/.test(titleOf(wrapper) || ""));
            if (!wrapper) return null;
            const key = Object.keys(wrapper).find(key => key.startsWith("__reactFiber"));
            let fiber = key ? wrapper[key] : null;
            for (let depth = 0; fiber && depth < 60; depth++, fiber = fiber.return) {
              const items = fiber.memoizedProps?.items;
              if (!Array.isArray(items) || !items.length || !items.every(item => typeof item?.timePerTaskSeconds === "number")) continue;
              return items.map(item => ({ id: item.id, name: item.name, url: item.modelUrl || `/models/${item.slug}`, seconds: item.timePerTaskSeconds }));
            }
            return null;
          });
          for (let attempt = 0; attempt < 30 && !chartItems; attempt++) {
            chartItems = await readChart();
            if (!chartItems) await page.waitForTimeout(500);
          }
        }
        const { metric_path, items } = chooseTimingItems(source.slug, captured.time_chart_present, captured.payload_items, chartItems);
        const { payload_items, ...pageFields } = captured;
        if (!unitEvidence) {
          // The shared loader defines the unit but may be bundled with a later evaluation page.
          const scripts = await page.locator("script[src]").evaluateAll(elements => elements.map(element => element.src));
          for (const url of scripts) {
            if (!url.startsWith("https://artificialanalysis.ai/")) continue;
            const script = await page.request.get(url);
            if (!script.ok()) throw new Error(`HTTP ${script.status()} for ${url}`);
            const code = await script.text();
            const start = code.indexOf("evalTimePerTask:function");
            if (start < 0) continue;
            const excerpt = code.slice(start, start + 550);
            if (!excerpt.includes("getToolMsPerTask") || !excerpt.includes("/1e3")) continue;
            unitEvidence = { source_url: url, captured_at: new Date().toISOString(), sha256: createHash("sha256").update(code).digest("hex"), excerpt };
            break;
          }
        }
        evaluations.push({ evaluation_slug: source.slug, source_url: source.url, captured_at: new Date().toISOString(),
          ...pageFields, items, unit: "seconds", metric_path,
          selector: (await selector.innerText()).trim() });
        console.log(`${source.slug}: ${items.length} timings; ${await selector.innerText()}; ${captured.time_chart_present ? "read from the Time per Task chart" : "no time chart (payload retained)"}`);
      } catch (error) {
        const message = error.message.split("\n")[0];
        failures.push(`${source.slug}: ${message}`);
        console.error(`FAILED ${source.slug}: ${message}`);
      } finally {
        await page.close();
      }
    }
    if (failures.length) throw new Error(`Timing capture incomplete: ${failures.join("; ")}`);
    if (!unitEvidence) throw new Error("Official evalTimePerTask seconds definition is missing");
    const capture = { format_version: 1, unit_evidence: unitEvidence, evaluations };
    validateTimingCapture(capture, new Date().toISOString());
    const output = "data/aa-speed-captures.json";
    const temporary = `${output}.${process.pid}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(capture, null, 2)}\n`);
      await rename(temporary, output);
    } finally {
      await rm(temporary, { force: true });
    }
    console.log(`Saved all ${evaluations.length} evaluation timing payloads to ${output}`);
  } finally {
    await browser.close();
  }
});
