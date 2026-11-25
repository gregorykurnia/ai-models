import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { evaluationTimePerTask, getModelSpeed } from "../src/lib/model-speed.ts";
import { checkSweAtlasEvaluation, sweAtlasSlug } from "./check-swe-atlas-qna-browser.mjs";
import { businessSlug, checkBusinessEvaluation } from "./check-omniscience-business-browser.mjs";

// Run with node --import tsx; supply an installed Playwright module as in the master check.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:3180";
const output = process.env.SPEED_SCREENSHOT_DIR || "docs/screenshots/speed-columns";
const evaluations = [
  [businessSlug],
  ["terminal-bench-4-1", "Time per task"],
  ["aa-briefcase-analytical-quality-elo", "Time per task"],
  ["finance-accounting", "Time per Intelligence Index task"],
  [sweAtlasSlug],
].filter(([slug]) => !process.env.EVALUATION_SLUG || process.env.EVALUATION_SLUG === slug);
assert(evaluations.length, `Unknown EVALUATION_SLUG: ${process.env.EVALUATION_SLUG}`);
if (evaluations.some(([, label]) => label)) await mkdir(output, { recursive: true });
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
    await (page.viewportSize().width<768?card.locator(".evaluation-card"):table.locator("tbody tr")).first().waitFor();
  };

  for (const [slug, label] of evaluations) {
    if (slug === businessSlug) {
      await checkBusinessEvaluation(page, base);
      continue;
    }
    if (slug === sweAtlasSlug) {
      await checkSweAtlasEvaluation(page, base);
      continue;
    }
    const terminalBench = slug === "terminal-bench-4-1";
    const sorts = ["time_per_task", "first_answer"];
    const costEntries = new Map();
    if (terminalBench) {
      const { entries } = JSON.parse(await readFile(new URL("../data/leaderboards.json", import.meta.url), "utf8"));
      for (const entry of entries.filter(entry => entry.evaluation_id === slug)) {
        costEntries.set(JSON.stringify([entry.provider, entry.model]), entry);
      }
      sorts.push("cost_usd");
    }
    const numericValue = (sort, provider, model) => {
      if (sort === "cost_usd") {
        const entry = costEntries.get(JSON.stringify([provider, model]));
        assert(entry, `${slug}: missing bundled entry for ${provider} / ${model}`);
        return { raw: entry.cost_usd, display: entry.cost_display ?? "—" };
      }
      const speed = getModelSpeed(provider, model);
      const raw = sort === "time_per_task" ? evaluationTimePerTask(slug, speed) : speed?.first_answer_s ?? null;
      return { raw, display: raw === null ? "—" : (raw / (sort === "time_per_task" ? 60 : 1)).toFixed(1) };
    };
    await page.setViewportSize({ width: 1440, height: 1000 });
    // Check complete cohorts, including the 253-row component's second page.
    if(process.env.CAPTURE_ONLY!=="1") for (const sort of sorts) {
      for (const direction of ["asc", "desc"]) {
        const all = [];
        for (let current = 1, pages = 1; current <= pages; current++) {
          await navigate(slug, `?sort=${sort}${direction === "desc" ? "&direction=desc" : ""}&size=250&page=${current}`);
          assert.equal(await table.locator(`th[aria-sort='${direction === "asc" ? "ascending" : "descending"}']`).count(), 1);
          const resultText = await card.locator("p[aria-live]").textContent();
          const total = Number(resultText.match(/^[\d,]+/)[0].replaceAll(",", ""));
          pages = Math.ceil(total / 250);
          const rows = await table.locator("tbody tr").evaluateAll(rows => rows.map(row => Object.fromEntries(Array.from(row.cells, cell => [cell.dataset.column,cell.textContent.trim()]))));
          for (const cells of rows) {
            const { raw, display } = numericValue(sort, cells.provider, cells.model);
            assert.equal(cells[sort], display, `${slug}: ${cells.model} ${sort}`);
            all.push(raw);
          }
          if (current === pages) assert.equal(all.length, total);
        }
        assert(all.some(value => value !== null), `${slug} ${sort}: expected values`);
        assert(all.some(value => value === null), `${slug} ${sort}: expected missing values`);
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
      // The metric eyebrow above the title was removed (2026-11-10); the title stands alone.
      assert.equal(await page.locator(".evaluation-page-header .eyebrow").count(), 0);
      assert.equal(await page.locator(".evaluation-page-header h1").count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if(width === 390) {
        const cards=card.locator(".evaluation-card");
        assert.equal(await card.locator(".evaluation-table-view").isVisible(),false);
        const first=cards.first();
        const metrics=first.locator(".master-card__metrics > div");
        await page.screenshot({path:`${output}/${slug}-${width}-after.png`});
        for(const metric of [metrics.nth(0),metrics.nth(1)]) {
          const box=await metric.boundingBox();
          assert(box.y>=56&&box.y+box.height<=844,`${slug}: first model's timings must be on the initial phone screen`);
        }
        await page.screenshot({path:`${output}/${slug}-${width}-after.png`});
        await page.screenshot({path:`${output}/${slug}-${width}-timings.png`});
        await first.screenshot({path:`${output}/${slug}-${width}-timings-crop.png`});
        for(const [index, sort] of sorts.entries()) {
          await card.locator("#evaluation-sort").selectOption(sort);
          await page.waitForURL(new RegExp(`sort=${sort}&direction=asc`));
          const values=await cards.evaluateAll((elements,index)=>elements.map(element=>({model:element.dataset.model,provider:element.dataset.provider,display:element.querySelectorAll("dd")[index].textContent.trim()})),index);
          let previous=-Infinity,missing=false;
          for(const row of values) {
            const { raw, display } = numericValue(sort, row.provider, row.model);
            assert.equal(row.display, display, `${slug}: ${row.model} ${sort}`);
            if(raw===null)missing=true;else {assert(!missing&&previous<=raw);previous=raw;}
          }
        }
        if(terminalBench) {
          await navigate(slug);
          assert.match(await cards.first().innerText(), /Kimi K3\.1 Pro[\s\S]*68\.18%[\s\S]*Cost \/ task\s+\$5\.27/);
        }
      } else {
        const headers=table.locator("th.speed-column");
        assert((await headers.nth(0).textContent()).startsWith(label));
        assert((await headers.nth(1).textContent()).startsWith("First Answer"));
        await card.getByText("More columns →",{exact:true}).waitFor({state:"visible"});
        await page.screenshot({path:`${output}/${slug}-${width}-after.png`});
        await card.locator(".table-scroll").evaluate(element=>{element.scrollLeft=element.scrollWidth;});
        const endModel=await table.locator("tbody td.model").first().boundingBox();
        const regionBox=await card.locator(".table-scroll").boundingBox();
        assert(Math.abs(endModel.x-regionBox.x-1)<2,`${slug}: model must stay pinned after scrolling`);
        if(slug==="aa-briefcase-analytical-quality-elo")await table.locator(".evaluation-interval").nth(1).screenshot({path:`${output}/${slug}-1440-ci-crop.png`});
        await card.locator(".table-scroll").evaluate(element=>{element.scrollLeft=0;});
        const boxes=await headers.evaluateAll(elements=>elements.map(element=>{const {x,y,width,height}=element.getBoundingClientRect();return {x,y,width,height};}));
        const model=await table.locator("tbody td.model").first().boundingBox();
        const region=await card.locator(".table-scroll").boundingBox();
        assert(Math.abs(model.x-region.x-1)<2,`${slug}: model must stay pinned at the left edge`);
        for(const box of boxes) {
          assert(box.x>=model.x+model.width-1&&box.x+box.width<=width,`${slug}: timing column must not overlap the model`);
          assert(box.height<=110,`${slug}: timing header is too tall`);
        }
        for(const cell of await table.locator("tbody td.model").all()) {
          assert(await cell.evaluate(element=>{const box=element.getBoundingClientRect();return element.contains(document.elementFromPoint(box.x+box.width/2,Math.min(box.y+box.height/2,innerHeight-1)))||box.y>=innerHeight;}),`${slug}: pinned model is covered`);
        }
        for(const cell of await table.locator(".evaluation-interval").all()) {
          assert.equal(await cell.evaluate(element=>element.getBoundingClientRect().height>1&&getComputedStyle(element).whiteSpace==="nowrap"),true);
        }
        const overflow=await headers.evaluateAll(elements=>elements.flatMap(header=>Array.from(header.querySelectorAll("span,small,button")).filter(element=>element.scrollWidth>element.clientWidth+1).map(element=>element.textContent)));
        assert.deepEqual(overflow,[]);
        assert(!(await headers.nth(0).textContent()).includes("AA ·"));
        if(terminalBench) {
          const first = table.locator("tbody tr").first();
          assert.equal(await first.locator('[data-column="model"]').innerText(), "Kimi K3.1 Pro");
          assert.equal(await first.locator('[data-column="score_value"]').innerText(), "68.18%");
          assert.match(await table.locator('th[data-column="cost_usd"]').innerText(), /^Cost per task/);
          assert.equal(await first.locator('[data-column="cost_usd"]').innerText(), "$5.27");
        }
        await page.screenshot({path:`${output}/${slug}-${width}-timings.png`});
        const x=boxes[0].x,y=boxes[0].y;
        await page.screenshot({path:`${output}/${slug}-${width}-timings-crop.png`,clip:{x,y,width:boxes[1].x+boxes[1].width-x,height:Math.min(270,1000-y)}});
        await table.locator("thead").evaluate(element=>{element.closest(".app-main").scrollTop+=element.getBoundingClientRect().top+80;});
        const sticky=page.locator(".table-sticky-header-copy");
        await sticky.waitFor({state:"visible"});
        const copies=sticky.locator("th.speed-column");
        const stickyBox=await copies.nth(0).boundingBox();
        await page.screenshot({path:`${output}/${slug}-${width}-sticky-crop.png`,clip:{x,y:stickyBox.y,width:boxes[1].x+boxes[1].width-x,height:stickyBox.height+130}});
        assert.equal(await copies.nth(0).textContent(),await headers.nth(0).textContent());
        await navigate(slug);
      }
      const search=card.locator("#model-search");
      await search.fill("zzzz-no-such-model");
      await card.getByText("No models match these filters. Clear filters to see all entries.",{exact:true}).filter({visible:true}).waitFor();
      await search.fill("");
      await (width===390?card.locator(".evaluation-card"):table.locator("td.model")).first().waitFor();
      if(slug==="aa-briefcase-analytical-quality-elo") {
        const links=page.locator(".metric-group-link");
        const boxes=await links.evaluateAll(elements=>elements.map(element=>{const {x,width}=element.getBoundingClientRect();return{x,width,textX:element.children[1].getBoundingClientRect().x};}));
        assert(boxes.every(box=>Math.abs(box.width-boxes[0].width)<1));
        if(width===390)assert(boxes.every(box=>Math.abs(box.textX-boxes[0].textX)<1));
        await page.locator(".metric-group").screenshot({path:`${output}/${slug}-${width}-components.png`});
      }
    }
    console.log(`${slug}: ${process.env.CAPTURE_ONLY==="1"?"layout and capture checks":"complete-cohort sort and layout checks"} passed at 1440/390px`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
console.log("Evaluation browser check passed; browser closed");
