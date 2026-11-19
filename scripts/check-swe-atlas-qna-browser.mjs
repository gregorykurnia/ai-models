import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export const sweAtlasSlug = "swe-atlas-qna-aa";
const title = "SWE-Atlas-QnA";
const masterLabel = "SWE-Atlas QnA";
const widths = [1440, 390];
const output = process.env.SWE_ATLAS_SCREENSHOT_DIR || "docs/screenshots/swe-atlas-qna";
const missing = ["Claude 3 Haiku", "GPT-4o mini", "GPT-5 (High)"];
const missingQuery = ["3 Haiku", "GPT-4o mini", "GPT-5 (High)"].join(", ");
const notes = "Scored inside the coding agent AA ran each model in (Claude Code, Codex, …). Ranks compare the model configurations included on this leaderboard.";

async function mappedRows() {
  const inventory = await readFile(new URL("../docs/SWE_ATLAS_QNA_CAPTURE.md", import.meta.url), "utf8");
  const mapped = [...inventory.matchAll(/^\| [^|]+ \| ([\d.]+)% \| (.+) \|$/gm)]
    .filter(([, , model]) => !/^left out\b/i.test(model))
    .map(([, score, model]) => ({ model, score: Number(score) }))
    .sort((a, b) => b.score - a.score);
  assert(mapped.length > 0, "No mapped rows found in the task 1.1 inventory");
  assert.equal(new Set(mapped.map(row => row.model.toLowerCase())).size, mapped.length, "Duplicate mapped model");
  return mapped.map(row => ({ ...row, rank: mapped.findIndex(other => other.score === row.score) + 1 }));
}

async function capture(page, name, target = page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth &&
    Array.from(document.images).every(image => !image.complete || image.naturalWidth > 0)), name + ": page overflow or broken image");
  await mkdir(output, { recursive: true });
  await page.mouse.move(0, 0);
  await target.screenshot({ path: join(output, name + ".png"), animations: "disabled" });
}

function setWidth(page, width) {
  return page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
}

async function showAll(page, end, start) {
  const { width, height } = page.viewportSize();
  const startTop = (await start?.boundingBox())?.y;
  const needed = await end.evaluate((last, firstTop) => {
    const main = last.closest(".app-main");
    if (firstTop !== undefined) return last.getBoundingClientRect().bottom - firstTop + main.getBoundingClientRect().top + 40;
    return main.scrollTop + last.getBoundingClientRect().bottom + 24;
  }, startTop);
  await page.setViewportSize({ width, height: Math.max(height, Math.ceil(needed)) });
  if (start) await start.evaluate(first => {
    const main = first.closest(".app-main");
    main.scrollTop += first.getBoundingClientRect().top - main.getBoundingClientRect().top - 16;
  });
}

async function assertTextFits(locator, label) {
  assert(await locator.evaluate(element => {
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.left >= 0 && box.right <= innerWidth + 1 &&
      element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1;
  }), label + ": text must fit");
}

async function checkEvaluationHeaders(card) {
  const cost = card.locator('th[data-column="cost_usd"] small');
  assert.match(await cost.innerText(), /^USD · AA\n\d{1,2} \w{3} \d{4}/);
  await assertTextFits(cost, "Cost header caption");
}

