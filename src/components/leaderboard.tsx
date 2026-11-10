"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {usePathname,useRouter,useSearchParams} from "next/navigation";
import {flexRender,getCoreRowModel,useReactTable,type ColumnDef} from "@tanstack/react-table";
import {parseQueryParams,type Entry,type Evaluation,type IntelligenceIndexTaskCost} from "@/lib/contract";
import {matchesModelSearch,parseModelSearchTerms} from "@/lib/model-search";
import {evaluationScoreDisplay} from "@/lib/evaluation-display";
import {evaluationTimePerTask,evaluationTimePerTaskLabel,formatFirstAnswer,formatTimePerTask,modelSpeedCaptureLabel,type ModelSpeed} from "@/lib/model-speed";
import {ProviderMultiSelect,providerSelectionLabel} from "@/components/ui/provider-multi-select";
import {Button, Card, HelperText, Input, Pagination, Select, Table, TableScroll} from "@/components/ui/primitives";
const dateValue=(label:string|null)=>{if(!label)return null;const date=Date.parse(label);return Number.isNaN(date)?null:date;};
const costFormatter=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2});
const numericColumns=["source_rank","score_value","cost_usd","time_per_task","first_answer"];
const speedColumns=["time_per_task","first_answer"];
const columnOrder=["model","score_value","cost_usd","time_per_task","first_answer","source_rank","provider","scoring_status","confidence_interval_display","release_date_label"];
const columnWidths:Record<string,number>={model:240,score_value:120,cost_usd:176,time_per_task:208,first_answer:160,source_rank:72,provider:112,scoring_status:160,confidence_interval_display:160,release_date_label:112};
const columnId=(column:ColumnDef<Entry>)=>column.id??("accessorKey" in column?String(column.accessorKey):"");

function SpeedValue({speed,seconds,format}:{speed:ModelSpeed|undefined;seconds:number|null;format:(seconds:number|null)=>string}){
  return speed&&seconds!==null?<a href={speed.url} target="_blank" rel="noreferrer" title={`Artificial Analysis profile for ${speed.model} · speed captured ${speed.captured_at}`}>{format(seconds)}</a>:"—";
}

function EvaluationCard({entry,evaluation,speed,cost}:{entry:Entry;evaluation:Evaluation;speed:ModelSpeed|undefined;cost:IntelligenceIndexTaskCost|undefined}){
  return <li className="master-card evaluation-card" data-model={entry.model} data-provider={entry.provider}>
    <div className="evaluation-card__head">
      <strong>#{entry.source_rank} {entry.model}</strong>
      <small>{entry.provider} · {evaluation.metric_label}: {evaluationScoreDisplay(evaluation,entry)}</small>
    </div>
    <dl className="master-card__metrics">
      <div><dt>{evaluationTimePerTaskLabel(evaluation.id)} (min)</dt><dd><SpeedValue speed={speed} seconds={evaluationTimePerTask(evaluation.id,speed)} format={formatTimePerTask}/></dd></div>
      <div><dt>First Answer (s)</dt><dd><SpeedValue speed={speed} seconds={speed?.first_answer_s??null} format={formatFirstAnswer}/></dd></div>
      <div><dt>Cost / Index task</dt><dd>{cost?<a href={cost.url} target="_blank" rel="noreferrer">{costFormatter.format(cost.cost_usd)}</a>:"—"}</dd></div>
      {evaluation.has_release_date&&<div><dt>Release date</dt><dd>{entry.release_date_label||"—"}</dd></div>}
    </dl>
    {evaluation.has_confidence_interval&&<p className="evaluation-card__interval">Elo CI: {entry.confidence_interval_display||"—"}</p>}
    {entry.scoring_status&&<p>{entry.scoring_status}</p>}
  </li>;
}

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

