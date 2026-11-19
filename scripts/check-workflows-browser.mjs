import assert from "node:assert/strict";
import { createRequire } from "node:module";

const playwrightModule = process.env.PLAYWRIGHT_MODULE || "playwright";
const { chromium } = await import(playwrightModule);
const { expect } = createRequire(import.meta.resolve(playwrightModule))("playwright/test");
const base = process.env.BASE_URL || "http://127.0.0.1:3180";

// Picks verified against the 19 Nov 2026 refresh in docs/workflows/sales-proposal-check.md.
const proposalPicks = [
  ["1", "Claude Sonnet 5.5 (Adaptive Reasoning, Max Effort, Default Fallback)"],
  ["3a", "Claude Fable 5.2 (Adaptive Reasoning, Max Effort, Default Fallback)"],
  ["6", "DeepSeek V4.1 Flash 1017 (Max)"],
  ["7", "GPT-6.2 Sol (Medium)"],
];

// Picks verified against the 19 Nov 2026 refresh in docs/workflows/client-meeting-followup-check.md.
const meetingPicks = [
  ["1", "Claude Opus 5.5 (Adaptive Reasoning, Max Effort, Default Fallback)"],
  ["4", "GPT-6.1 Sol (Max)"],
  ["6", "Claude Fable 5.1 (Adaptive Reasoning, Max Effort, Default Fallback)"],
];

const modelLabels = [
  "Any OpenAI model",
  "Any Anthropic model",
  "Muse Spark 1.3",
  "Grok 4.5",
  "GLM 5.3 Max",
  "GLM 5.3 Flash",
  "Qwen4 Max",
  "Gemini 3.8 Flash",
  "Gemini 3.1 Pro",
  "DeepSeek V4.1 Flash 1017",
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
  const overviewRow = id => overviewRows.filter({ has: page.locator(`a[href="#step-${id}"]`) });
  const step = main.locator("#step-3a");
  const stepHeading = step.getByRole("heading", { name: /^Step 3a · / });

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
    const expectPicks = async (workflow, picks) => {
      for (const [id, name] of picks) {
        const pick = overviewRow(id).locator(".workflow-pick:visible .workflow-pick-name");
        await expect(pick, `${workflow} step ${id} pick at ${width}px`).toHaveText(name);
      }
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
    const meeting = main.getByRole("article").filter({ has: page.getByRole("heading", { name: "Client meeting follow-up", exact: true }) });
    await expect(proposal.getByText("14 steps", { exact: true })).toBeVisible();
    await expect(meeting.getByText("6 steps", { exact: true })).toBeVisible();
    const models = main.getByRole("region", { name: "Your models", exact: true });
    await expect(models.getByRole("listitem")).toHaveCount(modelLabels.length);
    for (const label of modelLabels) await expect(models.getByText(label, { exact: true })).toBeVisible();
    await expectCurrentWorkflow();

    await proposal.getByRole("link", { name: "Open Sales proposal" }).click();
    await expect(page).toHaveURL(/\/workflows\/sales-proposal$/);
    await expect(main.getByRole("heading", { name: "Sales proposal", exact: true })).toBeVisible();
    await expect(overviewRows).toHaveCount(14);
    const otherColumns = ["Goal", "Aim high", "Aim moderate", "Aim low"];
    await expect(overview.getByRole("columnheader")).toHaveText(mobile
      ? ["Step", "Pick", ...otherColumns, "Runners-up"]
      : ["Step", ...otherColumns, "Pick", "Runners-up"]);
    await expectPicks("Sales proposal", proposalPicks);
    const creative = overviewRow("2").getByText("Creative", { exact: true });
    const structured = overviewRow("2").getByText("Structured", { exact: true });
    assert((await structured.boundingBox()).y > (await creative.boundingBox()).y, "Step 2 chips must stack");
    if (mobile) {
      await expect(overview.getByRole("columnheader", { name: "Pick", exact: true })).toBeInViewport({ ratio: 1 });
      await expect(overviewRow("0").locator(".workflow-pick:visible")).toBeInViewport({ ratio: 1 });
      const stepOnePick = overviewRow("1").locator(".workflow-pick:visible");
      await expect(stepOnePick).toBeInViewport();
      // The second row can cross the bottom of the phone viewport. Scroll vertically to read it in full.
      await page.mouse.move(width / 2, height / 2);
      await page.mouse.wheel(0, 160);
      await expect(stepOnePick).toBeInViewport({ ratio: 1 });
      const disclaims = overviewRow("1").getByText("Disclaims Assumptions", { exact: true });
      await expect(disclaims).toBeAttached();
      assert.equal(await disclaims.evaluate(chip => {
        const text = document.createRange();
        text.selectNodeContents(chip);
        return text.getClientRects().length;
      }), 1, "Disclaims Assumptions must fit on one line on the phone");
    }
    await expectCurrentWorkflow();

    await expect(stepHeading).not.toBeInViewport();
    const stepTitle = overview.getByRole("link", { name: "Situation and pain points", exact: true });
    await expect(stepTitle).toHaveAttribute("href", "#step-3a");
    await stepTitle.click();
    await expectStepInView();

    const briefcase = step.getByRole("columnheader", { name: /Briefcase/ });
    await expect(briefcase).toBeAttached();
    await expect(step.getByRole("table")).toHaveAccessibleDescription(/Fit measures.*Evaluation columns show its rank/);
    const briefcaseColumn = await briefcase.evaluate(header => header.cellIndex + 1);
    const ranks = step.locator(`tbody td:nth-child(${briefcaseColumn})`);
    await expect(ranks.filter({ hasText: /^#\d+ of \d+$/ }).first()).toBeAttached();

    if (mobile) {
      await page.reload();
      await expectStepInView();
    }

    await page.goto(`${base}/workflows`);
    await meeting.getByRole("link", { name: "Open Client meeting follow-up", exact: true }).click();
    await expect(page).toHaveURL(/\/workflows\/client-meeting-followup$/);
    await expect(main.getByRole("heading", { name: "Client meeting follow-up", exact: true })).toBeVisible();
    await expect(overviewRows).toHaveCount(6);
    await expectPicks("Client meeting follow-up", meetingPicks);
    const belowBar = main.locator("#step-1").getByText(/^Higher Fit, below the bar · /);
    await expect(belowBar).toBeVisible();
    await expect(belowBar).toContainText(/#\d+ of \d+, bar #\d+/);
    await expectCurrentWorkflow();
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
  console.log("Workflows browser check passed at 1440px and 390px: 14 proposal rows, six meeting rows, seven documented picks, Your models, below-bar note, Briefcase rank, anchor, navigation and 404");
} finally {
  await browser.close();
}
