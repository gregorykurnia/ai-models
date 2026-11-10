"use client";
import Link from "next/link";
import {useSearchParams,useRouter} from "next/navigation";
import {useCallback,useEffect,useMemo,useState,type ReactNode} from "react";
import type {Evaluation} from "@/lib/contract";
import {averageMasterRank,masterEvaluationLabel,masterLeaderboardCsv,orderMasterEvaluations,sortMaster,type MasterTableRow} from "@/lib/master";
import {readModelFavorites,subscribeToModelFavorites,writeModelFavorites} from "@/lib/model-favorites";
import {matchesModelSearch,parseModelSearchTerms} from "@/lib/model-search";
import {formatFirstAnswer,formatTimePerTask} from "@/lib/model-speed";
import {ProviderMultiSelect,providerSelectionLabel} from "@/components/ui/provider-multi-select";
import {Drawer} from "@/components/ui/drawer";
import {Alert, Button, Card, HelperText, IconButton, Input, LinkButton, Pagination, Select, Table, TableScroll} from "@/components/ui/primitives";

const costFormatter=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2});

function MasterModelSearch({value,onCommit}:{value:string;onCommit:(value:string)=>void}){
  const [draft,setDraft]=useState(value);
  useEffect(()=>setDraft(value),[value]);
  useEffect(()=>{
    const next=draft.slice(0,200);
    if(next===value)return;
    const timer=window.setTimeout(()=>onCommit(next),300);
    return()=>window.clearTimeout(timer);
  },[draft,value,onCommit]);
  return <div className="toolbar-model-search"><label className="sr-only" htmlFor="master-search">Search master model names</label><Input id="master-search" aria-describedby="master-search-help" value={draft} placeholder="Search model names…" onChange={event=>setDraft(event.target.value.slice(0,200))}/><HelperText id="master-search-help">Comma-separated: sol, haiku.</HelperText></div>;
}

function speedValue(seconds:number|null|undefined,format:(seconds:number|null|undefined)=>string,unit?:string){
  const value=format(seconds);
  return value==="—"?<span className="muted">—</span>:<>{value}{unit?` ${unit}`:""}</>;
}

// Speed headers are narrow: the unit and the date sit on their own lines, like the evaluation pages.
function speedDetail(unit:string,date:string){
  return <><span className="master-header-part">{unit} · AA</span><span className="master-header-part">{date}</span></>;
}

