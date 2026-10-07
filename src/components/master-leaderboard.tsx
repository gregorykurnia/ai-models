"use client";
import Link from "next/link";
import {useSearchParams,useRouter} from "next/navigation";
import {useCallback,useEffect,useMemo,useState} from "react";
import type {Evaluation} from "@/lib/contract";
import {averageMasterRank,masterEvaluationLabel,masterLeaderboardCsv,orderMasterEvaluations,sortMaster,type MasterTableRow} from "@/lib/master";
import {readModelFavorites,subscribeToModelFavorites,writeModelFavorites} from "@/lib/model-favorites";
import {Alert, Button, Card, IconButton, Input, LinkButton, Pagination, Select, Table, TableScroll} from "@/components/ui/primitives";

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
  return <><label className="sr-only" htmlFor="master-search">Search master model names</label><Input id="master-search" value={draft} placeholder="Search model names…" onChange={event=>setDraft(event.target.value.slice(0,200))}/></>;
}

export default function MasterLeaderboard({rows,evaluations,costCapturedLabel}:{rows:MasterTableRow[];evaluations:Evaluation[];costCapturedLabel:string}){
  const params=useSearchParams(),router=useRouter();
  const [favorites,setFavorites]=useState<string[]>([]),[favoriteNotice,setFavoriteNotice]=useState("");
  useEffect(()=>{const refresh=()=>setFavorites(readModelFavorites());refresh();return subscribeToModelFavorites(refresh);},[]);
  const orderedEvaluations=useMemo(()=>orderMasterEvaluations(evaluations),[evaluations]);
  const q=(params.get("mq")??"").slice(0,200),provider=params.get("mp")??"",favoritesOnly=params.get("mf")==="1";
  const [searchTerm,setSearchTerm]=useState(q);
  useEffect(()=>setSearchTerm(q),[q]);
  const defaultSort=evaluations.some(e=>e.id==="intelligence-index")?"intelligence-index":"model";
  const requested=params.get("ms")??defaultSort,sort=["model","provider","intelligence-index-cost","aggregate-score",...orderedEvaluations.map(e=>e.id)].includes(requested)?requested:defaultSort;
  const direction=params.get("md")==="desc"?"desc":"asc";
  const size=[25,50,100].includes(Number(params.get("mz")))?Number(params.get("mz")):25;
  const sorted=useMemo(()=>sortMaster(rows.filter(r=>(!provider||r.provider===provider)&&r.model.toLowerCase().includes(searchTerm.toLowerCase())&&(!favoritesOnly||favorites.includes(r.identity_key))),sort,direction),[rows,provider,searchTerm,favoritesOnly,favorites,sort,direction]);
  const pages=Math.max(1,Math.ceil(sorted.length/size)),page=Math.min(pages,Math.max(1,Math.floor(Number(params.get("mi"))||1)));
  const update=useCallback((values:Record<string,string|number>)=>{const next=new URLSearchParams(window.location.search);next.set("mi","1");for(const [k,v]of Object.entries(values)){if(v==="")next.delete(k);else next.set(k,String(v));}router.replace(`/?${next}#master-leaderboard`,{scroll:false});},[router]);
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
  const exportCsv=useCallback(()=>{
    const blob=new Blob([masterLeaderboardCsv(sorted,orderedEvaluations)],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob),link=document.createElement("a");
    link.href=url;link.download="master-leaderboard.csv";document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),0);
  },[sorted,orderedEvaluations]);
  const header=(key:string,label:string,sticky?:string)=><th scope="col" className={sticky??"numeric"} aria-sort={sort===key?(direction==="asc"?"ascending":"descending"):"none"}><Button variant="quiet" size="compact" onClick={()=>update({ms:key,md:sort===key&&direction==="asc"?"desc":"asc"})}>{label} {sort===key?(direction==="asc"?"↑":"↓"):"↕"}</Button></th>;
  return <Card id="master-leaderboard" className="master"><div className="eyebrow">Ranks by evaluation</div><h2>Master leaderboard</h2><p>Each evaluation column shows the model’s original rank. Aggregate Score is the average of its available ranks across nine dimensions; lower is better. Cost per Intelligence Index task is the source-reported weighted average in USD. All columns can be sorted. <Link href="/about/data">Data notes</Link>.</p>
    <div className="toolbar">
      <MasterModelSearch value={searchTerm} onCommit={commitSearch}/>
      <label className="sr-only" htmlFor="master-provider">Master provider</label>
      <Select id="master-provider" value={provider} onChange={e=>update({mp:e.target.value})}>
        <option value="">All providers</option>{[...new Set(rows.map(r=>r.provider))].sort().map(p=><option key={p}>{p}</option>)}
      </Select>
      <label className="sr-only" htmlFor="master-favorites">Favorite filter</label>
      <Select id="master-favorites" value={favoritesOnly?"favorites":"all"} onChange={e=>update({mf:e.target.value==="favorites"?"1":""})}>
        <option value="all">All models</option><option value="favorites">Favorites only</option>
      </Select>
      <strong>{favorites.length} favorite{favorites.length===1?"":"s"}</strong>
      <Button size="compact" variant="quiet" onClick={()=>{setSearchTerm("");update({mq:"",mp:"",mf:"",ms:"",md:"",mi:"",mz:""})}}>Clear filters</Button>
      <LinkButton href={stateHref} variant="quiet" size="compact">Link to this view</LinkButton>
      <Button size="compact" variant="secondary" onClick={exportCsv} disabled={!sorted.length} title={`Export ${sorted.length.toLocaleString()} matching models as CSV`}>Export CSV</Button>
    </div>
    <p aria-live="polite">{sorted.length.toLocaleString()} models{favoritesOnly?` · ${favorites.length} favorites saved in this browser`:""} · Ranks come directly from the workbook. “Not ranked” means no entry exists for that exact model variant.</p>{favoriteNotice&&<Alert role="status" live="polite" tone="error">{favoriteNotice}</Alert>}
    <TableScroll label="Master leaderboard, scroll horizontally for evaluations"><Table><caption className="sr-only">Model ranks, aggregate rank scores, and Intelligence Index task costs across every evaluation</caption><thead><tr>{header("model","Model","master-model")}{header("provider","Provider","master-provider")}<th scope="col" className="numeric master-cost" aria-sort={sort==="intelligence-index-cost"?(direction==="asc"?"ascending":"descending"):"none"}><Button variant="quiet" size="compact" title={`Artificial Analysis model profile values · captured ${costCapturedLabel}`} onClick={()=>update({ms:"intelligence-index-cost",md:sort==="intelligence-index-cost"&&direction==="asc"?"desc":"asc"})}>Cost Per Intelligence Index Task {sort==="intelligence-index-cost"?(direction==="asc"?"↑":"↓"):"↕"}<small>USD · AA · {costCapturedLabel}</small></Button></th><th scope="col" className="numeric master-aggregate" aria-sort={sort==="aggregate-score"?(direction==="asc"?"ascending":"descending"):"none"}><Button variant="quiet" size="compact" title="Arithmetic mean of available source ranks across the nine selected dimensions; lower is better" onClick={()=>update({ms:"aggregate-score",md:sort==="aggregate-score"&&direction==="asc"?"desc":"asc"})}>Aggregate Score {sort==="aggregate-score"?(direction==="asc"?"↑":"↓"):"↕"}<small>Average rank · lower is better</small></Button></th>{orderedEvaluations.map(e=>{const label=masterEvaluationLabel(e);return <th key={e.id} scope="col" className="numeric" aria-sort={sort===e.id?(direction==="asc"?"ascending":"descending"):"none"}><Button variant="quiet" size="compact" title={`Original source rank · captured ${e.captured_at}`} onClick={()=>update({ms:e.id,md:sort===e.id&&direction==="asc"?"desc":"asc"})}>{label} {sort===e.id?(direction==="asc"?"↑":"↓"):"↕"}<small>Rank · {e.captured_at}</small></Button></th>;})}</tr></thead><tbody>{sorted.slice((page-1)*size,page*size).map(r=>{const aggregate=averageMasterRank(r);return <tr key={r.model_id}><td className="master-model"><IconButton className="favorite-star" size="compact" type="button" aria-pressed={favorites.includes(r.identity_key)} aria-label={`${favorites.includes(r.identity_key)?"Remove":"Add"} ${r.model} to favorites`} title={`${favorites.includes(r.identity_key)?"Remove from":"Add to"} favorites`} onClick={()=>toggleFavorite(r.identity_key)}>{favorites.includes(r.identity_key)?"★":"☆"}</IconButton> <Link href={`/?mq=${encodeURIComponent(r.model)}&mp=${encodeURIComponent(r.provider)}#master-leaderboard`}>{r.model}</Link></td><td className="master-provider">{r.provider}</td><td className="numeric master-cost">{r.intelligence_index_cost?<a href={r.intelligence_index_cost.url} target="_blank" rel="noreferrer" title={`Artificial Analysis profile for ${r.intelligence_index_cost.model} · cost captured ${r.intelligence_index_cost.profile_captured_at}`}>{costFormatter.format(r.intelligence_index_cost.cost_usd)}</a>:<span className="muted">—</span>}</td><td className="numeric master-aggregate">{aggregate?<span title={`Average of ${aggregate.count} of 9 available source ranks`} aria-label={`${aggregate.score.toFixed(1)} average rank based on ${aggregate.count} of 9 dimensions`}>{aggregate.score.toFixed(1)}<small>{aggregate.count}/9 dims</small></span>:<span className="muted" title="No source rank in any of the nine aggregate dimensions">—</span>}</td>{orderedEvaluations.map(e=>{const c=r.cells[e.id];const label=masterEvaluationLabel(e);return <td key={e.id} className="numeric">{c?<Link className="source-rank" href={c.href} title={c.entry.scoring_status??"Original source rank"} aria-label={`${r.model}, ${label}, original source rank ${c.entry.source_rank}`}>#{c.entry.source_rank}</Link>:<span className="muted">Not ranked</span>}</td>;})}</tr>;})}{!sorted.length&&<tr><td className="empty" colSpan={orderedEvaluations.length+4}>No models match these filters.</td></tr>}</tbody></Table></TableScroll>
    <Pagination page={page} pages={pages} onPageChange={nextPage=>update({mi:nextPage})} pageSize={size} pageSizeOptions={[25,50,100]} onPageSizeChange={nextSize=>update({mz:nextSize})}/>
  </Card>;
}
