"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {usePathname,useRouter,useSearchParams} from "next/navigation";
import {flexRender,getCoreRowModel,useReactTable,type ColumnDef} from "@tanstack/react-table";
import {parseQueryParams,type Entry,type Evaluation,type IntelligenceIndexTaskCost} from "@/lib/contract";
import {matchesModelSearch,parseModelSearchTerms} from "@/lib/model-search";
import {ProviderMultiSelect,providerSelectionLabel} from "@/components/ui/provider-multi-select";
import {Button, Card, HelperText, Input, Pagination, Table, TableScroll} from "@/components/ui/primitives";
const dateValue=(label:string|null)=>{if(!label)return null;const date=Date.parse(label);return Number.isNaN(date)?null:date;};
const costFormatter=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2});

function LeaderboardModelSearch({value,onCommit}:{value:string;onCommit:(value:string)=>void}){
  const [draft,setDraft]=useState(value);
  useEffect(()=>setDraft(value),[value]);
  useEffect(()=>{
    const next=draft.slice(0,200);
    if(next===value)return;
    const timer=window.setTimeout(()=>onCommit(next),300);
    return()=>window.clearTimeout(timer);
  },[draft,value,onCommit]);
  return <div className="toolbar-model-search"><label className="sr-only" htmlFor="model-search">Search model names</label><Input id="model-search" aria-describedby="model-search-help" placeholder="Search model names…" value={draft} onChange={event=>setDraft(event.target.value.slice(0,200))}/><HelperText id="model-search-help">Separate keywords with commas, e.g. sol, haiku.</HelperText></div>;
}

