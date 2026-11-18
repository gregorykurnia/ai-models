import assert from "node:assert/strict";
import {mkdir,readFile,rm,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {mergeBriefcaseComponents} from "../src/lib/aa-briefcase.ts";
import {mergeBriefcaseRubricRefresh} from "../src/lib/aa-briefcase-rubric-refresh.ts";
import {mergeAaModelProfileOverlays} from "../src/lib/aa-model-profile-overlays.ts";
import {evaluationScoreDisplay} from "../src/lib/evaluation-display.ts";
import {getIntelligenceIndexTaskCost} from "../src/lib/intelligence-index-costs.ts";
import {evaluationTimePerTask,getModelSpeed,formatTimePerTask,formatFirstAnswer} from "../src/lib/model-speed.ts";

export const newModelNames=[
  ...["Xhigh","High","Medium","Low"].map(effort=>`Gemini 4 Hydrogen (${effort})`),
  "Gemini 4 Argon (Medium)","Qwen4 Max",
];
const allModelNames=[...newModelNames,"Gemini 4 Argon (High)"];
const gptModelNames=["Astra","Sol"].flatMap(family=>
  ["Low","Medium","High","Xhigh","Max"].map(effort=>`GPT-6.2 ${family} (${effort})`),
);
const modelSets={
  hydrogen:{
    audit:"GEMINI_4_HYDROGEN_QWEN4_COVERAGE.md",
    names:newModelNames,
    allNames:allModelNames,
    pattern:/hydrogen|argon|qwen\s?4/i,
    provider:name=>name.startsWith("Qwen")?"Alibaba":"Google",
    groups:[["Hydrogen","hydrogen",4],["Argon","argon",2],["Qwen4","qwen4",1]],
    screenshots:["intelligence-index","terminal-bench-4-0","aa-briefcase-analytical-quality-elo","critpt"],
  },
  "gpt-6.2":{
    audit:"GPT_6_2_ASTRA_SOL_COVERAGE.md",
    names:gptModelNames,
    allNames:gptModelNames,
    pattern:/gpt-6\.2/i,
    provider:()=>"OpenAI",
    groups:[["GPT-6.2 Astra","gpt-6-2-astra",5],["GPT-6.2 Sol","gpt-6-2-sol",5]],
    screenshots:["intelligence-index","terminal-bench-4-0"],
  },
};

function modelSet(name){
  assert(Object.hasOwn(modelSets,name),`Unknown browser model set: ${name}`);
  return modelSets[name];
}
const readJson=async file=>JSON.parse(await readFile(new URL(`../data/${file}`,import.meta.url),"utf8"));

export async function readNewModelsDataset(){
  const [base,components,overlays,rubric]=await Promise.all([
    "leaderboards.json","aa-briefcase-components.json","aa-model-profile-overlays.json","aa-briefcase-rubric-refresh.json",
  ].map(readJson));
  return mergeBriefcaseRubricRefresh(mergeAaModelProfileOverlays(mergeBriefcaseComponents(base,components),overlays),rubric);
}

// Fail before opening a browser if a missing/duplicate/spelling variant or a stale
// coverage audit would otherwise make this pass silently check fewer models.
/** @param {import("../src/lib/contract").Dataset} dataset @param {string} coverage */
export function newModelsExpectations(dataset,coverage,setName="hydrogen"){
  const set=modelSet(setName);
  const familyEntries=dataset.entries.filter(entry=>set.pattern.test(entry.model));
  const canonicalNames=[...set.allNames].sort();
  assert.deepEqual([...new Set(familyEntries.map(entry=>entry.model))].sort(),canonicalNames,`${setName}: exact canonical family variants`);
  // The audit predates the 2026-11-16 retirement of these four evaluations; their rows no longer have data to check.
  const retired=setName==="hydrogen"?["gdpval-aa-v2-1","scicode","hle-diamond","aa-lcr-v1-1"]:[];
  const auditRows=coverage.split("\n").filter(line=>/^\|[^|]+\| `[^`]+` \| `[^`]+` \|/.test(line)&&!retired.some(id=>line.includes(`| \`${id}\` |`)));
  assert.equal(auditRows.length,dataset.evaluations.length,"audit covers every bundled evaluation");
  const evaluations=dataset.evaluations.map(evaluation=>{
    const entries=familyEntries.filter(entry=>entry.evaluation_id===evaluation.id).sort((a,b)=>a.source_rank-b.source_rank||a.source_row-b.source_row);
    for(const name of set.allNames){
      const matches=entries.filter(entry=>entry.model===name);
      assert(matches.length<=1,`${evaluation.id}: duplicate ${name}`);
      if(matches.length)assert.equal(matches[0].provider,set.provider(name),`${evaluation.id}: ${name} provider`);
    }
    const audit=auditRows.find(line=>line.includes(`| \`${evaluation.id}\` |`));
    assert(audit,`${evaluation.id}: coverage audit row exists`);
    const cells=audit.split("|").slice(5,-1).map(cell=>cell.trim());
    assert.equal(cells.length,set.names.length,`${evaluation.id}: one coverage cell per audited name`);
    set.names.forEach((name,index)=>{
      const entry=entries.find(entry=>entry.model===name),cell=cells[index];
      if(!entry)assert.match(cell,/^not on AA \(captured \d{4}-\d{2}-\d{2}\)$/,`${evaluation.id}: ${name} absence agrees with audit`);
      else assert.equal(cell,`${Number(entry.score_value.toPrecision(10))} (#${entry.source_rank})`,`${evaluation.id}: ${name} score and rank agree with audit`);
    });
    return {evaluation,entries};
  });
  const index=evaluations.find(({evaluation})=>evaluation.id==="intelligence-index");
  assert(index,"bundled Intelligence Index exists");
  assert.deepEqual(index.entries.map(entry=>entry.model).sort(),canonicalNames,"all canonical configurations in the bundled index");
  return {expected:index.entries,evaluations:setName==="hydrogen"?evaluations.filter(({entries})=>entries.length):evaluations};
}

// Optional focused pass for check-master-browser.mjs (node --import tsx).
// Reads the same merged bundled snapshots as src/lib/data.ts; never Firestore.
export async function checkNewModelsBrowser(page,baseUrl,output,setName="hydrogen"){
  const {audit:auditFile,groups,screenshots}=modelSet(setName);
  const gpt=setName==="gpt-6.2";
  await mkdir(output,{recursive:true});
  await rm(join(output,"browser-check.json"),{force:true});
  const dataset=await readNewModelsDataset();
  const coverage=await readFile(new URL(`../docs/${auditFile}`,import.meta.url),"utf8");
  const {expected,evaluations}=newModelsExpectations(dataset,coverage,setName);
  const screenshotEvaluations=new Set(screenshots);
  const sharedScreens=new Set(gpt?["critpt-v2-full","frontiercode-2-0","mmmu-pro"]:[]);
  const scores=new Map();
  const consoleErrors=[];
  const pageErrors=[];
  const onConsole=message=>{if(message.type()==="error")consoleErrors.push(message.text());};
  const onPageError=error=>pageErrors.push(error.message);
  page.on("console",onConsole);
  page.on("pageerror",onPageError);
  const report={set:setName,master:{},evaluations:{},screenshots:[]};

  async function audit(label,selector){
    const faults=await page.evaluate(selector=>{
      const faults=[];
      if(document.documentElement.scrollWidth>innerWidth)faults.push("horizontal page overflow");
      const root=document.querySelector(selector);
      for(const element of root.querySelectorAll('a,button,strong,dt,dd,.evaluation-card__score,[data-column="model"]')){
        const box=element.getBoundingClientRect();
        if(!box.width||!box.height)continue;
        if(element.scrollWidth>element.clientWidth+1)faults.push(`text overflow: ${element.textContent}`);
        if(innerWidth<768&&(box.left<0||box.right>innerWidth+1))faults.push(`outside phone: ${element.textContent}`);
        if(element.matches("button")&&box.top>=0&&box.bottom<=innerHeight&&box.left>=0&&box.right<=innerWidth){
          const front=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
          if(front&&!element.contains(front))faults.push(`covered button: ${element.textContent}`);
        }
      }
      return faults;
    },selector);
    assert.deepEqual(faults,[],label);
  }

  async function screenshot(name){
    const {width}=page.viewportSize();
    if(width===1440){
      const end=page.locator("#master-leaderboard, .evaluation-notes");
      const box=await end.count()?await end.boundingBox():null;
      if(box)await page.setViewportSize({width,height:Math.ceil(box.y+box.height+24)});
      const footer=await page.locator(".app-rail__footer").boundingBox();
      assert(footer&&footer.y+footer.height<=page.viewportSize().height,"whole desktop sidebar footer is in frame");
    }
    await page.screenshot({path:join(output,name),animations:"disabled"});
    report.screenshots.push(name);
  }

  async function checkScrollCue(section){
    const region=section.locator(".table-scroll");
    const cue=section.locator(".table-overflow-cue--more");
    const earlier=section.locator(".table-overflow-cue--earlier");
    await cue.waitFor({state:"visible"});
    assert.equal(await earlier.count(),0,"no earlier columns at the left edge");
    assert.equal(await cue.innerText(),"More columns →","scroll continuation is a readable caption");
    const cueBox=await cue.boundingBox(),regionBox=await region.boundingBox();
    assert(cueBox.y+cueBox.height<=regionBox.y,"scroll caption is above the table, clear of headers and rows");
    assert(await cue.evaluate(element=>parseFloat(getComputedStyle(element).fontSize)>=12),"scroll caption uses at least the existing caption text size");
    await region.evaluate(element=>{element.scrollLeft=element.scrollWidth;});
    await cue.waitFor({state:"hidden"});
    await earlier.waitFor({state:"visible"});
    assert.equal(await earlier.innerText(),"← Earlier columns");
    await region.evaluate(element=>{element.scrollLeft=0;});
    await cue.waitFor({state:"visible"});
    await earlier.waitFor({state:"hidden"});
  }

  // Keep the 390x844 first screen, then use a taller 390px capture to show every
  // card in one image without hiding, rearranging, or shrinking its content.
  async function phoneScreenshots(stem,section,firstScreen=false){
    await section.scrollIntoViewIfNeeded();
    const align=()=>section.evaluate(element=>{element.closest(".app-main").scrollTop+=element.getBoundingClientRect().top-72;});
    await align();
    if(firstScreen)await screenshot(`${stem}-first-screen.png`);
    const height=firstScreen
      ?await section.evaluate(element=>Math.ceil(element.getBoundingClientRect().height+120))
      :await page.locator(".app-main").evaluate(element=>Math.ceil(element.scrollHeight+100));
    await page.setViewportSize({width:390,height:Math.max(844,height)});
    if(firstScreen)await align();
    else await page.locator(".app-main").evaluate(element=>{element.scrollTop=0;});
    const box=await section.boundingBox();
    const notes=page.locator(".evaluation-notes");
    const bottom=firstScreen?box.y+box.height:(await notes.boundingBox()).y+(await notes.boundingBox()).height;
    await page.screenshot({path:join(output,`${stem}.png`),animations:"disabled",clip:{x:0,y:0,width:390,height:Math.ceil(bottom+16)}});
    report.screenshots.push(`${stem}.png`);
    if(stem==="master-hydrogen-390"){
      for(const [label,card] of [["first",section.locator(".master-card").first()],["last",section.locator(".master-card").last()]]){
        const box=await card.boundingBox(),name=`master-hydrogen-${label}-card-crop.png`;
        await page.screenshot({path:join(output,name),clip:{x:box.x-8,y:box.y-8,width:box.width+16,height:box.height+16}});
        report.screenshots.push(name);
      }
    }
  }

  for(const width of [1440,390])for(const [query,slug,count] of groups){
    await page.setViewportSize({width,height:width===390?844:1300});
    await page.goto(`${baseUrl}/?mq=${encodeURIComponent(query)}#master-leaderboard`);
    const section=page.locator("#master-leaderboard");
    const rows=section.locator(width===390?".master-card":"tbody tr");
    await rows.first().waitFor();
    assert.equal(await section.locator(".leaderboard-legend").innerText(),`— and “Not ranked” mean no captured AA value. Aggregate uses 9 of ${dataset.evaluations.length} evaluations.`);
    assert.equal(await section.locator("#master-search").inputValue(),query);
    assert.equal(await rows.count(),count,`${query}: ${width}px count`);
    assert.match(await section.locator('p[aria-live="polite"]').first().innerText(),new RegExp(`^${count} model${count===1?"":"s"}(?: ·|$)`),`${query}: result-count wording`);
    const names=await rows.locator(width===390?".master-card__title a":".master-model > a").allTextContents();
    assert.deepEqual([...names].sort(),expected.filter(entry=>entry.model.includes(query)).map(entry=>entry.model).sort());
    for(let index=0;index<count;index++){
      const score=await rows.nth(index).locator(width===390?".master-card__metrics dd span":".master-aggregate > span").first().getAttribute("aria-label");
      assert.match(score,/^\d+\.\d average rank based on \d of 9 dimensions$/);
      if(width===1440)scores.set(names[index],score);
      else assert.equal(score,scores.get(names[index]),`${names[index]}: phone aggregate agrees with desktop`);
    }
    if(width===1440){
      assert.equal((await section.locator(".master-sort-summary").innerText()).trim(),"· Sorted by Intelligence Index rank ↑");
      const layout=await section.locator("tbody .master-model").evaluateAll(cells=>cells.map(cell=>{
        const link=cell.querySelector("a"),star=cell.querySelector("button");
        const box=cell.getBoundingClientRect(),text=link.getBoundingClientRect(),favorite=star.getBoundingClientRect();
        return {sticky:getComputedStyle(cell).position==="sticky",contained:text.left>=box.left&&text.right<=box.right&&text.top>=box.top&&text.bottom<=box.bottom,
          separate:text.left>=favorite.right,wrapped:text.height>parseFloat(getComputedStyle(link).lineHeight)*1.5,left:box.left};
      }));
      assert(layout.every(item=>item.sticky&&item.contained&&item.separate),`${query}: frozen names and stars do not overlap`);
      if(slug==="hydrogen")assert(layout.every(item=>item.wrapped),"all long Hydrogen names wrap");
      const rankDates=await section.locator("thead small").allTextContents();
      assert.equal(rankDates.filter(text=>text.startsWith("Rank ·")).length,dataset.evaluations.length,"all rank headers have capture dates");
      assert(rankDates.filter(text=>text.startsWith("Rank ·")).every(text=>/^Rank · \d{1,2} [A-Z][a-z]{2} \d{4}$/.test(text)),"rank dates use the same readable format as cost and timing dates");
      await section.scrollIntoViewIfNeeded();
      assert.match(await section.locator(".master-cost small").first().innerText(),/^USD · AA\n\d{1,2} \w{3} \d{4}$/);
      const aligned=await section.locator("tbody tr").evaluateAll(rows=>rows.every(row=>{
        const number=element=>{const text=[...element.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());const range=document.createRange();range.selectNodeContents(text);return range.getBoundingClientRect().y;};
        const aggregate=row.querySelector(".master-aggregate > span");
        const caption=aggregate.querySelector("small").getBoundingClientRect();
        return Math.abs(number(aggregate)-number(row.querySelector(".master-cost a")))<1 &&
          row.getBoundingClientRect().bottom-caption.bottom>=8;
      }));
      assert(aligned,"aggregate values align with the numbers and their captions clear the row divider");
      await checkScrollCue(section);
      await audit(`${query}: desktop layout`,"#master-leaderboard");
      await section.evaluate(element=>{element.closest(".app-main").scrollTop+=element.getBoundingClientRect().top-24;});
      await screenshot(`master-${slug}-${width}.png`);
      if(slug==="hydrogen"){
        const frame=await section.locator(".table-scroll-frame").boundingBox();
        await page.screenshot({path:join(output,"scroll-cue-crop.png"),clip:{x:frame.x+frame.width-280,y:frame.y-8,width:288,height:180}});
        report.screenshots.push("scroll-cue-crop.png");
        const target=await section.getByRole("columnheader",{name:/^Terminal-Bench 4\.0/}).boundingBox();
        const frozen=await section.locator("th.master-first").boundingBox();
        await section.locator(".table-scroll").evaluate((element,left)=>{element.scrollLeft=left;},target.x-frozen.x-frozen.width);
        const positions=await section.locator("tbody .master-model").evaluateAll(cells=>cells.map(cell=>cell.getBoundingClientRect().left));
        assert(positions.every((left,index)=>Math.abs(left-layout[index].left)<1),"Model column stays frozen after horizontal scroll");
        await screenshot("master-hydrogen-1440-frozen.png");
        await section.locator("tbody .master-model").first().screenshot({path:join(output,"master-hydrogen-name-crop.png")});
        report.screenshots.push("master-hydrogen-name-crop.png");
      }
    }else{
      assert.equal(await section.locator(".master-table-view").isVisible(),false);
      assert(await section.locator("#master-mobile-sort").evaluate(select=>{
        const style=getComputedStyle(select),label=getComputedStyle(select.parentElement);
        return !select.disabled&&style.color!==label.color&&Number(style.fontWeight)<Number(label.fontWeight);
      }),"phone sort shows an enabled, primary-text selection");
      assert(await rows.evaluateAll(cards=>cards.every(card=>{
        const star=card.querySelector(".favorite-star").getBoundingClientRect(),tiles=card.querySelector(".master-card__metrics").getBoundingClientRect();
        return star.width>=44&&star.height>=44&&Math.abs(star.left-tiles.left)<1;
      })),"favorite button boxes align with the card metrics and keep their 44px touch area");
      await audit(`${query}: phone layout`,"#master-leaderboard");
      await phoneScreenshots(`master-${slug}-${width}`,section,true);
    }
    report.master[`${slug}-${width}`]={count,names};
    if(gpt){
      if(width===390){
        for(const card of await rows.all())await card.locator(".master-card__ranks summary").click();
        const values=rows.locator(".master-card__ranks dt").filter({hasText:/^CritPt$/}).locator("+ dd");
        assert.deepEqual(await values.allInnerTexts(),Array(count).fill("—"),`${query}: all phone CritPt ranks are dashes`);
        const name=`master-${slug}-critpt-390-crop.png`;
        await values.first().locator("..").screenshot({path:join(output,name),animations:"disabled"});
        report.screenshots.push(name);
      }else{
        const column=await section.getByRole("columnheader",{name:/^CritPt [↕↑↓]/}).evaluate(header=>header.cellIndex);
        const values=await rows.evaluateAll((rows,column)=>rows.map(row=>row.cells[column].innerText),column);
        assert.deepEqual(values,Array(count).fill("—"),`${query}: all desktop CritPt ranks are dashes`);
      }
      report.master[`${slug}-${width}`].critpt_dashes=count;
    }
  }

  await page.setViewportSize({width:1440,height:900});
  const masterNames=page.locator("#master-leaderboard tbody .master-model > a");
  if(gpt){
    await page.setViewportSize({width:1440,height:1300});
    await page.goto(`${baseUrl}/?mq=GPT-6.2%20Astra#master-leaderboard`);
    const search=page.locator("#master-search");
    const allNames=expected.map(entry=>entry.model).sort();
    report.master_searches={};
    for(const query of ["gpt-6.2 sol","GPT-6.2 Astra, GPT-6.2 Sol","GPT 6.2 Sol"]){
      await search.fill(query);
      await page.waitForFunction(query=>new URL(location.href).searchParams.get("mq")===query,query);
      const names=(await masterNames.allTextContents()).sort();
      if(query==="gpt-6.2 sol")assert.deepEqual(names,allNames.filter(name=>name.startsWith("GPT-6.2 Sol")),query);
      if(query==="GPT-6.2 Astra, GPT-6.2 Sol"){
        assert.deepEqual(names,allNames,query);
        const section=page.locator("#master-leaderboard");
        await section.evaluate(element=>{element.closest(".app-main").scrollTop+=element.getBoundingClientRect().top-24;});
        const target=await section.getByRole("columnheader",{name:/^CritPt [↕↑↓]/}).boundingBox();
        const frozen=await section.locator("th.master-first").boundingBox();
        await section.locator(".table-scroll").evaluate((element,left)=>{element.scrollLeft=left;},target.x-frozen.x-frozen.width);
        await section.getByText("← Earlier columns",{exact:true}).waitFor({state:"visible"});
        const lastRow=await section.locator("tbody tr").last().boundingBox();
        assert(lastRow.y+lastRow.height<=page.viewportSize().height,"all ten CritPt rows are within the desktop viewport");
        await screenshot("master-critpt-1440.png");
      }
      report.master_searches[query]=names;
    }
    await page.setViewportSize({width:390,height:844});
    const combined=encodeURIComponent(groups.map(([query])=>query).join(", "));
    await page.goto(`${baseUrl}/?mq=${combined}&ms=critpt#master-leaderboard`);
    const sortedRanks=page.locator("#master-leaderboard .master-card__sorted");
    assert.deepEqual(await sortedRanks.locator("dt").allInnerTexts(),Array(allNames.length).fill("CritPt"));
    assert.deepEqual(await sortedRanks.locator("dd").allInnerTexts(),Array(allNames.length).fill("—"),"all sorted phone CritPt tiles are dashes");
  }else{
    await page.goto(`${baseUrl}/?mq=Qwen%204#master-leaderboard`);
    assert.equal(await page.locator("#master-search").inputValue(),"Qwen 4");
    report.qwen_spaced_search={query:"Qwen 4",names:await masterNames.allTextContents()};
    report.qwen_spaced_search.finds_qwen4_max=report.qwen_spaced_search.names.includes("Qwen4 Max");
  }

  for(const {evaluation,entries} of evaluations)for(const width of [1440,390]){
    const id=evaluation.id;
    await page.setViewportSize({width,height:width===390?844:1200});
    if(width===1440){
      const response=await page.goto(`${baseUrl}/leaderboards/${evaluation.slug}?q=${encodeURIComponent(groups.map(([query])=>query).join(", "))}`);
      assert.equal(response.status(),200,`${id}: evaluation loads`);
      const current=page.locator(".app-rail .app-navigation__link[aria-current]");
      assert.equal(await current.innerText(),"Evaluations",`${id}: evaluation navigation section is selected`);
      assert.equal(await current.getAttribute("aria-current"),"location");
    }
    const section=page.locator(".evaluation-leaderboard");
    const rows=section.locator(width===390?".evaluation-card":".evaluation-table tbody tr:has([data-column=\"model\"])");
    if(entries.length)await rows.first().waitFor();
    else await section.locator(width===390?".evaluation-cards .empty":".evaluation-table .empty").waitFor({state:"visible"});
    assert.equal(await rows.count(),entries.length,`${id}: ${width}px rows`);
    if(gpt&&id==="mmmu-pro"){
      const modelNames=await (width===390?rows.locator("strong"):rows.locator('[data-column="model"]')).allTextContents();
      assert(modelNames.every(name=>!/GPT-6\.2 Sol/i.test(name)),`MMMU-Pro: no Sol rows at ${width}px`);
    }
    assert.equal(await page.locator(".evaluation-page-header .eyebrow").count(),0,"no repeated metric eyebrow above the evaluation title");
    assert.equal(await section.locator(".leaderboard-legend").innerText(),`— means no captured AA value.${evaluation.has_scoring_status?" Scoring status appears only when AA provides it.":""}`);
    if(width===390&&entries.length){
      assert.equal(await rows.first().locator("dt").filter({hasText:"Cost /"}).innerText(),"Cost / Intelligence Index task");
      const direction=section.getByRole("button",{name:"Reverse sort order",exact:true});
      assert.equal(await direction.innerText(),"Asc ↑","evaluation and master phone controls use the same arrow order");
      assert.match(await direction.getAttribute("class"),/ui-button--secondary/);
      assert.match(await direction.getAttribute("class"),/ui-button--default/);
      if(screenshotEvaluations.has(id)){
        await direction.click();
        await page.waitForFunction(()=>new URL(location.href).searchParams.get("direction")==="desc");
        assert.equal(await direction.innerText(),"Desc ↓");
        const descending=[...entries].sort((a,b)=>b.source_rank-a.source_rank||a.source_row-b.source_row);
        assert.deepEqual(await rows.evaluateAll(cards=>cards.map(card=>card.getAttribute("data-model"))),descending.map(entry=>entry.model),`${id}: reverse control sorts ranks descending`);
        if(!gpt&&id==="intelligence-index"){
          await direction.screenshot({path:join(output,"intelligence-index-390-sort-desc-crop.png")});
          report.screenshots.push("intelligence-index-390-sort-desc-crop.png");
        }
        await direction.click();
        await page.waitForFunction(()=>new URL(location.href).searchParams.get("direction")==="asc");
        assert.equal(await direction.innerText(),"Asc ↑");
      }
      // The first card's timing tiles stay on the first phone screen under the legend.
      if(id==="intelligence-index"||id==="terminal-bench-4-0"){
        const tile=await rows.first().locator(".master-card__metrics > div").nth(1).boundingBox();
        assert(tile.y+tile.height<=844,`${id}: first card's timings fit the first phone screen`);
      }
    }
    const displayed=await rows.evaluateAll((rows,mobile)=>rows.map(row=>{
      const text=selector=>row.querySelector(selector)?.innerText;
      const cell=key=>text(`[data-column="${key}"]`);
      const metric=label=>[...row.querySelectorAll("dt")].find(term=>term.textContent.startsWith(label))?.nextElementSibling?.innerText;
      if(mobile)return {
        model:row.getAttribute("data-model"),
        title:text(".evaluation-card__head strong"),
        score:text(".evaluation-card__score"),
        scoring_status:text(".evaluation-card__status"),
        cost_usd:metric("Cost / Intelligence Index task"),
        time_per_task:metric("Time per "),
        first_answer:metric("First Answer (s)"),
      };
      return {
        model:cell("model"),
        rank:cell("source_rank"),
        score:cell("score_value"),
        scoring_status:cell("scoring_status"),
        cost_usd:cell("cost_usd"),
        time_per_task:cell("time_per_task"),
        first_answer:cell("first_answer"),
      };
    }),width===390);
    const actual=[];
    for(let index=0;index<entries.length;index++){
      const entry=entries[index],row=displayed[index];
      const score=evaluationScoreDisplay(evaluation,entry);
      assert.equal(row.model,entry.model,`${id}: ${width}px row ${index+1}`);
      if(width===390){
        assert.equal(row.title,`#${entry.source_rank} ${entry.model}`);
        assert.equal(row.score,`${evaluation.metric_label}: ${score}`,`${entry.model}: phone score`);
        const status=entry.scoring_status?`AA scoring status: ${entry.scoring_status}`:undefined;
        assert.equal(row.scoring_status,status,`${id}: phone uses the captured scoring status`);
      }else{
        assert.equal(row.rank,String(entry.source_rank));
        assert.equal(row.score,score);
        if(evaluation.has_scoring_status)assert.equal(row.scoring_status,entry.scoring_status||"—",`${id}: desktop uses the captured scoring status`);
      }
      const cost=getIntelligenceIndexTaskCost(entry.provider,entry.model),speed=getModelSpeed(entry.provider,entry.model);
      const metrics={
        cost_usd:cost?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(cost.cost_usd):"—",
        time_per_task:formatTimePerTask(evaluationTimePerTask(id,speed)),
        first_answer:formatFirstAnswer(speed?.first_answer_s),
      };
      for(const [key,value] of Object.entries(metrics)){
        assert.equal(row[key],value,`${id}: ${entry.model} ${key} at ${width}px`);
      }
      actual.push({model:entry.model,rank:entry.source_rank,score,...metrics,scoring_status:entry.scoring_status||null});
    }
    await page.locator(".app-main").evaluate(element=>{element.scrollTop=0;});
    await audit(`${id}: ${width}px layout`,".evaluation-leaderboard");
    if(screenshotEvaluations.has(id)||sharedScreens.has(id)){
      if(width===390){
        if(screenshotEvaluations.has(id))await screenshot(`${id}-${width}-first-screen.png`);
        if(gpt&&id==="intelligence-index"){
          await page.getByRole("button",{name:"Menu",exact:true}).click();
          const menu=page.getByRole("dialog",{name:"Navigation",exact:true});
          assert.equal(await menu.locator('[aria-current="location"]').innerText(),"Evaluations");
          await screenshot("intelligence-index-390-menu.png");
          await menu.getByRole("button",{name:"Close Navigation"}).click();
          await menu.waitFor({state:"hidden"});
        }
        await phoneScreenshots(`${id}-${width}`,section);
      }else {await checkScrollCue(section);await screenshot(`${id}-${width}.png`);}
    }
    report.evaluations[`${id}-${width}`]=actual;
  }
  const capturedAt=dataset.evaluations.find(evaluation=>evaluation.id==="intelligence-index").captured_at;
  const date=new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(capturedAt));
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:width===390?844:1000});
    await page.goto(`${baseUrl}/about/data`);
    assert((await page.locator(".ui-page-header").innerText()).includes(`captured from Artificial Analysis on ${date}.`),`about data: displays ${date}`);
    await audit(`about data: ${width}px layout`,"article");
    await screenshot(`about-data-${width}.png`);
  }
  assert.deepEqual(consoleErrors,[],"no browser console errors in the new-model views");
  assert.deepEqual(pageErrors,[],"no browser page errors in the new-model views");
  page.off("console",onConsole);
  page.off("pageerror",onPageError);
  await writeFile(join(output,"browser-check.json"),JSON.stringify(report,null,2)+"\n");
  const searches=gpt?{master_searches:Object.fromEntries(Object.entries(report.master_searches).map(([query,names])=>[query,names.length]))}:{qwen_spaced_search:report.qwen_spaced_search.finds_qwen4_max};
  console.log(JSON.stringify({new_models:true,set:setName,master_search_counts:groups.map(([, ,count])=>count),...searches,evaluations_checked:evaluations.length,evaluation_row_checks:Object.values(report.evaluations).reduce((sum,rows)=>sum+rows.length,0),evaluation_ranks:true,fresh_eyes_regressions:true,shared_evaluation_screens:[...screenshotEvaluations],screenshots:report.screenshots.length}));
}
