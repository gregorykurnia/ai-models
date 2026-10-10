// Browser check for the suitability planner. Run with the dev server on port 3180 (or BASE_URL).
// Saves use "Save in this browser", so this check never writes to the shared library.
// Set PLAYWRIGHT_MODULE to an installed Playwright module path if `playwright` is not resolvable from here.
// Set SCREENSHOT_DIR to keep the mobile screenshot.
import assert from "node:assert/strict";
import { join } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.BASE_URL || "http://localhost:3180";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  const sharedWrites = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.route(url => url.pathname === "/api/suitability/tasks", route => {
    if (route.request().method() !== "POST") return route.continue();
    sharedWrites.push(route.request().url());
    return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "This check does not write to the shared library." }) });
  });
  await page.goto(`${base}/suitability`);
  const save = page.getByRole("button", { name: "Save task and compare models" });
  const saveLocal = page.getByRole("button", { name: "Save in this browser" });
  await save.waitFor();
  assert(await save.isDisabled());
  await page.getByLabel("Task title").fill("Stock analysis");
  await page.getByLabel("Task description").fill("Ask for stock analysis");
  const evaluations = page.getByRole("heading", { name: "2. Choose evaluations and weights" }).locator("..");
  await evaluations.getByRole("checkbox").nth(0).check();
  await evaluations.getByRole("checkbox").nth(1).check();
  const models = page.getByRole("heading", { name: "3. Select candidate models" }).locator("..");
  await models.getByRole("button", { name: "Select visible", exact: true }).click();
  const count = await models.getByRole("checkbox").count();
  assert(count > 100, "No candidate maximum");
  const weightInputs = evaluations.locator('input[type="number"]');
  await weightInputs.nth(0).fill("75");
  assert(await saveLocal.isDisabled());
  await weightInputs.nth(1).fill("25");
  await saveLocal.click();
  await page.waitForURL(/suitability\/.+/);
  const taskUrl = page.url();
  const results = page.getByRole("region", { name: "Suitability results, scroll horizontally for all evaluations" });
  await results.locator("tbody tr").first().waitFor();
  assert.equal(await results.locator("tbody tr").count(), count);
  const firstScore = await results.locator("tbody tr").first().locator("td").nth(1).innerText();
  await results.locator("summary").first().click();
  assert(await results.getByText(/Component/).first().isVisible());
  assert((await results.locator("details a").first().getAttribute("href")).startsWith("/leaderboards/"));
  const sourceHref = await results.locator("details a").first().getAttribute("href");
  await results.locator("details a").first().click();
  await page.waitForURL(/leaderboards/);
  assert.equal(await page.locator("#model-search").inputValue(), new URL(sourceHref, taskUrl).searchParams.get("q"));
  assert((await page.locator("tbody td.model").count()) > 0, "Source query must match the evaluation's original model label");
  await page.goBack();
  await page.reload();
  // The saved task opens as a comparison; Edit settings shows the saved description and weights.
  await page.getByRole("button", { name: "Edit settings", exact: true }).click();
  await page.getByLabel("Task description").waitFor();
  await results.locator("tbody tr").first().waitFor();
  assert.equal(await page.getByLabel("Task description").inputValue(), "Ask for stock analysis");
  assert.equal(await weightInputs.nth(0).inputValue(), "75");
  assert.equal(await results.locator("tbody tr").count(), count);
  assert.equal(await results.locator("tbody tr").first().locator("td").nth(1).innerText(), firstScore);
  await page.getByLabel("Complete coverage only").check();
  assert((await results.locator("tbody tr").count()) <= count);
  await results.focus();
  await page.keyboard.press("ArrowRight");
  assert(await results.evaluate(e => e === document.activeElement));
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, "suitability-mobile.png") });
  const counters = await page.evaluate(() => JSON.parse(localStorage.getItem("model-benchmarks:planner-events:v1")));
  assert.deepEqual(Object.keys(counters).sort(), ["counts", "version"]);
  for (const event of ["planner_opened", "task_saved", "evaluations_selected", "weight_validation_failed", "comparison_calculated", "complete_coverage_filter_used", "result_breakdown_opened", "source_leaderboard_opened"])
    assert(counters.counts[event] > 0, `Missing event: ${event}`);
  await page.getByRole("button", { name: "Cancel editing" }).click();
  await page.getByRole("link", { name: "New task", exact: true }).click();
  await page.waitForURL(url => url.pathname === "/suitability");
  await page.waitForFunction(() => document.querySelector("#task-request")?.value === "");
  await page.getByLabel("Task title").fill("Full catalog");
  await page.getByLabel("Task description").fill("Full catalog comparison");
  const allEvaluations = await evaluations.getByRole("checkbox").all();
  for (const checkbox of allEvaluations) await checkbox.check();
  await models.getByRole("button", { name: "Select visible", exact: true }).click();
  await saveLocal.click();
  await page.waitForURL(/suitability\/.+/, { timeout: 120000 });
  // Coverage filter and the full table are in the editor's preview, so open Edit settings first.
  await page.getByRole("button", { name: "Edit settings", exact: true }).click();
  await results.locator("tbody tr").first().waitFor();
  await page.getByLabel("Complete coverage only").uncheck();
  // Identity column, two metric group headers, four metrics, one group header for evaluations, then one column per evaluation.
  assert.equal(await results.locator("thead th").count(), 7 + allEvaluations.length);
  assert.equal(await results.locator("tbody tr").count(), count);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  assert.deepEqual(sharedWrites, [], "the check must not write to the shared library");
  console.log(JSON.stringify({ taskUrl, candidates: count, fullCatalogSave: true, reload: true, invalidWeightsBlocked: true, eventCounters: counters.counts, mobileOverflow: false, errors, sharedWrites: sharedWrites.length }));
} finally { await browser.close(); }