async function captureSharedEvaluations(page, base) {
  const query = encodeURIComponent("GPT-6.2 Astra (Max)");
  for (const slug of ["intelligence-index", "terminal-bench-4-0", "aa-briefcase-analytical-quality-elo"]) {
    for (const width of widths) {
      await setWidth(page, width);
      const url = `${base}/leaderboards/${slug}`;
      if (slug === "intelligence-index" && width === 390) {
        const group = encodeURIComponent("GPT-6.2 Astra, GPT-6.2 Sol");
        assert.equal((await page.goto(`${url}?q=${group}`))?.status(), 200);
        await page.locator('label[for="model-search"]').waitFor();
        await capture(page, "intelligence-index-390-first-screen");
      }
      assert.equal((await page.goto(`${url}?q=${query}`))?.status(), 200);
      const card = page.locator(".evaluation-leaderboard");
      const rows = card.locator(width === 390 ? ".evaluation-card" : ".evaluation-table tbody tr");
      await rows.first().waitFor();
      assert.match(await rows.first().innerText(), /GPT-6\.2 Astra \(Max\)/);
      assert.equal(await card.locator("p[aria-live]").innerText(), "1 result");
      if (width === 390) await assertTextFits(card.locator('label[for="model-search"]'), "Search models label");
      else await checkEvaluationHeaders(card);
      const details = page.locator(".evaluation-notes");
      await details.locator("summary").click();
      await assertTextFits(details.locator(".evaluation-notes__body > strong"), "Source title");
      await showAll(page, details);
      await page.locator(".app-main").evaluate(main => { main.scrollTop = 0; });
      await capture(page, `shared-${slug}-${width}`);
    }
  }
}

