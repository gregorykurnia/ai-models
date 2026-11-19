import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export const businessSlug = "aa-omniscience-business";
const title = "AA-Omniscience Net Score: Business";
const label = "Omniscience Business";
const notes = "Net Score on the Business questions of AA-Omniscience v1.1 only.";
const output = process.env.BUSINESS_SCREENSHOT_DIR || "docs/screenshots/neon-omniscience-business";
const widths = [1440, 390];
const unscored = "GPT-4o mini";
const readJson = async name => JSON.parse(await readFile(new URL(`../data/${name}`, import.meta.url), "utf8"));
const { charts: [chart], source_url: sourceUrl, captured_at: captureDate } = await readJson("aa-captures/omniscience-business.json");
const dataset = await readJson("leaderboards.json");
const entries = dataset.entries.filter(entry => entry.evaluation_id === businessSlug).sort((a, b) => a.source_row - b.source_row);
const positive = entries.find(entry => entry.model === "Gemini 4 Neon (Xhigh)");
const negative = entries.at(-1);
const businessScore = entry => entry.score_value.toFixed(4);

async function screenshot(page, name, target = page) {
  await mkdir(output, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  await target.screenshot({ path: join(output, name + ".png"), animations: "disabled" });
}

const setWidth = (page, width) => page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });

async function assertFits(target, description, wraps = false) {
  assert(await target.evaluate((element, wraps) => {
    const box = element.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(element);
    const text = [...range.getClientRects()];
    return box.width > 0 && box.left >= 0 && box.right <= innerWidth + 1 &&
      text.every(rect => rect.left >= box.left - 1 && rect.right <= box.right + 1) &&
      (!wraps || new Set(text.map(rect => rect.top)).size > 1);
  }, wraps), description);
}