function MasterCard({row,favorite,orderedEvaluations,sortedEvaluation,onToggleFavorite}:{row:MasterTableRow;favorite:boolean;orderedEvaluations:Evaluation[];sortedEvaluation?:Evaluation;onToggleFavorite:(identity:string)=>void}){
  const aggregate=averageMasterRank(row);
  const sortedCell=sortedEvaluation?row.cells[sortedEvaluation.id]:undefined;
  return <li className="master-card">
    <div className="master-card__head">
      <IconButton className="favorite-star" size="compact" type="button" aria-pressed={favorite} aria-label={`${favorite?"Remove":"Add"} ${row.model} to favorites`} title={`${favorite?"Remove from":"Add to"} favorites`} onClick={()=>onToggleFavorite(row.identity_key)}>{favorite?"★":"☆"}</IconButton>
      <div className="master-card__title">
        <Link href={`/?mq=${encodeURIComponent(row.model)}&mp=${encodeURIComponent(row.provider)}#master-leaderboard`}>{row.model}</Link>
        <span className="master-card__provider">{row.provider}</span>
      </div>
    </div>
    <dl className="master-card__metrics">
      <div><dt>Aggregate</dt><dd>{aggregate?<span title={`Average of ${aggregate.count} of 9 available source ranks`} aria-label={`${aggregate.score.toFixed(1)} average rank based on ${aggregate.count} of 9 dimensions`}>{aggregate.score.toFixed(1)}<small>{aggregate.count}/9 dims</small></span>:<span className="muted" title="No source rank in any of the nine aggregate dimensions">—</span>}</dd></div>
      <div><dt>Cost / task</dt><dd>{row.intelligence_index_cost?<a href={row.intelligence_index_cost.url} target="_blank" rel="noreferrer" title={`Artificial Analysis profile for ${row.intelligence_index_cost.model} · cost captured ${row.intelligence_index_cost.profile_captured_at}`}>{costFormatter.format(row.intelligence_index_cost.cost_usd)}</a>:<span className="muted">—</span>}</dd></div>
      <div><dt>Time / task</dt><dd>{speedValue(row.speed?.time_per_task_s,formatTimePerTask,"min")}</dd></div>
      <div><dt>First answer</dt><dd>{speedValue(row.speed?.first_answer_s,formatFirstAnswer,"s")}</dd></div>
      {sortedEvaluation&&<div className="master-card__sorted"><dt>{masterEvaluationLabel(sortedEvaluation)}</dt><dd>{sortedCell?<Link className="source-rank" href={sortedCell.href} title={sortedCell.entry.scoring_status??"Original source rank"} aria-label={`${row.model}, ${masterEvaluationLabel(sortedEvaluation)}, original source rank ${sortedCell.entry.source_rank}`}>#{sortedCell.entry.source_rank}</Link>:<span className="muted">Not ranked</span>}</dd></div>}
    </dl>
    <details className="master-card__ranks">
      <summary>All {orderedEvaluations.length} evaluation ranks</summary>
      <dl>{orderedEvaluations.map(e=>{const c=row.cells[e.id];const label=masterEvaluationLabel(e);return <div key={e.id}><dt>{label}</dt><dd>{c?<Link className="source-rank" href={c.href} title={c.entry.scoring_status??"Original source rank"} aria-label={`${row.model}, ${label}, original source rank ${c.entry.source_rank}`}>#{c.entry.source_rank}</Link>:<span className="muted">Not ranked</span>}</dd></div>;})}</dl>
    </details>
  </li>;
}

export default function MasterLeaderboard({rows,evaluations,costCapturedLabel,speedCapturedLabel}:{rows:MasterTableRow[];evaluations:Evaluation[];costCapturedLabel:string;speedCapturedLabel:string}){
  const params=useSearchParams(),router=useRouter();
  const [favorites,setFavorites]=useState<string[]>([]),[favoriteNotice,setFavoriteNotice]=useState("");
  const [filtersOpen,setFiltersOpen]=useState(false);
  useEffect(()=>{const refresh=()=>setFavorites(readModelFavorites());refresh();return subscribeToModelFavorites(refresh);},[]);
  const orderedEvaluations=useMemo(()=>orderMasterEvaluations(evaluations),[evaluations]);
  const q=(params.get("mq")??"").slice(0,200),favoritesOnly=params.get("mf")==="1";
  const selectedProviders=useMemo(()=>[...new Set(params.getAll("mp").filter(Boolean))],[params]);
  const selectedProviderSet=useMemo(()=>new Set(selectedProviders),[selectedProviders]);
  const [searchTerm,setSearchTerm]=useState(q);
  useEffect(()=>setSearchTerm(q),[q]);
  const defaultSort=evaluations.some(e=>e.id==="intelligence-index")?"intelligence-index":"model";
  const requested=params.get("ms")??defaultSort,sort=["model","provider","intelligence-index-cost","time-per-task","first-answer","aggregate-score",...orderedEvaluations.map(e=>e.id)].includes(requested)?requested:defaultSort;
  const direction=params.get("md")==="desc"?"desc":"asc";
  const size=[25,50,100].includes(Number(params.get("mz")))?Number(params.get("mz")):25;
  const searchTerms=useMemo(()=>parseModelSearchTerms(searchTerm),[searchTerm]);
  const sorted=useMemo(()=>sortMaster(rows.filter(r=>(!selectedProviderSet.size||selectedProviderSet.has(r.provider))&&matchesModelSearch(r.model,searchTerms)&&(!favoritesOnly||favorites.includes(r.identity_key))),sort,direction),[rows,selectedProviderSet,searchTerms,favoritesOnly,favorites,sort,direction]);
  const pages=Math.max(1,Math.ceil(sorted.length/size)),page=Math.min(pages,Math.max(1,Math.floor(Number(params.get("mi"))||1)));
  const pageRows=sorted.slice((page-1)*size,page*size);
  const sortedEvaluation=orderedEvaluations.find(e=>e.id===sort);
  const activeFilterCount=selectedProviders.length+(favoritesOnly?1:0);
  const sortOptions=[
    {value:"model",label:"Model"},
    {value:"provider",label:"Provider"},
    {value:"intelligence-index-cost",label:"Cost per Intelligence Index task"},
    {value:"time-per-task",label:"Time per task (minutes)"},
    {value:"first-answer",label:"First answer (seconds)"},
    {value:"aggregate-score",label:"Aggregate Score"},
    ...orderedEvaluations.map(e=>({value:e.id,label:masterEvaluationLabel(e)})),
  ];
  const update=useCallback((values:Record<string,string|number|string[]>,history:"push"|"replace"="replace")=>{const next=new URLSearchParams(window.location.search);next.set("mi","1");for(const [k,v]of Object.entries(values)){next.delete(k);if(Array.isArray(v))v.forEach(value=>{if(value)next.append(k,value);});else if(v!=="")next.set(k,String(v));}const href=`/?${next}#master-leaderboard`;if(history==="push")router.push(href,{scroll:false});else router.replace(href,{scroll:false});},[router]);
  const commitSearch=useCallback((value:string)=>{
    setSearchTerm(value);
    const next=new URLSearchParams(window.location.search);
    next.set("mi","1");
    if(value)next.set("mq",value);else next.delete("mq");
    window.history.replaceState(null,"",`/?${next}#master-leaderboard`);
  },[]);
  const shareParams=new URLSearchParams(params.toString());
  if(searchTerm)shareParams.set("mq",searchTerm);else shareParams.delete("mq");
  const stateHref=`/?${shareParams}#master-leaderboard`;
  const toggleFavorite=(identity:string)=>{const next=favorites.includes(identity)?favorites.filter(id=>id!==identity):[...favorites,identity];if(writeModelFavorites(next)){setFavorites(next);setFavoriteNotice("");}else setFavoriteNotice("Favorites could not be saved in this browser.");};
  const clearFilters=()=>{setSearchTerm("");update({mq:"",mp:"",mf:"",ms:"",md:"",mi:"",mz:""});};
  const exportCsv=useCallback(()=>{
    const blob=new Blob([masterLeaderboardCsv(sorted,orderedEvaluations)],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob),link=document.createElement("a");
    link.href=url;link.download="master-leaderboard.csv";document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),0);
  },[sorted,orderedEvaluations]);
  const header=(key:string,label:string,sticky?:string)=><th scope="col" className={sticky??"numeric"} aria-sort={sort===key?(direction==="asc"?"ascending":"descending"):"none"}><Button variant="quiet" size="compact" onClick={()=>update({ms:key,md:sort===key&&direction==="asc"?"desc":"asc"})}>{label} {sort===key?(direction==="asc"?"↑":"↓"):"↕"}</Button></th>;
  const metricHeader=(key:string,className:string,label:string,detail:ReactNode,title:string)=><th scope="col" className={`numeric ${className}`} aria-sort={sort===key?(direction==="asc"?"ascending":"descending"):"none"}><Button variant="quiet" size="compact" title={title} onClick={()=>update({ms:key,md:sort===key&&direction==="asc"?"desc":"asc"})}>{label}{"\u00a0"}{sort===key?(direction==="asc"?"↑":"↓"):"↕"}<small>{detail}</small></Button></th>;
  // Filter controls render twice: inline in the toolbar on tablet and desktop, and inside the mobile Filters drawer. Only one copy is visible at a time; the drawer copy uses its own IDs.
  const filterControls=(idPrefix:string,variant:"toolbar"|"drawer")=><>
      <label className="sr-only" htmlFor={`${idPrefix}master-provider`}>Master provider</label>
      <ProviderMultiSelect id={`${idPrefix}master-provider`} className={variant==="toolbar"?"master-desktop-only":"master-filter-drawer__control"} label="Master provider" providers={[...new Set(rows.map(r=>r.provider))].sort()} selected={selectedProviders} onChange={providers=>update({mp:providers},"push")}/>
      <label className="sr-only" htmlFor={`${idPrefix}master-favorites`}>Favorite filter</label>
      <Select className={variant==="toolbar"?"master-model-filter master-desktop-only":"master-model-filter master-filter-drawer__control"} id={`${idPrefix}master-favorites`} value={favoritesOnly?"favorites":"all"} onChange={e=>update({mf:e.target.value==="favorites"?"1":""})}>
        <option value="all">All models</option><option value="favorites">Favorites only</option>
      </Select>
      <strong className={variant==="toolbar"?"master-favorite-count master-desktop-only":"master-filter-drawer__count"}>{favorites.length} favorite{favorites.length===1?"":"s"}</strong>
      <Button size="compact" variant="quiet" className={variant==="toolbar"?"master-desktop-only":"master-filter-drawer__control"} onClick={clearFilters}>Clear filters</Button>
      <LinkButton href={stateHref} variant="quiet" size="compact" className={variant==="toolbar"?"master-desktop-only":"master-filter-drawer__control"}>Link to this view</LinkButton>
      <Button size="compact" variant="secondary" className={variant==="toolbar"?"master-desktop-only":"master-filter-drawer__control"} onClick={exportCsv} disabled={!sorted.length} title={`Export ${sorted.length.toLocaleString()} matching models as CSV`}>Export CSV</Button>
    </>;
  return <Card id="master-leaderboard" className="master"><div className="eyebrow">Ranks by evaluation</div><h2>Master leaderboard</h2>
    <p className="master-intro">Each evaluation column shows the model’s original rank. Aggregate Score is the average of its available ranks across nine dimensions; lower is better. Cost per Intelligence Index task is the source-reported weighted average in USD. Time per Task (minutes) and First Answer (seconds) are Artificial Analysis speeds; they don’t change the Aggregate Score. All columns can be sorted. <Link href="/about/data">Data notes</Link>.</p>
    <div className="master-intro-mobile"><p>Original ranks across evaluations.</p><details><summary>About these ranks</summary><p>Aggregate Score is the average of its available ranks across nine dimensions; lower is better. Cost per Intelligence Index task is the source-reported weighted average in USD. Time per task (minutes) and First answer (seconds) are Artificial Analysis speeds; they don’t change the Aggregate Score. Sort with the Sort by control. <Link href="/about/data">Data notes</Link>.</p></details></div>
    <div className="toolbar filter-toolbar master-toolbar">
      <MasterModelSearch value={searchTerm} onCommit={commitSearch}/>
      {filterControls("",  "toolbar")}
      <div className="master-mobile-controls">
        <label>Sort by<Select id="master-mobile-sort" value={sort} onChange={e=>update({ms:e.target.value})}>{sortOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</Select></label>
        <Button variant="secondary" size="default" title="Toggle sort direction" onClick={()=>update({md:direction==="asc"?"desc":"asc"})}>{direction==="asc"?"Asc ↑":"Desc ↓"}</Button>
        <Button className="master-mobile-controls__filters" variant="secondary" size="default" aria-haspopup="dialog" onClick={()=>setFiltersOpen(true)}>Filters{activeFilterCount?` · ${activeFilterCount} active`:""}</Button>
      </div>
    </div>
    <p aria-live="polite">{sorted.length.toLocaleString()} models{selectedProviders.length?` · ${providerSelectionLabel(selectedProviders)}`:""}{favoritesOnly?` · ${favorites.length} favorites saved in this browser`:""} · Original source ranks. “Not ranked” means no captured result.</p><HelperText className="leaderboard-legend">— means no captured AA value. Aggregate uses 9 of {orderedEvaluations.length} evaluations.</HelperText>{favoriteNotice&&<Alert role="status" live="polite" tone="error">{favoriteNotice}</Alert>}
    <TableScroll showOverflowCue className="master-table-view" label="Master leaderboard, scroll horizontally for evaluations"><Table><caption className="sr-only">Model ranks, aggregate rank scores, Intelligence Index task costs and speeds across every evaluation</caption><thead><tr>{header("model","Model","master-model")}{header("provider","Provider","master-provider")}{metricHeader("intelligence-index-cost","master-cost","Cost per Intelligence Index task",speedDetail("USD",costCapturedLabel),`Artificial Analysis model profile values · captured ${costCapturedLabel}`)}{metricHeader("time-per-task","master-time","Time per Task",speedDetail("Minutes",speedCapturedLabel),`Average time per Intelligence Index task from Artificial Analysis · captured ${speedCapturedLabel}`)}{metricHeader("first-answer","master-first","First Answer",speedDetail("Seconds",speedCapturedLabel),`Time to first answer token on the creator's API, from Artificial Analysis · captured ${speedCapturedLabel}`)}{metricHeader("aggregate-score","master-aggregate","Aggregate Score","Average rank · lower is better","Arithmetic mean of available source ranks across the nine selected dimensions; lower is better")}{orderedEvaluations.map(e=>{const label=masterEvaluationLabel(e);return <th key={e.id} scope="col" className="numeric" aria-sort={sort===e.id?(direction==="asc"?"ascending":"descending"):"none"}><Button variant="quiet" size="compact" title={`Original source rank · captured ${e.captured_at}`} onClick={()=>update({ms:e.id,md:sort===e.id&&direction==="asc"?"desc":"asc"})}>{label} {sort===e.id?(direction==="asc"?"↑":"↓"):"↕"}<small>Rank · {e.captured_at}</small></Button></th>;})}</tr></thead><tbody>{pageRows.map(r=>{const aggregate=averageMasterRank(r);return <tr key={r.model_id}><td className="master-model"><IconButton className="favorite-star" size="compact" type="button" aria-pressed={favorites.includes(r.identity_key)} aria-label={`${favorites.includes(r.identity_key)?"Remove":"Add"} ${r.model} to favorites`} title={`${favorites.includes(r.identity_key)?"Remove from":"Add to"} favorites`} onClick={()=>toggleFavorite(r.identity_key)}>{favorites.includes(r.identity_key)?"★":"☆"}</IconButton> <Link href={`/?mq=${encodeURIComponent(r.model)}&mp=${encodeURIComponent(r.provider)}#master-leaderboard`}>{r.model}</Link></td><td className="master-provider">{r.provider}</td><td className="numeric master-cost">{r.intelligence_index_cost?<a href={r.intelligence_index_cost.url} target="_blank" rel="noreferrer" title={`Artificial Analysis profile for ${r.intelligence_index_cost.model} · cost captured ${r.intelligence_index_cost.profile_captured_at}`}>{costFormatter.format(r.intelligence_index_cost.cost_usd)}</a>:<span className="muted">—</span>}</td><td className="numeric master-time">{speedValue(r.speed?.time_per_task_s,formatTimePerTask)}</td><td className="numeric master-first">{speedValue(r.speed?.first_answer_s,formatFirstAnswer)}</td><td className="numeric master-aggregate">{aggregate?<span title={`Average of ${aggregate.count} of 9 available source ranks`} aria-label={`${aggregate.score.toFixed(1)} average rank based on ${aggregate.count} of 9 dimensions`}>{aggregate.score.toFixed(1)}<small>{aggregate.count}/9 dims</small></span>:<span className="muted" title="No source rank in any of the nine aggregate dimensions">—</span>}</td>{orderedEvaluations.map(e=>{const c=r.cells[e.id];const label=masterEvaluationLabel(e);return <td key={e.id} className="numeric">{c?<Link className="source-rank" href={c.href} title={c.entry.scoring_status??"Original source rank"} aria-label={`${r.model}, ${label}, original source rank ${c.entry.source_rank}`}>#{c.entry.source_rank}</Link>:<span className="muted">Not ranked</span>}</td>;})}</tr>;})}{!sorted.length&&<tr><td className="empty" colSpan={orderedEvaluations.length+6}>No models match these filters.</td></tr>}</tbody></Table></TableScroll>
    <ul className="master-cards" aria-label="Master leaderboard models">
      {pageRows.map(r=><MasterCard key={r.model_id} row={r} favorite={favorites.includes(r.identity_key)} orderedEvaluations={orderedEvaluations} sortedEvaluation={sortedEvaluation} onToggleFavorite={toggleFavorite}/>)}
      {!sorted.length&&<li className="empty">No models match these filters.</li>}
    </ul>
    <Pagination page={page} pages={pages} onPageChange={nextPage=>update({mi:nextPage})} pageSize={size} pageSizeOptions={[25,50,100]} onPageSizeChange={nextSize=>update({mz:nextSize})}/>
    <Drawer open={filtersOpen} onOpenChange={setFiltersOpen} title="Master filters" id="master-filters">
      <div className="master-filter-drawer">
        <div className="master-filter-drawer__controls">{filterControls("filters-","drawer")}</div>
      </div>
    </Drawer>
  </Card>;
}
