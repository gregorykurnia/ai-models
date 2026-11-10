import assert from "node:assert/strict";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {join} from "node:path";

// Optional focused pass for check-master-browser.mjs. Reads bundled snapshots only.
export async function checkNewModelsBrowser(page,baseUrl,output){
  const dataset=JSON.parse(await readFile(new URL("../data/leaderboards.json",import.meta.url),"utf8"));
  const groups=[["Fable 5.2","fable",5],["Muse Ember","muse",2]];
  const evaluationIds=["intelligence-index","terminal-bench-4-0"];
  const expected=dataset.entries.filter(entry=>entry.evaluation_id==="intelligence-index"&&groups.some(([query])=>entry.model.includes(query)));
  assert.equal(expected.length,7,"seven distinct new configurations in the bundled index");
  const scores=new Map();
  const consoleErrors=[];
  const onConsole=message=>{if(message.type()==="error")consoleErrors.push(message.text());};
  page.on("console",onConsole);
  const report={master:{},evaluations:{},screenshots:[]};
  await mkdir(output,{recursive:true});

  async function audit(label,selector){
    const faults=await page.evaluate(selector=>{
      const faults=[];
      if(document.documentElement.scrollWidth>innerWidth)faults.push("horizontal page overflow");
      const root=document.querySelector(selector);
      for(const element of root.querySelectorAll("a,button,strong,dt,dd")){
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
    await page.screenshot({path:join(output,name),animations:"disabled"});
    report.screenshots.push(name);
  }

  // Keep the 390x844 first screen, then use a taller 390px capture to show every
  // card in one image without hiding, rearranging, or shrinking its content.
  async function phoneScreenshots(stem,section,firstScreen=false){
    await section.scrollIntoViewIfNeeded();
    const align=()=>section.evaluate(element=>{element.closest(".app-main").scrollTop+=element.getBoundingClientRect().top-56;});
    await align();
    if(firstScreen)await screenshot(`${stem}-first-screen.png`);
    const height=firstScreen
      ?await section.evaluate(element=>Math.ceil(element.getBoundingClientRect().height+120))
      :await page.locator(".app-main").evaluate(element=>Math.ceil(element.scrollHeight+100));
    await page.setViewportSize({width:390,height:Math.max(844,height)});
    if(firstScreen)await align();
    else await page.locator(".app-main").evaluate(element=>{element.scrollTop=0;});
    const box=await section.boundingBox();
    const y=firstScreen?Math.floor(box.y):0;
    await page.screenshot({path:join(output,`${stem}.png`),animations:"disabled",clip:{x:0,y,width:390,height:Math.ceil(box.y+box.height-y)}});
    report.screenshots.push(`${stem}.png`);
    if(stem==="master-fable-390"){
      await section.locator(".master-card").last().screenshot({path:join(output,"master-fable-last-card-crop.png")});
      report.screenshots.push("master-fable-last-card-crop.png");
    }
  }

  for(const width of [1440,390])for(const [query,slug,count] of groups){
    await page.setViewportSize({width,height:width===390?844:1000});
    await page.goto(`${baseUrl}/?mq=${encodeURIComponent(query)}#master-leaderboard`);
    const section=page.locator("#master-leaderboard");
    const rows=section.locator(width===390?".master-card":"tbody tr");
    await rows.first().waitFor();
    assert.equal(await section.locator("#master-search").inputValue(),query);
    assert.equal(await rows.count(),count,`${query}: ${width}px count`);
    const names=await rows.locator(width===390?".master-card__title a":".master-model > a").allTextContents();
    assert.deepEqual([...names].sort(),expected.filter(entry=>entry.model.includes(query)).map(entry=>entry.model).sort());
    for(let index=0;index<count;index++){
      const score=await rows.nth(index).locator(width===390?".master-card__metrics dd span":".master-aggregate > span").first().getAttribute("aria-label");
      assert.match(score,/^\d+\.\d average rank based on \d of 9 dimensions$/);
      if(width===1440)scores.set(names[index],score);
      else assert.equal(score,scores.get(names[index]),`${names[index]}: phone aggregate agrees with desktop`);
    }
    if(width===1440){
      const layout=await section.locator("tbody .master-model").evaluateAll(cells=>cells.map(cell=>{
        const link=cell.querySelector("a"),star=cell.querySelector("button");
        const box=cell.getBoundingClientRect(),text=link.getBoundingClientRect(),favorite=star.getBoundingClientRect();
        return {sticky:getComputedStyle(cell).position==="sticky",contained:text.left>=box.left&&text.right<=box.right&&text.top>=box.top&&text.bottom<=box.bottom,
          separate:text.left>=favorite.right,wrapped:text.height>parseFloat(getComputedStyle(link).lineHeight)*1.5,left:box.left};
      }));
      assert(layout.every(item=>item.sticky&&item.contained&&item.separate),`${query}: frozen names and stars do not overlap`);
      if(slug==="fable")assert(layout.every(item=>item.wrapped),"all long Fable names wrap");
      await section.scrollIntoViewIfNeeded();
      await audit(`${query}: desktop layout`,"#master-leaderboard");
      await screenshot(`master-${slug}-${width}.png`);
      if(slug==="fable"){
        await section.locator(".table-scroll").evaluate(element=>{element.scrollLeft=900;});
        const positions=await section.locator("tbody .master-model").evaluateAll(cells=>cells.map(cell=>cell.getBoundingClientRect().left));
        assert(positions.every((left,index)=>Math.abs(left-layout[index].left)<1),"Model column stays frozen after horizontal scroll");
        await screenshot("master-fable-1440-frozen.png");
        await section.locator("tbody .master-model").first().screenshot({path:join(output,"master-fable-name-crop.png")});
        report.screenshots.push("master-fable-name-crop.png");
      }
    }else{
      assert.equal(await section.locator(".master-table-view").isVisible(),false);
      await audit(`${query}: phone layout`,"#master-leaderboard");
      await phoneScreenshots(`master-${slug}-${width}`,section,true);
    }
    report.master[`${slug}-${width}`]={count,names};
  }

  for(const id of evaluationIds)for(const width of [1440,390]){
    await page.setViewportSize({width,height:width===390?844:1200});
    await page.goto(`${baseUrl}/leaderboards/${id}?q=${encodeURIComponent("Fable 5.2, Muse Ember")}`);
    const section=page.locator(".evaluation-leaderboard");
    const rows=section.locator(width===390?".evaluation-card":".evaluation-table tbody tr");
    await rows.first().waitFor();
    const entries=dataset.entries.filter(entry=>entry.evaluation_id===id&&groups.some(([query])=>entry.model.includes(query))).sort((a,b)=>a.source_row-b.source_row);
    assert.equal(entries.length,7,`${id}: AA scores all seven models`);
    assert.equal(await rows.count(),entries.length,`${id}: ${width}px rows`);
    const actual=[];
    for(let index=0;index<entries.length;index++){
      const entry=entries[index],row=rows.nth(index);
      const score=id==="terminal-bench-4-0"?`${(entry.score_value*100).toFixed(2)}%`:entry.score_display;
      if(width===390){
        assert.equal(await row.getAttribute("data-model"),entry.model);
        assert.equal(await row.locator("strong").innerText(),`#${entry.source_rank} ${entry.model}`);
        assert((await row.locator(".evaluation-card__head small").innerText()).endsWith(score),`${entry.model}: phone score`);
      }else{
        assert.equal(await row.locator('[data-column="model"]').innerText(),entry.model);
        assert.equal(await row.locator('[data-column="source_rank"]').innerText(),String(entry.source_rank));
        assert.equal(await row.locator('[data-column="score_value"]').innerText(),score);
      }
      actual.push({model:entry.model,rank:entry.source_rank,score});
    }
    await page.locator(".app-main").evaluate(element=>{element.scrollTop=0;});
    await audit(`${id}: ${width}px layout`,".evaluation-leaderboard");
    if(width===390)await phoneScreenshots(`${id}-${width}`,section);
    else await screenshot(`${id}-${width}.png`);
    report.evaluations[`${id}-${width}`]=actual;
  }
  assert.deepEqual(consoleErrors,[],"no browser console errors in the new-model views");
  page.off("console",onConsole);
  await writeFile(join(output,"browser-check.json"),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({new_models:true,master_search_counts:[5,2],evaluation_ranks:true,screenshots:report.screenshots.length}));
}