export async function checkBusinessEvaluation(page, base) {
  assert.equal(chart.title, "AA-Omniscience Net Score by Domain: Business");
  assert.deepEqual(chart.selectorLabels, [`${chart.items.length} of ${chart.items.length} models`]);
  assert.deepEqual(entries.map(entry => entry.score_value), chart.items.map(item => item.value), "Every imported score matches the chart");
  assert.equal(new Set(entries.map(entry => entry.model.toLowerCase())).size, entries.length);
  assert(positive.score_value > 0 && negative.score_value < 0);
  for (const width of widths) {
    const mobile = width === 390;
    await setWidth(page, width);
    assert.equal((await page.goto(base))?.status(), 200);
    const indexLink = page.getByRole("heading", { name: title, exact: true }).getByRole("link");
    assert.equal(await indexLink.locator("../..").locator(".evaluation-meta").innerText(), `Net Score · ${chart.items.length} ranked models`);
    await indexLink.scrollIntoViewIfNeeded();
    await screenshot(page, `leaderboards-index-business-${width}`);
    await indexLink.click();
    await page.waitForURL(`**/leaderboards/${businessSlug}`);
    const heading = page.getByRole("heading", { name: title, exact: true });
    await heading.waitFor();
    assert.equal((await page.goto(`${base}/leaderboards/${businessSlug}?size=250`))?.status(), 200);
    await assertFits(heading, `Business heading fits at ${width}px`, mobile);
    const sourceLink = page.getByRole("link", { name: /Original source/ });
    assert.equal(await sourceLink.getAttribute("href"), sourceUrl);
    assert.equal(new URL(sourceUrl).searchParams.get("detailed-domain-results"), "omniscience-net-score-by-domain");
    if (!mobile && process.env.CHECK_AA_SOURCE === "1") {
      const opened = page.waitForEvent("popup");
      await sourceLink.click();
      const popup = await opened;
      try {
        await popup.waitForURL(sourceUrl);
        const tab = popup.getByRole("tab", { name: "AA-Omniscience Net Score by Domain", exact: true, selected: true });
        await tab.waitFor({ timeout: 20000 });
        assert.equal(await tab.getAttribute("aria-selected"), "true");
        console.log("AA source link opened with Net Score by Domain selected");
      } finally {
        await popup.close();
      }
    }

    const board = page.locator(".evaluation-leaderboard");
    const rows = board.locator(mobile ? ".evaluation-card" : ".evaluation-table tbody tr");
    const displayed = await rows.evaluateAll((elements, mobile) => elements.map(row => {
      if (mobile) return [row.dataset.model, row.querySelector("strong").textContent, row.querySelector(".evaluation-card__score").textContent];
      const cell = name => row.querySelector(`[data-column="${name}"]`).textContent.trim();
      return [cell("model"), `#${cell("source_rank")} ${cell("model")}`, cell("score_value")];
    }), mobile);
    assert.deepEqual(displayed, entries.map(entry => [entry.model, `#${entry.source_rank} ${entry.model}`, `${mobile ? "Net Score: " : ""}${businessScore(entry)}`]));
    if (mobile) {
      assert(await rows.locator(".evaluation-card__score").evaluateAll(labels => labels.every(label => {
        const range = document.createRange();
        range.selectNodeContents(label);
        return new Set(Array.from(range.getClientRects(), rect => rect.top)).size === 1 &&
          range.getBoundingClientRect().right <= label.closest(".evaluation-card").getBoundingClientRect().right;
      })), "Business score labels and values fit together on phones");
    } else {
      assert.match(await board.locator('th[data-column="score_value"] button').first().innerText(), /^Net Score\s+[↕↑↓]$/);
      const chinaMobile = rows.locator('td[data-column="provider"]').filter({ hasText: /^China Mobile$/ });
      assert(await chinaMobile.evaluate(cell => {
        const range = document.createRange();
        range.selectNodeContents(cell);
        return cell.closest(".table-scroll").getBoundingClientRect().right - range.getBoundingClientRect().right >= 12;
      }), "China Mobile clears the right edge of the visible table");
      for (const model of ["Command A+", "K2 Horizon 375B A23B", "North Mini Code"]) {
        const row = rows.filter({ has: page.getByText(model, { exact: true }) });
        assert.equal(await row.locator('td[data-column="cost_usd"] a').innerText(), "$0.00", `${model}: captured zero cost remains visible`);
      }
    }
    assert.match(await board.locator("p[aria-live]").innerText(), new RegExp(`^${chart.items.length} results`));
    await screenshot(page, `evaluation-${width}`);

    const last = rows.last();
    const score = last.locator(mobile ? ".evaluation-card__score" : '[data-column="score_value"]');
    assert.match(await score.innerText(), /-\d/);
    await screenshot(page, `evaluation-${width}-last-negative`, mobile ? last : score);
    if (mobile) {
      const longest = entries.reduce((a, b) => a.model.length >= b.model.length ? a : b);
      const row = rows.filter({ has: page.getByText(`#${longest.source_rank} ${longest.model}`, { exact: true }) });
      await assertFits(row.locator("strong"), "Longest model name fits in its phone card");
      await screenshot(page, "evaluation-390-longest-name", row);
      await screenshot(page, "evaluation-390-first-row", rows.first());
    }
    const detail = page.locator(".evaluation-notes");
    await detail.locator("summary").click();
    await detail.getByText(notes, { exact: true }).waitFor();
    await assertFits(detail.getByText(notes, { exact: true }), "Business notes fit");
    await screenshot(page, `evaluation-${width}-notes`, detail);

    // The phone cohort spans multiple normal pagination pages to keep each PNG
    // within Chromium's screenshot height limit.
    const pageSize = mobile ? 50 : 250;
    for (let offset = 0; offset < entries.length; offset += pageSize) {
      const number = offset / pageSize + 1;
      await setWidth(page, width);
      await page.goto(`${base}/leaderboards/${businessSlug}?size=${pageSize}&page=${number}`);
      await rows.first().waitFor({ state: "visible" });
      assert.equal(await rows.count(), Math.min(pageSize, entries.length - offset));
      await page.evaluate(() => document.fonts.ready);
      const main = page.locator(".app-main");
      const height = await main.evaluate(element => {
        element.scrollTop = 0;
        return Math.ceil(element.getBoundingClientRect().top + element.scrollHeight);
      });
      await page.setViewportSize({ width, height });
      assert(await rows.last().evaluate(row => row.getBoundingClientRect().bottom <= innerHeight), "The last cohort row is in frame");
      await screenshot(page, `evaluation-${width}-cohort-${number}`);
    }
  }
  console.log(`${businessSlug}: all ${entries.length} capture scores, minus sign, heading, longest name, notes and index link at 1440/390px`);
}

