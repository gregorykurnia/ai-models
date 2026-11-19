import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const playwrightModule = process.env.PLAYWRIGHT_MODULE || "playwright";
const { chromium } = await import(playwrightModule);
const { expect } = createRequire(import.meta.resolve(playwrightModule))("playwright/test");
const base = process.env.BASE_URL || "http://127.0.0.1:3180";
const output = new URL("../docs/screenshots/workflows/", import.meta.url);

// App picks recorded independently of the scorer in docs/workflows/sales-proposal-check.md.
const expectedPicks = [
  ["1", "Claude Sonnet 5.5 (Adaptive Reasoning, Max Effort, Default Fallback)"],
  ["3a", "Claude Fable 5.2 (Adaptive Reasoning, Max Effort, Default Fallback)"],
  ["6", "DeepSeek V4.1 Flash 1017 (Max)"],
  ["7", "DeepSeek V4.1 Flash (Max)"],
];

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });

  const main = page.getByRole("main");
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  const workflowsLink = page.getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Workflows", exact: true });
  const overview = main.locator(".workflow-overview-table");
  const overviewRows = overview.locator("tbody tr");
  const step = main.locator("#step-3a");
  const stepHeading = step.getByRole("heading", { name: /^Step 3a · / });

  await mkdir(output, { recursive: true });
  for (const { width, height } of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const mobile = width === 390;
    await page.setViewportSize({ width, height });

    const expectCurrentWorkflow = async () => {
      if (mobile) await menu.click();
      await expect(workflowsLink).toBeVisible();
      await expect(workflowsLink).toHaveAttribute("aria-current", "page");
      if (mobile) {
        await page.keyboard.press("Escape");
        await expect(menu).toHaveAttribute("aria-expanded", "false");
      }
    };
    const screenshot = async name => {
      await page.evaluate(() => document.fonts.ready);
      await page.mouse.move(0, 0);
      await page.screenshot({ path: fileURLToPath(new URL(`${name}-${width}.png`, output)), animations: "disabled" });
    };
    const expectStepInView = async () => {
      await expect(page).toHaveURL(/#step-3a$/);
      await expect(stepHeading).toBeInViewport({ ratio: 1 });
      await expect.poll(() => stepHeading.evaluate(heading => {
        const bounds = heading.getBoundingClientRect();
        const visible = document.elementFromPoint(bounds.left + 1, bounds.top + bounds.height / 2);
        return heading.contains(visible);
      }), { message: `Step 3a heading is unobstructed at ${width}px` }).toBe(true);
    };

    await page.goto(`${base}/workflows`);
    await expect(main.getByRole("heading", { name: "Workflows", exact: true })).toBeVisible();
    const proposal = main.getByRole("article").filter({ has: page.getByRole("heading", { name: "Sales proposal", exact: true }) });
    await expect(proposal.getByText("15 steps", { exact: true })).toBeVisible();
    await screenshot("list");
    await expectCurrentWorkflow();

    await proposal.getByRole("link", { name: "Open Sales proposal" }).click();
    await expect(page).toHaveURL(/\/workflows\/sales-proposal$/);
    await expect(main.getByRole("heading", { name: "Sales proposal", exact: true })).toBeVisible();
    await expect(overviewRows).toHaveCount(15);
    for (const [id, name] of expectedPicks) {
      const row = overviewRows.filter({ has: page.locator(`a[href="#step-${id}"]`) });
      await expect(row.locator(".workflow-pick .workflow-pick-name"), `Step ${id} pick at ${width}px`).toHaveText(name);
    }
    await screenshot("overview");
    await expectCurrentWorkflow();

    await expect(stepHeading).not.toBeInViewport();
    const stepTitle = overview.getByRole("link", { name: "Situation and pain points", exact: true });
    await expect(stepTitle).toHaveAttribute("href", "#step-3a");
    await stepTitle.click();
    await expectStepInView();

    const briefcase = step.getByRole("columnheader", { name: /Briefcase/ });
    await expect(briefcase).toBeAttached();
    const briefcaseColumn = await briefcase.evaluate(header => header.cellIndex + 1);
    const ranks = step.locator(`tbody td:nth-child(${briefcaseColumn})`);
    await expect(ranks.filter({ hasText: /^#\d+ of \d+$/ }).first()).toBeAttached();

    if (mobile) {
      await page.reload();
      await expectStepInView();
    }
    await screenshot("step-3a");
  }

  const missing = await page.request.get(`${base}/workflows/nope`);
  assert.equal(missing.status(), 404, "Unknown workflow slug must return HTTP 404");
  assert.match(await missing.text(), /Evaluation not found/, "Unknown workflow slug must show the site's not-found page");
  const malformed = await page.request.get(`${base}/workflows/%ZZ`);
  assert.ok([400, 404].includes(malformed.status()), `Malformed workflow URL returned HTTP ${malformed.status()}`);
  const encoded = await page.goto(`${base}/workflows/%73ales-proposal`);
  assert.equal(encoded?.status(), 200, "Encoded spelling of a registered workflow slug must resolve");
  await expect(main.getByRole("heading", { name: "Sales proposal", exact: true })).toBeVisible();
  assert.deepEqual(errors, []);
  console.log("Workflows browser check passed: 15 steps, four documented picks, Briefcase rank, anchor, navigation, 404 and six screenshots");
} finally {
  await browser.close();
}
