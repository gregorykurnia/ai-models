import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { evaluationTimePerTask, getModelSpeed } from "../src/lib/model-speed.ts";

// Run with node --import tsx; supply an installed Playwright module as in the master check.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:3180";
const output = "docs/screenshots/speed-columns";
const evaluations = [
  ["terminal-bench-4-0", "Time per task"],
  ["aa-briefcase-analytical-quality-elo", "Time per task"],
  ["finance-accounting", "Time per Intelligence Index task"],
];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
const errors = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  const card = page.locator(".evaluation-leaderboard");
  const table = card.locator(".table-scroll > table");
  const navigate = async (slug, query = "") => {
    await page.goto(`${base}/leaderboards/${slug}${query}`);
    await table.locator("tbody tr").first().waitFor();
  };

  for (const [slug, label] of evaluations) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    // Check complete cohorts, including the 253-row component's second page.
    for (const sort of ["time_per_task", "first_answer"]) {
      for (const direction of ["asc", "desc"]) {
        const all = [];
        for (let current = 1, pages = 1; current <= pages; current++) {
          await navigate(slug, `?sort=${sort}${direction === "desc" ? "&direction=desc" : ""}&size=250&page=${current}`);
          assert.equal(await table.locator(`th[aria-sort='${direction === "asc" ? "ascending" : "descending"}']`).count(), 1);
          const resultText = await card.locator("p[aria-live]").textContent();
          const total = Number(resultText.match(/^[\d,]+/)[0].replaceAll(",", ""));
          pages = Math.ceil(total / 250);
          const rows = await table.locator("tbody tr").evaluateAll(rows => rows.map(row => Array.from(row.cells, cell => cell.textContent.trim())));
          for (const cells of rows) {
            const record = getModelSpeed(cells[1], cells[2]);
            const seconds = sort === "time_per_task" ? evaluationTimePerTask(slug, record) : record?.first_answer_s ?? null;
            const display = seconds === null ? "—" : (seconds / (sort === "time_per_task" ? 60 : 1)).toFixed(1);
            assert.equal(cells.at(sort === "time_per_task" ? -2 : -1), display, `${slug}: ${cells[2]} ${sort}`);
            all.push(seconds);
          }
          if (current === pages) assert.equal(all.length, total);
        }
        assert(all.some(value => value !== null), `${slug} ${sort}: expected timings`);
        assert(all.some(value => value === null), `${slug} ${sort}: expected missing timings`);
        for (let i = 1; i < all.length; i++) {
          assert(all[i - 1] !== null || all[i] === null, `${slug} ${sort}: dash before a value`);
          if (all[i - 1] !== null && all[i] !== null) {
            assert(direction === "asc" ? all[i - 1] <= all[i] : all[i - 1] >= all[i], `${slug} ${sort}: incorrect raw-value order`);
          }
        }
      }
    }

    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await navigate(slug);
      const headers = table.locator("th.speed-column");
      assert.equal(await headers.count(), 2);
      assert((await headers.nth(0).textContent()).startsWith(label));
      assert((await headers.nth(1).textContent()).startsWith("First Answer"));
      await page.screenshot({ path: `${output}/${slug}-${width}-after.png` });
      await card.locator(".table-scroll").evaluate(element => { element.scrollLeft = element.scrollWidth; });
      if (width === 390) {
        await card.evaluate(element => {
          const main = element.closest(".app-main");
          main.scrollTop += element.getBoundingClientRect().top - main.getBoundingClientRect().top - 16;
        });
      }
      const boxes = await headers.evaluateAll(elements => elements.map(element => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      }));
      for (const box of boxes) assert(box.x >= 0 && box.x + box.width <= width, `${slug} ${width}: timing header clipped`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const overflow = await headers.evaluateAll(elements => elements.flatMap(header => Array.from(header.querySelectorAll("span, small, button")).filter(element => element.scrollWidth > element.clientWidth + 1).map(element => element.textContent)));
      assert.deepEqual(overflow, [], `${slug} ${width}: timing text overflow`);
      for (const header of await headers.all()) {
        assert(await header.locator("button").evaluate(element => {
          const box = element.getBoundingClientRect();
          return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
        }), `${slug} ${width}: header button is covered`);
      }
      await page.screenshot({ path: `${output}/${slug}-${width}-timings.png` });
      const x = boxes[0].x, y = boxes[0].y;
      await page.screenshot({ path: `${output}/${slug}-${width}-timings-crop.png`, clip: { x, y, width: boxes[1].x + boxes[1].width - x, height: Math.min(270, (width === 390 ? 844 : 1000) - y) } });

      // The fixed header is a DOM copy: wrapping and dates must match after scrolling.
      const scrollTop = await page.locator(".app-main").evaluate(element => element.scrollTop);
      await table.locator("thead").evaluate(element => {
        const stickyTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--table-sticky-top"));
        element.closest(".app-main").scrollTop += element.getBoundingClientRect().top - stickyTop + 80;
      });
      const sticky = page.locator(".table-sticky-header-copy");
      await sticky.waitFor({ state: "visible" });
      const copies = sticky.locator("th.speed-column");
      for (let index = 0; index < 2; index++) {
        const box = await copies.nth(index).boundingBox();
        assert(Math.abs(box.x - boxes[index].x) < 1 && Math.abs(box.width - boxes[index].width) < 1);
        assert.equal(await copies.nth(index).textContent(), await headers.nth(index).textContent());
      }
      const stickyBox = await copies.nth(0).boundingBox();
      await page.screenshot({ path: `${output}/${slug}-${width}-sticky-crop.png`, clip: { x, y: stickyBox.y, width: boxes[1].x + boxes[1].width - x, height: stickyBox.height + 130 } });
      await page.locator(".app-main").evaluate((element, top) => { element.scrollTop = top; }, scrollTop);

      // Header interactions default to fastest first, then reverse, with no sticky columns.
      const firstHeader = headers.nth(0).getByRole("button");
      await firstHeader.click();
      await page.waitForURL(/sort=time_per_task&direction=asc/);
      await headers.nth(0).getByRole("button").click();
      await page.waitForURL(/sort=time_per_task&direction=desc/);
      assert.equal(await headers.nth(0).evaluate(element => getComputedStyle(element).position), "static");
      await headers.nth(1).getByRole("button").click();
      await page.waitForURL(/sort=first_answer&direction=asc/);
      const first = await table.locator("tbody tr").first().textContent();
      const search = card.locator("#model-search");
      await search.fill("zzzz-no-such-model");
      await table.getByText("No models match these filters. Clear filters to see all entries.").waitFor();
      await search.fill("");
      await table.locator("tbody td.model").first().waitFor();
      assert.equal(await table.locator("tbody tr").first().textContent(), first);
    }
    console.log(`${slug}: full-cohort speed sorts, missing values, headers/sticky copies, search, and 1440/390px captures passed`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
console.log("Evaluation browser check passed; browser closed");
