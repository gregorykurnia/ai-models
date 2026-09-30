import assert from "node:assert/strict";
// Supply the path to an installed Playwright module; no production dependency.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||"playwright");
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage();
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(`${process.env.BASE_URL||"http://localhost:3180"}/?mq=GPT#master-leaderboard`);
  const section=page.locator("#master-leaderboard");
  await section.locator("tbody tr").first().waitFor();
  await section.getByRole("button",{name:/AutomationBench-AA/}).click();
  await page.waitForURL(/ms=automationbench-aa/);
  const link=section.locator("tbody .source-rank").first();
  const href=await link.getAttribute("href");
  await link.click();await page.waitForURL(/leaderboards/);
  assert(await page.locator("#model-search").inputValue());
  await page.goBack();await section.locator("tbody tr").first().waitFor();
  assert(page.url().includes("ms=automationbench-aa"));
  await section.locator(".table-scroll").focus();await page.keyboard.press("ArrowRight");
  assert(await section.locator(".table-scroll").evaluate(e=>e===document.activeElement));
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({source_link:href,return_state:page.url(),keyboard_navigation:true,mobile_overflow:false,errors}));
} finally {await browser.close();}
