// Timing-only projection of AA's public evaluation context; leaves score captures unchanged.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs npm run capture:aa-speed
import { createHash } from "node:crypto";
import { rename, rm, writeFile } from "node:fs/promises";
import { evaluationTimingSources, validateTimingCapture, withSpeedCaptureLock } from "./aa-speed-sources.ts";

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
              items: models.filter(model => model.evalTimePerTask !== undefined && model.evalTimePerTask !== null)
                .map(model => ({ id: model.id, name: model.name, url: model.modelUrl || `/models/${model.slug}`, seconds: model.evalTimePerTask })),
            };
          }
          throw new Error("Complete EvaluationDataProvider.selectedModels timing payload is missing");
        });
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
          ...captured, unit: "seconds", metric_path: "EvaluationDataProvider.selectedModels[].evalTimePerTask",
          selector: (await selector.innerText()).trim() });
        console.log(`${source.slug}: ${captured.items.length} timings; ${await selector.innerText()}; time chart ${captured.time_chart_present ? "present" : "absent (payload retained)"}`);
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
