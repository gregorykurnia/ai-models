// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/capture-aa-personalitybench.mjs
import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { completeModelSelectionCount, expandSelectors, modelSelectors } from "./capture-aa-evaluations.mjs";

export const personalityBenchUrl = "https://artificialanalysis.ai/evaluations/aa-personalitybench";
export const personalityCaptureFile = "data/aa-captures/aa-personalitybench.json";

/** @param {string} selector @param {number} modelCount */
export function assertCompletePersonalitySelection(selector, modelCount) {
  if (modelCount !== completeModelSelectionCount(selector)) {
    throw new Error(`${personalityBenchUrl}: incomplete model selection (${selector}, ${modelCount} judged records)`);
  }
}

// This runs in the browser. AA gives all charts the same selected-model context.
function readPayload(button) {
  const fiberOf = node => node[Object.keys(node).find(key => key.startsWith("__reactFiber"))];
  let selectedModels;
  let traits;
  for (let fiber = fiberOf(button); fiber; fiber = fiber.return) {
    const props = fiber.memoizedProps;
    if (Array.isArray(props?.value?.selectedJudgedModels)) selectedModels ??= props.value.selectedModels;
    traits ??= props?.messages?.shared?.personalitybench?.traits;
    if (selectedModels && traits) break;
  }
  if (!Array.isArray(selectedModels) || !traits) throw new Error("missing judged model or trait payload");

  const cards = document.querySelectorAll('#how-traits-form-personality-indexes a[href*="/indexes/"]');
  if (!cards.length) throw new Error("missing personality index cards");
  const index_cards = [...cards].map(card => {
    const [header, description, traitList] = card.children;
    const [label, count] = header?.children ?? [];
    const questions = /^(\d+) questions?$/.exec(count?.textContent.trim() ?? "");
    const keys = [...(traitList?.children ?? [])].map(node => fiberOf(node)?.key);
    if (!label?.textContent.trim() || !description?.textContent.trim() || !questions || !keys.length || keys.some(key => !key)) {
      throw new Error(`missing index card metadata for ${card.getAttribute("href")}`);
    }
    return {
      key: new URL(card.href).pathname.split("/").at(-1),
      label: label.textContent.trim(),
      description: description.textContent.trim(),
      question_count: Number(questions[1]),
      traits: keys,
    };
  });

  const models = selectedModels.filter(model => model?.judged && typeof model.judged === "object" && !Array.isArray(model.judged))
    .map(({ id, slug, name, creator, judged }) => ({ id, slug, name, creator, judged }));
  return { selector: button.innerText.trim(), index_cards, traits, models };
}

export async function capturePersonalityBench(page, capturedAt = new Date().toISOString()) {
  try {
    const response = await page.goto(personalityBenchUrl, { waitUntil: "networkidle", timeout: 120000 });
    if (!response?.ok()) throw new Error(`HTTP ${response?.status()}`);
    const scope = page.locator("#detailed-personality-trait-results");
    const selector = modelSelectors(scope);
    await selector.first().waitFor({ state: "attached", timeout: 15000 });
    if (await selector.count() !== 1) throw new Error("expected one model selector in Detailed Personality Trait Results");
    await expandSelectors(page, scope);
    const payload = await selector.evaluate(readPayload);
    assertCompletePersonalitySelection(payload.selector, payload.models.length);
    if (payload.models.some(model => !model.id || !model.name?.trim() || !model.creator?.name?.trim())
      || new Set(payload.models.map(model => model.id)).size !== payload.models.length) {
      throw new Error("missing or duplicate model data in judged records");
    }
    return { captured_at: capturedAt, source_url: personalityBenchUrl, ...payload };
  } catch (cause) {
    if (cause.message.startsWith(personalityBenchUrl)) throw cause;
    throw new Error(`${personalityBenchUrl}: ${cause.message}`, { cause });
  }
}

/** @template T @param {() => Promise<T>} run */
export async function withPersonalityBenchLock(run) {
  const path = "data/.aa-personalitybench.lock";
  const lock = await open(path, "wx").catch(error => {
    if (error.code === "EEXIST") throw new Error(`PersonalityBench capture or import is already running (${path})`);
    throw error;
  });
  try {
    await lock.writeFile(`${process.pid}\n`);
    return await run();
  } finally {
    await lock.close();
    await rm(path);
  }
}

/** @param {{ path: string, text: string }[]} outputs */
export async function writePersonalityBenchFiles(outputs) {
  const staged = [];
  try {
    for (const { path, text } of outputs) {
      const existing = await readFile(path, "utf8").catch(error => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (existing === text) continue;
      const temporary = `${path}.${process.pid}.tmp`;
      staged.push({ path, temporary });
      await writeFile(temporary, text);
    }
    for (const { path, temporary } of staged) await rename(temporary, path);
  } finally {
    await Promise.all(staged.map(({ temporary }) => rm(temporary, { force: true })));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await mkdir("data/aa-captures", { recursive: true });
  await withPersonalityBenchLock(async () => {
    const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
      const capture = await capturePersonalityBench(page);
      await writePersonalityBenchFiles([{ path: personalityCaptureFile, text: `${JSON.stringify(capture)}\n` }]);
      console.log(`Captured ${capture.models.length} judged models (${capture.selector}) to ${personalityCaptureFile}`);
    } finally {
      await browser.close();
    }
  });
}