export default function Leaderboard({entries,evaluation,taskCosts,speeds}:{entries:Entry[];evaluation:Evaluation;taskCosts:Record<string,IntelligenceIndexTaskCost>;speeds:Record<string,ModelSpeed>}){
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
    const value=(e:Entry):string|number|null=>allowedSort==="release_date_label"?dateValue(e.release_date_label):allowedSort==="confidence_interval_display"?e.confidence_interval_high_delta:allowedSort==="cost_usd"?taskCosts[e.id]?.cost_usd??null:allowedSort==="time_per_task"?evaluationTimePerTask(evaluation.id,speeds[e.id]):allowedSort==="first_answer"?speeds[e.id]?.first_answer_s??null:e[allowedSort];
    const av=value(a),bv=value(b);if(av===null&&bv!==null)return 1;if(bv===null&&av!==null)return -1;
    let comparison=av===null||bv===null?0:typeof av==="number"&&typeof bv==="number"?av-bv:String(av).localeCompare(String(bv));
    comparison*=state.direction==="desc"?-1:1;
    if(comparison)return comparison;
    if(allowedSort==="source_rank")return a.source_row-b.source_row;
    return a.source_rank-b.source_rank||a.model.localeCompare(b.model)||a.source_row-b.source_row;
  }),[filtered,allowedSort,state.direction,taskCosts,evaluation.id,speeds]);
  const pages=Math.max(1,Math.ceil(sorted.length/state.size)),page=Math.min(state.page,pages);
  const rows=useMemo(()=>sorted.slice((page-1)*state.size,page*state.size),[sorted,page,state.size]);
  const columns=useMemo<ColumnDef<Entry>[]>(()=>{const result:ColumnDef<Entry>[]=[
    {accessorKey:"source_rank",header:"Rank"},{accessorKey:"provider",header:"Provider"},{accessorKey:"model",header:"Model"},
    {accessorKey:"score_value",header:evaluation.metric_label,cell:({row})=>evaluationScoreDisplay(evaluation,row.original)},
    ...(evaluation.has_scoring_status?[{id:"scoring_status",header:"Scoring status",cell:({row}:{row:{original:Entry}})=>row.original.scoring_status||"—"}]:[]),
    ...(evaluation.has_confidence_interval?[{accessorKey:"confidence_interval_display",header:"Elo CI",cell:({row}:{row:{original:Entry}})=>row.original.confidence_interval_display||"—"}]:[]),
    ...(evaluation.has_release_date?[{accessorKey:"release_date_label",header:"Release date",cell:({row}:{row:{original:Entry}})=>row.original.release_date_label||"—"}]:[]),
    {id:"cost_usd",accessorFn:entry=>taskCosts[entry.id]?.cost_usd??null,header:"Cost per Intelligence Index task",cell:({row}:{row:{original:Entry}})=>{const cost=taskCosts[row.original.id];return cost?<a href={cost.url} target="_blank" rel="noreferrer" title={`Artificial Analysis profile for ${cost.model} · cost captured ${cost.profile_captured_at}`}>{costFormatter.format(cost.cost_usd)}</a>:"—";}},
    {id:"time_per_task",accessorFn:entry=>evaluationTimePerTask(evaluation.id,speeds[entry.id]),header:evaluationTimePerTaskLabel(evaluation.id),cell:({row})=><SpeedValue speed={speeds[row.original.id]} seconds={evaluationTimePerTask(evaluation.id,speeds[row.original.id])} format={formatTimePerTask}/>},
    {id:"first_answer",accessorFn:entry=>speeds[entry.id]?.first_answer_s??null,header:"First Answer",cell:({row})=><SpeedValue speed={speeds[row.original.id]} seconds={speeds[row.original.id]?.first_answer_s??null} format={formatFirstAnswer}/>}
  ];return result.sort((a,b)=>columnOrder.indexOf(columnId(a))-columnOrder.indexOf(columnId(b)));},[evaluation,taskCosts,speeds]);
  const table=useReactTable({data:rows,columns,getCoreRowModel:getCoreRowModel(),manualPagination:true,autoResetPageIndex:false});
  const providers=[...new Set(entries.map(e=>e.provider))].sort();
  return <Card className="evaluation-leaderboard">
    <div className="toolbar filter-toolbar">
      <LeaderboardModelSearch value={searchTerm} onCommit={commitSearch}/>
      <label className="sr-only" htmlFor="provider">Provider</label>
      <ProviderMultiSelect id="provider" label="Provider" providers={providers} selected={state.provider} onChange={selected=>update({provider:selected},"push")}/>
      <Button size="compact" variant="quiet" onClick={()=>router.replace(pathname,{scroll:false})}>Clear filters</Button>
    </div>
    <p aria-live="polite">{sorted.length.toLocaleString()} results{state.provider.length?` · ${providerSelectionLabel(state.provider)}`:""}</p>
    <HelperText className="leaderboard-legend">— means no captured AA value. Cost is per Intelligence Index task; see the time label for its task.</HelperText>
    <div className="evaluation-mobile-sort">
      <label htmlFor="evaluation-sort">Sort by</label>
      <Select id="evaluation-sort" value={allowedSort} onChange={event=>update({sort:event.target.value,direction:"asc"})}>
        {columns.filter(column=>column.id!=="scoring_status").map(column=>{const id=column.id??("accessorKey" in column?String(column.accessorKey):"");return <option key={id} value={id}>{String(column.header)}</option>;})}
      </Select>
      <Button variant="quiet" size="compact" aria-label="Reverse sort order" onClick={()=>update({direction:state.direction==="asc"?"desc":"asc"})}>{state.direction==="asc"?"↑ Asc":"↓ Desc"}</Button>
    </div>
    <div className="evaluation-table-view">
      <p className="evaluation-scroll-hint">Scroll sideways for all columns ↔ · Model names stay visible.</p>
      <TableScroll showOverflowCue label={`${evaluation.display_name} source rankings, scroll horizontally for all columns`}>
        <Table className="evaluation-table" style={{tableLayout:"fixed",width:columns.reduce((sum,column)=>sum+columnWidths[columnId(column)],0)}}>
          <caption className="sr-only">{evaluation.display_name} source rankings</caption>
          <colgroup>{columns.map(column=><col key={columnId(column)} style={{width:columnWidths[columnId(column)]}}/>)}</colgroup>
          <thead>{table.getHeaderGroups().map(group=><tr key={group.id}>{group.headers.map(header=><th key={header.id} scope="col" className={[numericColumns.includes(header.id)?"numeric":"",speedColumns.includes(header.id)?"speed-column":"",header.id==="model"?"model":""].filter(Boolean).join(" ")} aria-sort={allowedSort===header.id?(state.direction==="asc"?"ascending":"descending"):"none"}>
            <Button variant="quiet" size="compact" disabled={header.id==="scoring_status"} onClick={()=>update({sort:header.id,direction:allowedSort===header.id&&state.direction==="asc"?"desc":"asc"})}>
              <span>{flexRender(header.column.columnDef.header,header.getContext())}{"\u00a0"}{allowedSort===header.id?(state.direction==="asc"?"↑":"↓"):header.id==="scoring_status"?"":"↕"}</span>
              {speedColumns.includes(header.id)&&<small><span>{header.id==="time_per_task"?"Minutes":"Seconds"} · AA</span><span>{modelSpeedCaptureLabel}</span></small>}
            </Button>
          </th>)}</tr>)}</thead>
          <tbody>{table.getRowModel().rows.map(row=><tr key={row.original.id}>{row.getVisibleCells().map(cell=><td key={cell.id} data-column={cell.column.id} className={cell.column.id==="model"?"model":cell.column.id==="confidence_interval_display"?"evaluation-interval":numericColumns.includes(cell.column.id)?"numeric":""}>{flexRender(cell.column.columnDef.cell,cell.getContext())}</td>)}</tr>)}
            {rows.length===0&&<tr><td colSpan={columns.length} className="empty">No models match these filters. Clear filters to see all entries.</td></tr>}
          </tbody>
        </Table>
      </TableScroll>
    </div>
    <ul className="evaluation-cards" aria-label={`${evaluation.display_name} model results`}>
      {rows.map(entry=><EvaluationCard key={entry.id} entry={entry} evaluation={evaluation} speed={speeds[entry.id]} cost={taskCosts[entry.id]}/>)}
      {rows.length===0&&<li className="empty">No models match these filters. Clear filters to see all entries.</li>}
    </ul>
    <Pagination page={page} pages={pages} onPageChange={nextPage=>update({page:nextPage})} pageSize={state.size} pageSizeOptions={[25,50,100,250]} onPageSizeChange={nextSize=>update({size:nextSize})}/>
  </Card>;
}
