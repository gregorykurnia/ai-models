import assert from "node:assert/strict";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// Use the same installed Playwright module and local server as the master check.
const playwrightModule = process.env.PLAYWRIGHT_MODULE || "playwright";
const { chromium } = await import(playwrightModule);
const { expect } = createRequire(import.meta.resolve(playwrightModule))("playwright/test");
const base = process.env.BASE_URL || "http://127.0.0.1:3180";
const output = process.env.PERSONALITY_SCREENSHOT_DIR || fileURLToPath(new URL("../docs/screenshots/personality/", import.meta.url));
const inventory = await readFile(new URL("../docs/AA_PERSONALITYBENCH_CAPTURE.md", import.meta.url), "utf8");
const inventoryCount = inventory.match(/The selector reported \*\*(\d+) of (\d+) models\*\*/);
assert(inventoryCount, "Capture inventory must report the selected and total model counts");
const [, selected, total] = inventoryCount;
const modelCount = Number(total);
const { models } = JSON.parse(await readFile(new URL("../data/aa-personalitybench.json", import.meta.url), "utf8"));
assert.equal(selected, total, "The inventory must describe a complete capture");
assert.equal(models.length, modelCount, "Bundled model count must match the capture inventory");

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });

  const card = page.locator("#personality-leaderboard");
  const scroll = card.locator(".table-scroll");
  const table = scroll.locator("table");
  const rows = table.locator("tbody tr").filter({ has: page.locator("td.master-model") });
  const count = card.locator('p[aria-live="polite"]');
  const levels = card.getByRole("navigation", { name: "Personality levels" });
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  const search = card.getByRole("textbox", { name: "Search models" });
  const provider = card.locator("#personality-provider");
  const favorites = card.locator("#personality-favorites");
  const heading = name => card.getByRole("heading", { name, exact: true });
  const header = key => table.locator(`thead th[data-column="${key}"]`);
  const expectCount = async (number) => {
    await expect(count).toHaveText(new RegExp(`^${number} ${number === 1 ? "model" : "models"}(?: ·|$)`));
  };

  const rowModels = async () => rows.evaluateAll(elements => elements.map(row => ({
    name: row.querySelector(".personality-model").firstChild.textContent,
    provider: row.querySelector("td.master-provider").textContent,
  })));

  const assertSort = async (key, direction, valueOf) => {
    await expect(header(key)).toHaveAttribute("aria-sort", direction === "asc" ? "ascending" : "descending");
    await expect(rows).toHaveCount(modelCount);
    const testedModels = (await rowModels()).map(({ name, provider }) => {
      const model = models.find(candidate => candidate.name === name && candidate.provider === provider);
      assert(model, `Unexpected browser row: ${name} (${provider})`);
      return model;
    });
    assert.equal(new Set(testedModels).size, modelCount, `${key}: every model must appear exactly once`);
    const values = testedModels.map(valueOf);
    const known = values.filter(value => value !== null);
    assert(new Set(known).size > 1, `${key}: expected distinct raw scores`);
    const expected = [...known].sort((left, right) => direction === "asc" ? left - right : right - left);
    assert.deepEqual(values, expected.concat(values.filter(value => value === null)), `${key}: ${direction} raw scores with missing values last`);
  };

  await page.goto(base);
  await page.getByRole("link", { name: /Open the personality table/ }).click();
  await page.waitForURL(url => url.pathname === "/personality");
  await expect(nav.getByRole("link", { name: "Personality", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(heading("All indexes")).toBeVisible();
  await expectCount(modelCount);
  await card.getByRole("combobox", { name: "Rows per page" }).selectOption("100");
  await expect(rows).toHaveCount(modelCount);

  await header("slop").getByRole("button").click();
  await assertSort("slop", "asc", model => model.index_percentiles.slop ?? null);

  await levels.getByRole("link", { name: "Warmth", exact: true }).click();
  await expect(heading("Warmth")).toBeVisible();
  await expectCount(modelCount);
  const sincere = header("sincere");
  const sincerePercentile = model => model.traits.sincere?.percentile ?? null;
  await sincere.getByRole("button").click();
  await assertSort("sincere", "desc", sincerePercentile);
  await sincere.getByRole("button").click();
  await assertSort("sincere", "asc", sincerePercentile);
  await levels.getByRole("link", { name: "Sincere", exact: true }).click();
  await expect(heading("Sincere")).toBeVisible();
  await expectCount(modelCount);
  await assertSort("percentile", "desc", sincerePercentile);

  await provider.click();
  const anthropicOption = card.getByRole("checkbox", { name: "Anthropic", exact: true });
  await anthropicOption.click();
  await page.waitForURL(url => url.searchParams.get("p") === "Anthropic");
  await expect(anthropicOption).toBeChecked();
  await provider.press("Escape");
  const anthropic = models.filter(model => model.provider === "Anthropic");
  await expectCount(anthropic.length);
  await expect(rows).toHaveCount(anthropic.length);
  assert((await rowModels()).every(row => row.provider === "Anthropic"), "Provider-only results must all be Anthropic");
  await search.fill("claude");
  await page.waitForURL(url => url.searchParams.get("q") === "claude" && url.searchParams.get("p") === "Anthropic");
  const claudeNames = anthropic.filter(model => model.name.toLowerCase().includes("claude")).map(model => model.name).sort();
  assert(claudeNames.length > 0, "The combined filter must exercise real rows");
  for (const reload of [false, true]) {
    if (reload) await page.reload();
    await expect(heading("Sincere")).toBeVisible();
    await expect(search).toHaveValue("claude");
    await expect(provider).toContainText("Anthropic");
    await expectCount(claudeNames.length);
    await expect(rows).toHaveCount(claudeNames.length);
    const filtered = await rowModels();
    assert(filtered.every(row => row.provider === "Anthropic"));
    assert.deepEqual(filtered.map(row => row.name).sort(), claudeNames);
  }

  await search.fill("zzzz-no-such-model");
  await expect(card.getByText("No models match these filters.", { exact: true })).toBeVisible();
  await expectCount(0);
  await expect(rows).toHaveCount(0);

  const starredModel = "GPT-6.2 Astra (Max)";
  const unstarredModel = "GPT-6.2 Sol (Max)";
  const pair = `${starredModel}, ${unstarredModel}`;
  await page.goto(`${base}/?${new URLSearchParams({ mq: pair })}#master-leaderboard`);
  const master = page.locator("#master-leaderboard .master-table-view");
  const star = master.getByRole("button", { name: `Add ${starredModel} to favorites`, exact: true });
  await expect(star).toHaveAttribute("aria-pressed", "false");
  await star.click();
  await expect(master.getByRole("button", { name: `Remove ${starredModel} to favorites`, exact: true })).toHaveAttribute("aria-pressed", "true");
  await nav.getByRole("link", { name: "Personality", exact: true }).click();
  await expect(heading("All indexes")).toBeVisible();
  await search.fill(pair);
  const starred = rows.getByRole("button", { name: `Remove ${starredModel} to favorites`, exact: true });
  const unstarred = rows.getByRole("button", { name: `Add ${unstarredModel} to favorites`, exact: true });
  await expect(starred).toHaveAttribute("aria-pressed", "true");
  await expect(unstarred).toHaveAttribute("aria-pressed", "false");
  await favorites.selectOption({ label: "Favorites only" });
  await expectCount(1);
  await expect(rows).toHaveCount(1);
  await expect(starred).toBeVisible();
  await expect(unstarred).toHaveCount(0);
  await starred.click();
  await expectCount(0);

  const views = [
    ["All indexes", "all", ""],
    ["Transparency", "transparency", "?index=transparency"],
    ["Sincere", "sincere", "?index=warmth&trait=sincere"],
    ["Slop", "slop", "?index=slop"],
    ["Sycophantic", "sycophantic", "?index=transparency&trait=sycophantic"],
    ["Emotionally Intelligent", "emotionally-intelligent", "?index=warmth&trait=emotionallyIntelligent"],
  ];
  await mkdir(output, { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const [name, filename, query] of views) {
      await page.goto(`${base}/personality${query}`);
      if (name === "Sincere") await page.reload();
      await expect(heading(name)).toBeVisible();
      await expectCount(modelCount);
      await page.evaluate(() => document.fonts.ready);
      await page.mouse.move(0, 0);
      const shot = join(output, `${filename}-${width}.png`);
      await page.screenshot({ path: shot, animations: "disabled" });
      if (filename === "all" && process.env.BUSINESS_SCREENSHOT_DIR) {
        await mkdir(process.env.BUSINESS_SCREENSHOT_DIR, { recursive: true });
        await copyFile(shot, join(process.env.BUSINESS_SCREENSHOT_DIR, `personality-${width}.png`));
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} at ${width}px: page overflows`);
      if (width === 1440) {
        assert(await scroll.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${name}: desktop table overflows`);
        const interval = header("interval");
        if (query.includes("trait=") || name === "Slop") {
          await expect(interval).toBeVisible();
          await expect(interval.getByRole("button")).toHaveCount(0);
          const scoreColor = await header("percentile").getByRole("button").evaluate(button => getComputedStyle(button).color);
          await expect(interval.locator(".personality-static-header")).toHaveCSS("color", scoreColor);
          const tableWidth = (await scroll.boundingBox()).width;
          assert(tableWidth <= 768, `${name}: wide gaps between desktop trait scores`);
          assert.equal((await card.getByRole("navigation", { name: "Table pagination" }).boundingBox()).width, tableWidth,
            `${name}: pagination must align with the trait table`);
        }
        if (name === "Transparency") {
          const definitions = card.locator(".master-intro .personality-definitions");
          const term = definitions.locator("dt").filter({ hasText: /^Sycophantic$/ });
          await expect(term.locator("../dd")).toContainText("↓ lower is better.");
          const top = async locator => (await locator.boundingBox()).y;
          assert.equal(await top(term.locator("../dd")), await top(definitions.locator("dd").first()), "Sycophantic's definition must line up with the other definitions");
        }
      } else {
        const firstRow = rows.first();
        const region = await scroll.boundingBox();
        const secondScore = await firstRow.locator("td.numeric").nth(1).boundingBox();
        const model = firstRow.locator("td.master-model");
        const modelBefore = await model.boundingBox();
        assert(modelBefore.y + modelBefore.height <= 844, `${name}: first model ends at ${modelBefore.y + modelBefore.height}px on an 844px phone screen`);
        assert(secondScore.x + secondScore.width <= region.x + region.width + 1, `${name}: two scores must fit beside the model`);
        await scroll.evaluate(element => { element.scrollLeft = element.scrollWidth; });
        assert(await scroll.evaluate(element => element.scrollLeft > 0), `${name}: table must scroll on the phone`);
        const modelAfter = await model.boundingBox();
        assert(Math.abs(modelBefore.x - modelAfter.x) < 2, `${name}: the model column must stay pinned`);
        await scroll.evaluate(element => { element.scrollLeft = 0; });
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(`Personality browser check passed: ${modelCount} models, sorts, filters, reload, favorites, navigation and ${2 * views.length} screenshots`);
} finally {
  await browser.close();
}
