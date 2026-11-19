import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { checkSweAtlasMaster, checkSweAtlasSuitabilityAndAbout } from "./check-swe-atlas-qna-browser.mjs";

function csvRows(csv){
  const rows=[];let row=[],cell="",quoted=false;
  for(let i=0;i<csv.length;i++){
    const char=csv[i];
    if(char==='"'){
      if(quoted&&csv[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;
    }else if(!quoted&&(char===","||char==="\n")){
      row.push(cell.replace(/^\uFEFF/,""));cell="";
      if(char==="\n"){rows.push(row);row=[];}
    }else if(char!=="\r"||quoted)cell+=char;
  }
  if(cell||row.length){row.push(cell);rows.push(row);}
  return rows;
}

async function exportCsv(page,section){
  const pending=page.waitForEvent("download");
  await section.getByRole("button",{name:"Export CSV",exact:true}).click();
  return readFile(await (await pending).path(),"utf8");
}

function assertFastestFirst(values,label){
  const known=values.filter(value=>value!==null);
  assert(new Set(known).size>1,`${label}: exercise different speeds`);
  assert(known.every(value=>Number.isFinite(value)&&value>=0),`${label}: valid numeric speeds`);
  assert.deepEqual(values,[...known].sort((a,b)=>a-b).concat(values.filter(value=>value===null)),`${label}: fastest first, missing last`);
}

const speedColumns=[
  {key:"time-per-task",selector:".master-time",label:"Time per Task",unit:"Minutes",csvColumn:3,mobileLabel:"Time / task"},
  {key:"first-answer",selector:".master-first",label:"First Answer",unit:"Seconds",csvColumn:4,mobileLabel:"First answer"},
];
const speedCsvHeaders=["Model","Provider","Cost Per Intelligence Index Task (USD)","Time per Task (minutes)","First Answer (seconds)"];
// Supply the path to an installed Playwright module; no production dependency.
const playwrightModule=process.env.PLAYWRIGHT_MODULE||"playwright";
const {chromium}=await import(playwrightModule);
const {expect}=createRequire(import.meta.resolve(playwrightModule))("playwright/test");
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
try {
  const page=await browser.newPage();
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  const baseUrl=process.env.BASE_URL||"http://localhost:3180";
  await page.setViewportSize({width:1440,height:900});
  await page.goto(`${baseUrl}/#master-leaderboard`);
  const section=page.locator("#master-leaderboard");
  const desktopTable=section.locator(".master-table-view > table");
  const desktopRows=desktopTable.locator("tbody tr");
  const resultSummary=section.locator("p[aria-live='polite']").first();
  await desktopRows.first().waitFor();
  const speedResults={};
  for(const column of speedColumns){
    const header=desktopTable.locator(`thead th${column.selector}`);
    assert.equal(await header.count(),1,`${column.label}: master header`);
    // Unit and capture date sit on their own lines, with no dangling separator (R1).
    assert.match(await header.locator("small").innerText(),new RegExp(`^${column.unit} · AA\\n\\d{1,2} \\w{3} \\d{4}$`));
    // The sort arrow stays on the label's last line instead of wrapping alone.
    assert.match(await header.locator("button").innerText(),/\S\u00a0[↕↑↓]/);
    await header.getByRole("button",{name:new RegExp(`^${column.label}`)}).click();
    await page.waitForFunction(key=>new URL(location.href).searchParams.get("ms")===key,column.key);
    await expect(header,`${column.label}: first click sorts ascending`).toHaveAttribute("aria-sort","ascending");
    await expect(section.locator(".master-sort-summary")).toHaveText(new RegExp(`Sorted by ${column.label}.* ↑$`,"i"));
    const [headers,...rows]=csvRows(await exportCsv(page,section));
    assert.deepEqual(headers.slice(0,5),speedCsvHeaders);
    const values=rows.map(row=>row[column.csvColumn]===""?null:Number(row[column.csvColumn]));
    assertFastestFirst(values,column.label);
    assert(values.includes(null),`${column.label}: exercise missing speeds`);
    const expected=rows.slice(0,25).map(row=>[
      row[0],row[column.csvColumn]===""?"—":Number(row[column.csvColumn]).toFixed(1),
    ]);
    await expect.poll(()=>desktopRows.evaluateAll((trs,selector)=>trs.map(tr=>[
      tr.querySelector(".master-model a")?.textContent,tr.querySelector(selector)?.textContent,
    ]),column.selector),{message:`${column.label}: first page agrees with sorted CSV`}).toEqual(expected);
    speedResults[column.key]={rows:rows.length,missing:values.filter(value=>value===null).length};
  }

  // One evaluation page must expose both populated speed columns, with units.
  const evaluationResponse=await page.goto(`${baseUrl}/leaderboards/terminal-bench-4-0`);
  assert.equal(evaluationResponse?.status(),200,"Terminal-Bench evaluation loads");
  const evaluationTable=page.locator(".table-scroll > .evaluation-table");
  await evaluationTable.locator("tbody tr").first().waitFor();
  for(const [key,label,unit] of [["time_per_task","Time per task","Minutes"],["first_answer","First Answer","Seconds"]]){
    const header=evaluationTable.getByRole("columnheader").filter({has:page.getByRole("button",{name:new RegExp(`^${label}\\s`)})});
    assert.equal(await header.count(),1,`${label}: evaluation header`);
    assert.match(await header.locator("small").innerText(),new RegExp(`${unit} · AA`));
    const cells=await evaluationTable.locator(`tbody td[data-column="${key}"]`).allTextContents();
    assert.equal(cells.length,await evaluationTable.locator("tbody tr").count());
    assert(cells.some(value=>/^\d+\.\d$/.test(value)),`${label}: evaluation has speed values`);
    assert(cells.every(value=>value==="—"||/^\d+\.\d$/.test(value)),`${label}: formatted evaluation values`);
  }

  await page.goto(`${baseUrl}/?mq=GPT#master-leaderboard`);
  await desktopRows.first().waitFor();
  const resultText=await resultSummary.textContent();
  const resultCount=Number(resultText?.match(/^[\d,]+/)?.[0].replaceAll(",","")||0);
  const downloadPromise=page.waitForEvent("download");
  await section.getByRole("button",{name:"Export CSV"}).click();
  const download=await downloadPromise;
  const csv=await readFile(await download.path(),"utf8");
  assert.equal(csv.split(/\r?\n/).filter(Boolean).length,resultCount+1);
  assert.deepEqual(csvRows(csv)[0].slice(0,5),speedCsvHeaders);
  await section.locator("#master-provider").click();
  await section.getByRole("checkbox",{name:"OpenAI",exact:true}).click();
  await page.waitForFunction(()=>new URL(location.href).searchParams.get("mp")==="OpenAI");
  await expect(resultSummary).toContainText("· OpenAI ·");
  const filteredText=await resultSummary.textContent();
  const filteredCount=Number(filteredText?.match(/^[\d,]+/)?.[0].replaceAll(",","")||0);
  const filteredDownloadPromise=page.waitForEvent("download");
  await section.getByRole("button",{name:"Export CSV"}).click();
  const filteredDownload=await filteredDownloadPromise;
  const filteredCsv=await readFile(await filteredDownload.path(),"utf8");
  assert.equal(filteredCsv.split(/\r?\n/).filter(Boolean).length,filteredCount+1);
  assert(filteredCsv.split(/\r?\n/).filter(Boolean).slice(1).every(row=>row.includes(",OpenAI,")));
  const automationSort=desktopTable.getByRole("button",{name:/AutomationBench-AA/});
  await automationSort.click();
  await page.waitForURL(/ms=automationbench-aa/);
  await expect(automationSort.locator("..")).toHaveAttribute("aria-sort","ascending");
  const link=desktopRows.locator(".source-rank").first();
  const href=await link.getAttribute("href");
  await Promise.all([page.waitForURL(/leaderboards/),link.click()]);
  assert(await page.locator("#model-search").inputValue());
  await page.goBack();await desktopRows.first().waitFor();
  assert(page.url().includes("ms=automationbench-aa"));
  const region=section.locator(".master-table-view");
  await region.evaluate(element=>{element.scrollLeft=0;});
  await region.focus();
  const scrollStart=await region.evaluate(element=>element.scrollLeft);
  await page.keyboard.press("ArrowRight");
  await expect(region).toBeFocused();
  await expect.poll(()=>region.evaluate(element=>element.scrollLeft),{message:"ArrowRight scrolls the master table"}).toBeGreaterThan(scrollStart);

  // Phone pass: cards replace the table below 768px.
  const cards=section.locator(".master-card");
  assert.equal(await cards.first().isVisible(),false);
  await page.setViewportSize({width:390,height:844});
  await cards.first().waitFor();
  assert.equal(await section.locator(".master-table-view").isVisible(),false);
  assert.equal(await cards.count(),Math.min(25,filteredCount));
  for(const column of speedColumns){
    await section.locator("#master-mobile-sort").selectOption(column.key);
    await page.waitForFunction(key=>new URL(location.href).searchParams.get("ms")===key,column.key);
    await expect(async()=>{
      const values=await cards.evaluateAll((cs,label)=>cs.map(card=>{
        const metric=[...card.querySelectorAll("dt")].find(dt=>dt.textContent===label);
        return metric?.nextElementSibling?.textContent;
      }),column.mobileLabel);
      assert(values.every(value=>value==="—"||/^\d+\.\d (min|s)$/.test(value)),`${column.label}: phone card metric`);
      assertFastestFirst(values.map(value=>value==="—"?null:parseFloat(value)),`${column.label}: phone sort`);
    }).toPass({timeout:5000});
  }
  await section.locator("#master-mobile-sort").selectOption("aggregate-score");
  await page.waitForURL(/ms=aggregate-score/);
  await expect(async()=>{
    const aggregates=await cards.evaluateAll(cs=>cs.map(c=>parseFloat(c.querySelector(".master-card__metrics dd span")?.childNodes[0]?.textContent)).filter(Number.isFinite));
    assert(aggregates.length>1&&aggregates.every((value,index)=>index===0||aggregates[index-1]<=value));
  }).toPass({timeout:5000});
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
  // Only .app-main scrolls: a taller page lets the top bar scroll away and the pinned table header float below a gap (R1).
  for(const width of [390,768,1024,1440]){
    await page.setViewportSize({width,height:900});
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight+1),false,`page scrolls vertically at ${width}px`);
  }
  for(const [set,output] of [
    ["hydrogen",process.env.NEW_MODELS_SCREENSHOT_DIR],
    ["gpt-6.2",process.env.GPT_6_2_SCREENSHOT_DIR],
    ["neon",process.env.NEON_SCREENSHOT_DIR],
  ]){
    if(output){
      const {checkNewModelsBrowser}=await import("./check-new-models-browser.mjs");
      await checkNewModelsBrowser(page,baseUrl,output,set);
    }
  }
  await checkSweAtlasMaster(page,baseUrl,expect,async section=>{
    const [headers,...rows]=csvRows(await exportCsv(page,section));
    const column=headers.indexOf("SWE-Atlas QnA");
    assert(column>0,"SWE-Atlas QnA CSV column exists");
    return rows.map(row=>row[column]===""?null:Number(row[column]));
  });
  await checkSweAtlasSuitabilityAndAbout(page,baseUrl,expect);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({speed_columns:speedResults,evaluation_speed_columns:true,source_link:href,search_csv_rows:resultCount,filter_csv_rows:filteredCount,keyboard_navigation:true,mobile_cards:true,mobile_speed_sorting:true,mobile_drawer:true,mobile_overflow:false,errors}));
} finally {await browser.close();}