export async function checkBusinessMaster(page, base, expect, exportRanks) {
  const neon = entries.filter(entry => /Gemini 4 Neon/.test(entry.model));
  assert.equal(neon.length, 4);
  const section = page.locator("#master-leaderboard");
  const table = section.locator(".master-table-view");
  const header = table.locator(`thead th[data-evaluation="${businessSlug}"]`);
  const indexHeader = header.locator("xpath=preceding-sibling::th[1]");
  const search = section.locator("#master-search");
  const cards = section.locator(".master-card");
  const businessTiles = cards.locator(".master-card__metrics > div").filter({ has: page.getByText(label, { exact: true }) });
  const showBusinessColumns = () => indexHeader.evaluate(cell => {
    const table = cell.closest(".master-table-view");
    const frozenEdge = table.querySelector("thead .master-first").getBoundingClientRect().right;
    const tableEdge = table.getBoundingClientRect().left + table.clientLeft + table.clientWidth;
    table.scrollLeft += Math.max(cell.getBoundingClientRect().left - frozenEdge, cell.nextElementSibling.getBoundingClientRect().right - tableEdge);
  });

  for (const width of widths) {
    const mobile = width === 390;
    await setWidth(page, width);
    await page.goto(`${base}/?mq=Neon#master-leaderboard`);
    const rows = mobile ? cards : table.locator("tbody tr");
    await expect(rows).toHaveCount(4);
    const names = rows.locator(mobile ? ".master-card__title a" : ".master-model > a");
    const shownNames = await names.allTextContents();
    assert.deepEqual([...shownNames].sort(), neon.map(entry => entry.model).sort());
    const expectedScores = shownNames.map(name => businessScore(neon.find(entry => entry.model === name)));
    if (mobile) {
      await expect(businessTiles.locator("dd")).toHaveText(expectedScores);
      await section.scrollIntoViewIfNeeded();
      const main = page.locator(".app-main");
      await section.evaluate(element => {
        const main = element.closest(".app-main");
        main.scrollTop += element.getBoundingClientRect().top - main.getBoundingClientRect().top;
      });
      await expect(businessTiles.first()).toBeInViewport({ ratio: 1 });
      await screenshot(page, "master-neon-390-first-screen");
      const start = await section.boundingBox();
      await page.setViewportSize({ width, height: Math.ceil(start.y + start.height + 24) });
      await main.evaluate(element => {
        element.scrollTop += element.querySelector("#master-leaderboard").getBoundingClientRect().top - element.getBoundingClientRect().top;
      });
      await screenshot(page, "master-neon-business-390");
      await screenshot(page, "master-neon-390-first-card", cards.first());
      await screenshot(page, "master-neon-390-last-card", cards.last());
      await setWidth(page, width);
    } else {
      await expect(indexHeader).toHaveAttribute("data-evaluation", "aa-omniscience-index");
      const modelOffsets = () => names.evaluateAll(links => links.map(link => link.getBoundingClientRect().x));
      const before = await modelOffsets();
      const index = await header.evaluate(cell => cell.cellIndex);
      await expect(rows.locator(`td:nth-child(${index + 1}) .master-business-score`)).toHaveText(expectedScores);
      await showBusinessColumns();
      await assertFits(header.getByRole("button"), "Omniscience Business header and caption fit");
      const region = await table.boundingBox();
      const bounds = await header.boundingBox();
      assert(bounds.x + bounds.width <= region.x + region.width, "Business header fits in the scroll region");
      assert.deepEqual(await modelOffsets(), before, "The four names stay frozen during horizontal scroll");
      await screenshot(page, "master-neon-business-1440");
    }

    await search.fill([positive.model, negative.model, unscored].join(", "));
    await expect(rows).toHaveCount(3);
    const sort = mobile ? section.locator("#master-mobile-sort") : header.getByRole("button");
    if (mobile) {
      await sort.selectOption(businessSlug);
    } else {
      await sort.click();
    }
    for (const direction of ["asc", "desc"]) {
      if (direction === "desc") await (mobile ? section.getByRole("button", { name: "Asc ↑", exact: true }) : sort).click();
      await page.waitForURL(url => url.searchParams.get("ms") === businessSlug && (url.searchParams.get("md") || "asc") === direction);
      const expected = direction === "asc" ? [positive, negative] : [negative, positive];
      await expect(names).toHaveText([...expected.map(entry => entry.model), unscored]);
      if (mobile) {
        await expect(businessTiles.locator("dd").getByRole("link")).toHaveText(expected.map(businessScore));
        await expect(businessTiles.locator('dd [aria-hidden="true"]')).toHaveText("—");
        if (direction === "asc") await screenshot(page, "master-390-missing-card", cards.last());
      } else {
        const index = await header.evaluate(cell => cell.cellIndex);
        const values = rows.locator(`td:nth-child(${index + 1})`);
        await expect(values.locator(".master-business-score")).toHaveText(expected.map(businessScore));
        await expect(values.locator('[aria-hidden="true"]')).toHaveText("—");
        await showBusinessColumns();
        await screenshot(page, `master-business-sort-${direction}-1440`);
        await search.fill("");
        await expect(rows).toHaveCount(25);
        const ranks = entries.map(entry => entry.source_rank).sort((a, b) => direction === "asc" ? a - b : b - a);
        const exported = await exportRanks(section);
        assert.deepEqual(exported.slice(0, ranks.length), ranks);
        assert(exported.length > ranks.length && exported.slice(ranks.length).every(rank => rank === null));
        await search.fill([positive.model, negative.model, unscored].join(", "));
        await expect(rows).toHaveCount(3);
      }
    }
  }
  console.log("Business master: four Neon scores, frozen names, adjacent header, signed ranks and missing scores last in both directions");
}

