import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
// Supply the path to an installed Playwright module; no production dependency.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||"playwright");
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage();
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(`${process.env.BASE_URL||"http://localhost:3180"}/?mq=GPT#master-leaderboard`);
  const section=page.locator("#master-leaderboard");
  await section.locator("tbody tr").first().waitFor();
  const resultText=await section.locator("p[aria-live='polite']").first().textContent();
  const resultCount=Number(resultText?.match(/^[\d,]+/)?.[0].replaceAll(",","")||0);
  const downloadPromise=page.waitForEvent("download");
  await section.getByRole("button",{name:"Export CSV"}).click();
  const download=await downloadPromise;
  const csv=await readFile(await download.path(),"utf8");
  assert.equal(csv.split(/\r?\n/).filter(Boolean).length,resultCount+1);
  assert(csv.includes("Model,Provider,Cost Per Intelligence Index Task (USD)"));
  await section.locator("#master-provider").click();
  await section.getByRole("checkbox",{name:"OpenAI",exact:true}).click();
  await page.waitForFunction(()=>new URL(location.href).searchParams.get("mp")==="OpenAI");
  const filteredText=await section.locator("p[aria-live='polite']").first().textContent();
  const filteredCount=Number(filteredText?.match(/^[\d,]+/)?.[0].replaceAll(",","")||0);
  const filteredDownloadPromise=page.waitForEvent("download");
  await section.getByRole("button",{name:"Export CSV"}).click();
  const filteredDownload=await filteredDownloadPromise;
  const filteredCsv=await readFile(await filteredDownload.path(),"utf8");
  assert.equal(filteredCsv.split(/\r?\n/).filter(Boolean).length,filteredCount+1);
  assert(filteredCsv.split(/\r?\n/).filter(Boolean).slice(1).every(row=>row.includes(",OpenAI,")));
  await section.getByRole("button",{name:/AutomationBench-AA/}).click();
  await page.waitForURL(/ms=automationbench-aa/);
  const link=section.locator("tbody .source-rank").first();
  const href=await link.getAttribute("href");
  await Promise.all([page.waitForURL(/leaderboards/),link.click()]);
  assert(await page.locator("#model-search").inputValue());
  await page.goBack();await section.locator("tbody tr").first().waitFor();
  assert(page.url().includes("ms=automationbench-aa"));
  await section.locator(".table-scroll").focus();await page.keyboard.press("ArrowRight");
  assert(await section.locator(".table-scroll").evaluate(e=>e===document.activeElement));

  // Phone pass: cards replace the table below 768px.
  const cards=section.locator(".master-card");
  assert.equal(await cards.first().isVisible(),false);
  await page.setViewportSize({width:390,height:844});
  await cards.first().waitFor();
  assert.equal(await section.locator(".master-table-view").isVisible(),false);
  assert.equal(await cards.count(),Math.min(25,filteredCount));
  await section.locator("#master-mobile-sort").selectOption("aggregate-score");
  await page.waitForURL(/ms=aggregate-score/);
  const aggregates=await cards.evaluateAll(cs=>cs.map(c=>parseFloat(c.querySelector(".master-card__metrics dd span")?.childNodes[0]?.textContent)).filter(Number.isFinite));
  assert(aggregates.length>1&&aggregates.every((value,index)=>index===0||aggregates[index-1]<=value));
  const star=cards.first().getByRole("button",{name:/^(Add|Remove) .* to favorites$/});
  await star.click();
  assert.equal(await star.getAttribute("aria-pressed"),"true");
  await star.click();
  assert.equal(await star.getAttribute("aria-pressed"),"false");
  await cards.first().locator("summary").click();
  const cardLink=cards.first().locator(".master-card__ranks .source-rank").first();
  await Promise.all([page.waitForURL(/leaderboards/),cardLink.click()]);
  await page.goBack();await cards.first().waitFor();
  const drawer=page.locator("#master-filters");
  await page.getByRole("button",{name:/^Filters/}).click();
  await drawer.waitFor({state:"visible"});
  assert.equal(await drawer.evaluate(d=>d.open),true);
  await drawer.locator("#filters-master-provider").click();
  await drawer.getByRole("checkbox",{name:"OpenAI",exact:true}).click();
  await page.waitForFunction(()=>!new URL(location.href).searchParams.has("mp"));
  await drawer.getByRole("button",{name:"Close Master filters"}).click();
  await drawer.waitFor({state:"hidden"});
  for(const width of [320,360,390]){
    await page.setViewportSize({width,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`horizontal overflow at ${width}px`);
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({source_link:href,search_csv_rows:resultCount,filter_csv_rows:filteredCount,keyboard_navigation:true,mobile_cards:true,mobile_drawer:true,mobile_overflow:false,errors}));
} finally {await browser.close();}