export async function checkSweAtlasEvaluation(page, base) {
  const expected = await mappedRows();
  const longest = expected.reduce((a, b) => a.model.length >= b.model.length ? a : b);
  for (const width of widths) {
    await setWidth(page, width);
    const url = `${base}/leaderboards/${sweAtlasSlug}?size=50`;
    assert.equal((await page.goto(base))?.status(), 200);
    const link = page.getByRole("heading", { name: title, exact: true }).getByRole("link");
    assert.equal(await link.getAttribute("href"), `/leaderboards/${sweAtlasSlug}`);
    const catalog = page.locator(".catalog");
    const linkOffsets = await catalog.locator("article .open").evaluateAll(links => links.map(link => {
      const card = link.closest("article");
      return Math.round(card.getBoundingClientRect().bottom - link.getBoundingClientRect().bottom);
    }));
    assert(linkOffsets.length > 1 && new Set(linkOffsets).size === 1, "Catalog links align with the bottom of their cards");
    const markers = catalog.locator(".metric-tag");
    assert.deepEqual((await markers.allInnerTexts()).sort(), ["AA chart · blue circle", "AA chart · green bar", "AA chart · orange diamond"]);
    await link.scrollIntoViewIfNeeded();
    await capture(page, `leaderboards-index-${width}`);
    if (width === 390) {
      const markerCard = markers.locator("xpath=..");
      await showAll(page, markerCard.last(), markerCard.first());
      await capture(page, "leaderboards-index-briefcase-390");
      await setWidth(page, width);
    }
    await Promise.all([page.waitForURL(url.split("?")[0]), link.click()]);
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
    assert.equal((await page.goto(url))?.status(), 200);
    const mobile = width === 390;
    const card = page.locator(".evaluation-leaderboard");
    const rows = card.locator(mobile ? ".evaluation-card" : ".evaluation-table tbody tr");
    await rows.first().waitFor();
    const actual = await rows.evaluateAll((elements, mobile) => elements.map(row => {
      if (mobile) {
        const rank = row.querySelector("strong").textContent.match(/^#(\d+) /);
        return [row.dataset.model, Number(rank?.[1]), row.querySelector(".evaluation-card__score").textContent.split(": ")[1]];
      }
      const cell = name => row.querySelector(`[data-column="${name}"]`).textContent.trim();
      return [cell("model"), Number(cell("source_rank").replace("#", "")), cell("score_value")];
    }), mobile);
    const compare = (a, b) => a[0].localeCompare(b[0]);
    assert.deepEqual(actual.sort(compare), expected.map(row => [row.model, row.rank, row.score.toFixed(4)]).sort(compare));
    await card.getByText(/Pass rate \(%\)/).filter({ visible: true }).first().waitFor();
    if (!mobile) {
      await checkEvaluationHeaders(card);
      assert(await card.locator('th[data-column="score_value"] button > span').evaluate(heading => {
        const range = document.createRange();
        range.selectNodeContents(heading);
        return new Set(Array.from(range.getClientRects(), rect => rect.top)).size === 1;
      }), "Pass rate and unit fit on one line");
    }
    const details = page.locator(".evaluation-notes");
    await details.locator("summary").click();
    await assertTextFits(details.getByText(notes, { exact: true }), "Both evaluation notes");
    assert.equal(await details.getByText(/source notes below/).count(), 0);
    if (mobile) {
      const row = rows.filter({ hasText: longest.model });
      await assertTextFits(row.locator("strong"), "Longest model name and rank");
      await assertTextFits(row.locator("small"), "Longest model score");
      await page.locator(".app-main").evaluate(main => { main.scrollTop = 0; });
      await capture(page, "evaluation-390-first-screen");
      await capture(page, "evaluation-390-first-row", rows.first());
      await capture(page, "evaluation-390-longest-name", row);
      await capture(page, "evaluation-390-last-row", rows.last());
      await capture(page, "evaluation-390-notes", details);
    }
    await showAll(page, details);
    await page.locator(".app-main").evaluate(main => { main.scrollTop = 0; });
    await capture(page, `evaluation-${width}`);
  }
  await captureSharedEvaluations(page, base);
  console.log(`${sweAtlasSlug}: ${expected.length} mapped rows, their ranks and scores, index link and both notes at 1440/390px`);
}

export async function checkSweAtlasMaster(page, base, expect, exportRanks) {
  const mapped = await mappedRows();
  const gpt = mapped.filter(row => row.model.startsWith("GPT-6.2 "));
  assert.equal(gpt.length, 10, "The inventory maps ten GPT-6.2 configurations");
  assert(missing.every(model => !mapped.some(row => row.model === model)), "The missing-rank samples must be unscored");
  const section = page.locator("#master-leaderboard");
  const table = section.locator(".master-table-view");
  const header = table.locator(`th[data-evaluation="${sweAtlasSlug}"]`);
  const frontier = table.locator('th[data-evaluation="frontiercode-2-0"]');
  const rows = table.locator("tbody tr");
  const search = section.locator("#master-search");
  const values = async () => {
    const index = await header.evaluate(cell => cell.cellIndex);
    return rows.evaluateAll((elements, index) => elements.map(row => {
      const cell = row.cells[index];
      return [row.querySelector(".master-model a").textContent, cell.querySelector('[aria-hidden="true"]')?.textContent ?? cell.textContent];
    }), index);
  };

  for (const width of widths) {
    await setWidth(page, width);
    await page.goto(`${base}/#master-leaderboard`);
    if (width === 390) {
      const toggle = section.getByRole("button", { name: "Table view", exact: true });
      await expect(toggle).toHaveAttribute("aria-pressed", "false");
      await search.fill("GPT-6.2 Astra");
      await expect(section.locator(".master-card")).toHaveCount(5);
      await expect(section.locator(".leaderboard-legend")).toContainText("Aggregate uses 9 of the 20 listed evaluations.");
      await expect(section.locator("#master-search-help")).toHaveText("Separate keywords with commas, e.g. sol, haiku.");
      await section.evaluate(element => {
        const main = element.closest(".app-main");
        main.scrollTop += element.getBoundingClientRect().top - main.getBoundingClientRect().top - 16;
      });
      assert((await section.locator(".master-card__title").first().boundingBox()).y < 844, "First master card is in the phone frame");
      await capture(page, "master-gpt-6-2-astra-390-first-screen");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      await page.reload();
      await expect(table).toBeVisible();
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
    }
    await search.fill("GPT-6.2");
    await expect(search).toHaveValue("GPT-6.2");
    await expect(rows).toHaveCount(10);
    await expect.poll(async () => Object.fromEntries(await values())).toEqual(Object.fromEntries(gpt.map(row => [row.model, `#${row.rank}`])));
    assert.equal(await header.evaluate(cell => cell.previousElementSibling.dataset.evaluation), "frontiercode-2-0");
    await expect(header.getByRole("button")).toContainText(masterLabel);

    const pin = width === 390 ? ".master-model" : ".master-first";
    const showHeaders = async () => {
      await frontier.evaluate((cell, pin) => {
        const region = cell.closest(".table-scroll");
        const pinned = cell.parentElement.querySelector(pin);
        region.scrollLeft += cell.getBoundingClientRect().left - pinned.getBoundingClientRect().right - 1;
      }, pin);
      await assertTextFits(frontier.getByRole("button"), "FrontierCode 2.0 header");
      await assertTextFits(header.getByRole("button"), masterLabel + " header");
      for (const button of [frontier.getByRole("button"), header.getByRole("button")]) {
        const clipped = await button.evaluate((element, pin) => {
          const region = element.closest(".table-scroll").getBoundingClientRect();
          const pinned = element.closest("tr").querySelector(pin).getBoundingClientRect();
          const box = element.getBoundingClientRect();
          const range = document.createRange();
          const text = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          const left = Math.max(box.left, pinned.right), right = Math.min(box.right, region.right);
          const clipped = [];
          for (let node = text.nextNode(); node; node = text.nextNode()) {
            if (!node.textContent.trim()) continue;
            range.selectNodeContents(node);
            for (const rect of range.getClientRects()) {
              if (rect.left < left - 1 || rect.right > right + 1) clipped.push({ text: node.textContent, start: rect.left - left, end: right - rect.right });
            }
          }
          return clipped;
        }, pin);
        assert.deepEqual(clipped, [], `${width}px: header text must clear the pinned columns and table edge`);
      }
      assert(await rows.first().locator(".master-model").evaluate(cell => {
        const box = cell.getBoundingClientRect();
        const region = cell.closest(".table-scroll").getBoundingClientRect();
        return Math.abs(box.left - region.left - 1) < 2 &&
          cell.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
      }), `${width}px: pinned model column stays visible over the scrolling columns`);
    };
    await showAll(page, rows.last(), section);
    await showHeaders();
    await capture(page, `master-${width}-gpt-6-2`);

    await search.fill(`GPT-6.2, ${missingQuery}`);
    await expect(rows).toHaveCount(13);
    const sort = header.getByRole("button");
    for (const direction of ["ascending", "descending"]) {
      await sort.click();
      await expect(header).toHaveAttribute("aria-sort", direction);
      const ranked = gpt.map(row => row.rank).sort((a, b) => direction === "ascending" ? a - b : b - a);
      await expect.poll(async () => (await values()).map(([, rank]) => rank)).toEqual([...ranked.map(rank => `#${rank}`), "—", "—", "—"]);
      assert.deepEqual((await values()).slice(-3).map(([model]) => model).sort(), [...missing].sort());
      if (width === 1440) {
        await search.fill("");
        await expect(rows).toHaveCount(25);
        const exported = await exportRanks(section);
        const orderedRanks = mapped.map(row => row.rank).sort((a, b) => direction === "ascending" ? a - b : b - a);
        assert.deepEqual(exported.slice(0, mapped.length), orderedRanks, "Exported sort agrees with every scored row");
        assert(exported.length > orderedRanks.length && exported.slice(mapped.length).every(rank => rank === null), "All unscored CSV rows sort last");
        await search.fill(`GPT-6.2, ${missingQuery}`);
        await expect(rows).toHaveCount(13);
      }
    }
    await search.fill(missingQuery);
    await expect(rows).toHaveCount(3);
    await setWidth(page, width);
    await showAll(page, rows.last(), section);
    await showHeaders();
    const status = rows.first().locator("td").nth(await header.evaluate(cell => cell.cellIndex));
    assert.match(await status.ariaSnapshot(), /Not ranked/);
    assert.doesNotMatch(await status.ariaSnapshot(), /—/);
    await capture(page, `master-${width}-missing`);
    if (width === 390) {
      await page.setViewportSize({ width: 320, height: 844 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Phone table stays inside a 320px screen");
      await setWidth(page, width);
      await section.getByRole("button", { name: "Table view", exact: true }).click();
      await expect(table).toBeHidden();
      const cards = section.locator(".master-card");
      await expect(cards).toHaveCount(3);
      await expect(cards.locator('.master-card__sorted [aria-hidden="true"]')).toHaveText(["—", "—", "—"]);
      await cards.first().locator("summary").click();
      const expandedRank = cards.first().locator(".master-card__ranks").getByText(masterLabel, { exact: true }).locator("..");
      await expect(expandedRank.locator('[aria-hidden="true"]')).toHaveText("—");
    }
  }
  console.log(`${masterLabel}: ten GPT-6.2 ranks, three accessible dashes and missing ranks last in both directions at 1440/390px`);
}

export async function checkSweAtlasSuitabilityAndAbout(page, base, expect) {
  for (const width of widths) {
    await setWidth(page, width);
    assert.equal((await page.goto(`${base}/about/data`))?.status(), 200);
    const count = page.getByText(/supplies 20 evaluation leaderboards/);
    await expect(count).toBeVisible();
    await assertTextFits(count, "Evaluation count");
    await capture(page, `about-data-${width}`);
  }

  const writes = [];
  const emptyLayout = { revision: 0, categories: {} };
  await page.route(url => url.pathname.startsWith("/api/suitability/"), route => {
    if (route.request().method() !== "GET") {
      writes.push(route.request().method());
      return route.fulfill({ status: 500, json: { error: "Shared writes are blocked in this check." } });
    }
    return route.fulfill({ json: route.request().url().endsWith("/layout") ? emptyLayout : [] });
  });
  await setWidth(page, 1440);
  await page.goto(`${base}/suitability`);
  await page.getByLabel("Task title").fill("Answer a question about an existing codebase");
  await page.getByLabel("Task description").fill("Trace a code path and explain its behavior.");
  await page.getByLabel("Search evaluations").fill(title);
  await page.getByRole("checkbox", { name: /SWE-Atlas-QnA/ }).check();
  await expect(page.locator(`#weight-${sweAtlasSlug}`)).toHaveValue("100");
  assert.equal(await page.locator('input[id^="weight-"]').count(), 1);
  const scored = ["GPT-6.2 Astra (Max)", "GPT-6.2 Sol (Low)"];
  for (const model of [...scored, ...missing]) {
    await page.getByLabel("Search models", { exact: true }).fill(model);
    await page.getByRole("checkbox", { name: `Select ${model}, ${model.startsWith("Claude") ? "Anthropic" : "OpenAI"}`, exact: true }).check();
  }
  await page.getByRole("button", { name: "Save in this browser", exact: true }).click();
  await page.waitForURL(url => /^\/suitability\/[^/]+$/.test(url.pathname));
  const comparison = page.getByRole("region", { name: /Suitability results/ });
  const rows = comparison.locator("tbody tr");
  await expect(rows).toHaveCount(5);
  for (const [index, model] of scored.entries()) {
    const row = rows.nth(index);
    await expect(row.locator("strong")).toHaveText(model);
    await expect(row.locator("td").nth(1)).toHaveText(/^\d+\.\d$/);
    await expect(row).toContainText("1 of 1 ranked");
    await expect(row.locator("td").last()).toHaveText(/^#\d+$/);
  }
  for (const model of missing) {
    const row = rows.filter({ has: page.getByText(model, { exact: true }) });
    await expect(row).toContainText("No score");
    await expect(row).toContainText("0 of 1 ranked");
    await expect(row.locator("td").last()).toHaveText("Not ranked");
  }
  for (const width of widths) {
    await setWidth(page, width);
    if (width === 390) {
      await page.reload();
      await expect(rows).toHaveCount(5);
      await expect(rows.last()).toContainText("No score");
    }
    await showAll(page, rows.last(), comparison);
    await capture(page, `suitability-${width}`, comparison);
    if (width === 390) {
      await comparison.getByRole("columnheader", { name: /^Coverage/ }).evaluate(cell => {
        const region = cell.closest(".table-scroll");
        region.scrollLeft += cell.getBoundingClientRect().right - region.getBoundingClientRect().right + 1;
      });
      await capture(page, "suitability-390-coverage", comparison);
    }
  }
  assert.deepEqual(writes, [], "Suitability check uses browser storage only");
  console.log("Suitability: one 100% weight, two ranked models and three with missing coverage, including after reload. Data notes: 20 leaderboards.");
}