export async function checkBusinessSuitabilityAndAbout(page, base, expect) {
  const api = url => url.pathname.startsWith("/api/suitability/");
  const writes = [];
  await page.route(api, route => {
    if (route.request().method() !== "GET") {
      writes.push(route.request().method());
      return route.fulfill({ status: 500, json: { error: "Shared writes are blocked in this check." } });
    }
    return route.fulfill({ json: route.request().url().endsWith("/layout") ? { revision: 0, categories: {} } : [] });
  });
  try {
    await setWidth(page, 390);
    await page.goto(`${base}/suitability`);
    await page.getByLabel("Task title").fill("Compare business knowledge");
    await page.getByLabel("Task description").fill("Rank these models using the Business Net Score evaluation.");
    await page.getByLabel("Search evaluations").fill(title);
    const choice = page.getByText(new RegExp(`^Net Score · ${chart.items.length} ranked rows · `));
    for (const width of widths) {
      await setWidth(page, width);
      await screenshot(page, `suitability-business-choice-${width}`, choice.locator("../.."));
    }
    await page.getByRole("checkbox", { name: new RegExp(title) }).check();
    const weight = page.locator(`#weight-${businessSlug}`);
    await expect(weight).toHaveValue("100");
    assert.equal(await page.locator('input[id^="weight-"]').count(), 1);
    const weightLabel = page.locator(`label[for="weight-${businessSlug}"]`);
    await assertFits(weightLabel, "Business weight label fits at 390px");
    await screenshot(page, "suitability-business-weight-390", weightLabel.locator(".."));
    const samples = [positive, negative, { model: unscored, provider: "OpenAI" }];
    for (const { model, provider } of samples) {
      await page.getByLabel("Search models", { exact: true }).fill(model);
      await page.getByRole("checkbox", { name: `Select ${model}, ${provider}`, exact: true }).check();
    }
    await page.getByRole("button", { name: "Save in this browser", exact: true }).click();
    await page.waitForURL(url => /^\/suitability\/[^/]+$/.test(url.pathname));
    const comparison = page.getByRole("region", { name: /Suitability results/ });
    const rows = comparison.locator("tbody tr");
    const revealColumn = async column => {
      const { left, right, frozen, edge } = await column.evaluate(cell => {
        const region = cell.closest(".table-scroll");
        const candidate = region.querySelector("thead th[rowspan='2']");
        const left = candidate.getBoundingClientRect().right;
        region.scrollLeft += cell.getBoundingClientRect().left - left;
        const bounds = cell.getBoundingClientRect();
        return { left: bounds.left, right: bounds.right, frozen: left, edge: region.getBoundingClientRect().right };
      });
      assert(left >= frozen - 1 && right <= edge + 1, `${await column.innerText()}: column ${left}–${right} must fit within ${frozen}–${edge}`);
    };
    for (const width of widths) {
      await setWidth(page, width);
      if (width === 390) await page.reload();
      await expect(rows.locator("strong")).toHaveText(samples.map(entry => entry.model));
      await expect(rows.nth(0)).toContainText("1 of 1 ranked");
      await expect(rows.nth(1)).toContainText("1 of 1 ranked");
      const scores = await rows.locator("td:nth-child(2)").allTextContents();
      assert(Number(scores[0]) > Number(scores[1]), "Positive source score ranks above negative source score");
      await expect(rows.last()).toContainText("No score");
      await expect(rows.last()).toContainText("0 of 1 ranked");
      await expect(rows.last().locator("td").last()).toHaveText("Not ranked");
      if (width === 1440) await screenshot(page, "suitability-business-ranking-1440", comparison);
      const business = comparison.getByRole("columnheader", { name: new RegExp(title) });
      await revealColumn(business);
      await assertFits(business, `Business result header fits at ${width}px`);
      await screenshot(page, `suitability-business-${width}`, comparison);
      if (width === 390) {
        await revealColumn(comparison.getByRole("columnheader", { name: /^Coverage/ }));
        await screenshot(page, "suitability-business-coverage-390", comparison);
      }
    }
    assert.deepEqual(writes, [], "The task saves to browser storage only");
  } finally {
    await page.unroute(api);
  }

  const personality = await readJson("aa-personalitybench.json");
  const date = value => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
  for (const width of widths) {
    await setWidth(page, width);
    await page.goto(`${base}/about/data`);
    const refresh = page.getByText(new RegExp(`${date(captureDate)} Artificial Analysis refresh supplies 20 evaluation leaderboards`));
    const captured = page.locator(`time[datetime="${personality.captured_at}"]`);
    await expect(refresh).toBeVisible();
    await expect(captured).toHaveText(new RegExp(date(personality.captured_at)));
    await expect(captured.locator("..")).toContainText(`capture covers ${personality.models.length} models`);
    await screenshot(page, `about-data-refresh-${width}`);
    if (width === 1440) await screenshot(page, "about-data-personality-date-1440", captured.locator(".."));
  }
  console.log("Business suitability: one 100% weight, positive above negative, missing coverage, and phone reload. About: 20 evaluations and refreshed dates");
}