export default function Leaderboard({entries,evaluation,taskCosts}:{entries:Entry[];evaluation:Evaluation;taskCosts:Record<string,IntelligenceIndexTaskCost>}){
  const router=useRouter(),pathname=usePathname(),params=useSearchParams();
  const state=parseQueryParams(params);
  const update=(values:Record<string,string|number|string[]>,history:"push"|"replace"="replace")=>{const next=new URLSearchParams(params.toString());next.set("page","1");for(const [key,value]of Object.entries(values)){next.delete(key);if(Array.isArray(value))value.forEach(item=>{if(item)next.append(key,item);});else if(value!=="")next.set(key,String(value));}const href=`${pathname}?${next.toString()}`;if(history==="push")router.push(href,{scroll:false});else router.replace(href,{scroll:false});};
  const [searchTerm,setSearchTerm]=useState(state.q);
  useEffect(()=>setSearchTerm(state.q),[state.q]);
  const commitSearch=useCallback((value:string)=>{
    setSearchTerm(value);
    const next=new URLSearchParams(window.location.search);
    next.set("page","1");
    if(value)next.set("q",value);else next.delete("q");
    window.history.replaceState(null,"",`${pathname}?${next.toString()}${window.location.hash}`);
  },[pathname]);
  const allowedSort=state.sort==="release_date_label"&&!evaluation.has_release_date||state.sort==="confidence_interval_display"&&!evaluation.has_confidence_interval?"source_rank":state.sort;
  const selectedProviderSet=useMemo(()=>new Set(state.provider),[state.provider]);
  const searchTerms=useMemo(()=>parseModelSearchTerms(searchTerm),[searchTerm]);
  const filtered=useMemo(()=>entries.filter(e=>(!selectedProviderSet.size||selectedProviderSet.has(e.provider))&&matchesModelSearch(e.model,searchTerms)),[entries,selectedProviderSet,searchTerms]);
  const sorted=useMemo(()=>[...filtered].sort((a,b)=>{
    const value=(e:Entry):string|number|null=>allowedSort==="release_date_label"?dateValue(e.release_date_label):allowedSort==="confidence_interval_display"?e.confidence_interval_high_delta:allowedSort==="cost_usd"?taskCosts[e.id]?.cost_usd??null:e[allowedSort];
    const av=value(a),bv=value(b);if(av===null&&bv!==null)return 1;if(bv===null&&av!==null)return -1;
    let comparison=av===null||bv===null?0:typeof av==="number"&&typeof bv==="number"?av-bv:String(av).localeCompare(String(bv));
    comparison*=state.direction==="desc"?-1:1;
    if(comparison)return comparison;
    if(allowedSort==="source_rank")return a.source_row-b.source_row;
    return a.source_rank-b.source_rank||a.model.localeCompare(b.model)||a.source_row-b.source_row;
  }),[filtered,allowedSort,state.direction,taskCosts]);
  const pages=Math.max(1,Math.ceil(sorted.length/state.size)),page=Math.min(state.page,pages);
  const rows=useMemo(()=>sorted.slice((page-1)*state.size,page*state.size),[sorted,page,state.size]);
  const columns=useMemo<ColumnDef<Entry>[]>(()=>[
    {accessorKey:"source_rank",header:"Rank"},{accessorKey:"provider",header:"Provider"},{accessorKey:"model",header:"Model"},
    {accessorKey:"score_value",header:evaluation.metric_label,cell:({row})=>row.original.score_display},
    ...(evaluation.has_scoring_status?[{id:"scoring_status",header:"Scoring status",cell:({row}:{row:{original:Entry}})=>row.original.scoring_status||"—"}]:[]),
    ...(evaluation.has_confidence_interval?[{accessorKey:"confidence_interval_display",header:"Elo CI",cell:({row}:{row:{original:Entry}})=>row.original.confidence_interval_display||"—"}]:[]),
    ...(evaluation.has_release_date?[{accessorKey:"release_date_label",header:"Release date",cell:({row}:{row:{original:Entry}})=>row.original.release_date_label||"—"}]:[]),
    {id:"cost_usd",accessorFn:entry=>taskCosts[entry.id]?.cost_usd??null,header:"Cost per Intelligence Index task",cell:({row}:{row:{original:Entry}})=>{const cost=taskCosts[row.original.id];return cost?<a href={cost.url} target="_blank" rel="noreferrer" title={`Artificial Analysis profile for ${cost.model} · cost captured ${cost.profile_captured_at}`}>{costFormatter.format(cost.cost_usd)}</a>:"—";}}
  ],[evaluation,taskCosts]);
  const table=useReactTable({data:rows,columns,getCoreRowModel:getCoreRowModel(),manualPagination:true,autoResetPageIndex:false});
  const providers=[...new Set(entries.map(e=>e.provider))].sort();
  return <Card><div className="toolbar filter-toolbar"><LeaderboardModelSearch value={searchTerm} onCommit={commitSearch}/><label className="sr-only" htmlFor="provider">Provider</label><ProviderMultiSelect id="provider" label="Provider" providers={providers} selected={state.provider} onChange={selected=>update({provider:selected},"push")}/><Button size="compact" variant="quiet" onClick={()=>router.replace(pathname,{scroll:false})}>Clear filters</Button></div><p aria-live="polite">{sorted.length.toLocaleString()} results{state.provider.length?` · ${providerSelectionLabel(state.provider)}`:""}</p><TableScroll label={`${evaluation.display_name} source rankings, scroll horizontally for all columns`}><Table><caption className="sr-only">{evaluation.display_name} source rankings</caption><thead>{table.getHeaderGroups().map(group=><tr key={group.id}>{group.headers.map(header=><th key={header.id} scope="col" className={["source_rank","score_value","cost_usd"].includes(header.id)?"numeric":""} aria-sort={allowedSort===header.id?(state.direction==="asc"?"ascending":"descending"):"none"}><Button variant="quiet" size="compact" disabled={header.id==="scoring_status"} onClick={()=>update({sort:header.id,direction:allowedSort===header.id&&state.direction==="asc"?"desc":"asc"})}>{flexRender(header.column.columnDef.header,header.getContext())} {allowedSort===header.id?(state.direction==="asc"?"↑":"↓"):header.id==="scoring_status"?"":"↕"}</Button></th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map(row=><tr key={row.original.id}>{row.getVisibleCells().map(cell=><td key={cell.id} className={cell.column.id==="model"?"model":["source_rank","score_value","cost_usd"].includes(cell.column.id)?"numeric":""}>{flexRender(cell.column.columnDef.cell,cell.getContext())}</td>)}</tr>)}{rows.length===0&&<tr><td colSpan={columns.length} className="empty">No models match these filters. Clear filters to see all entries.</td></tr>}</tbody></Table></TableScroll><Pagination page={page} pages={pages} onPageChange={nextPage=>update({page:nextPage})} pageSize={state.size} pageSizeOptions={[25,50,100,250]} onPageSizeChange={nextSize=>update({size:nextSize})}/></Card>;
}
