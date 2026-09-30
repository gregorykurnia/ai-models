"use client";
import {useMemo} from "react";
import {usePathname,useRouter,useSearchParams} from "next/navigation";
import {flexRender,getCoreRowModel,useReactTable,type ColumnDef} from "@tanstack/react-table";
import {querySchema,type Entry,type Evaluation} from "@/lib/contract";
const dateValue=(label:string|null)=>{if(!label)return null;const date=Date.parse(label);return Number.isNaN(date)?null:date;};
export default function Leaderboard({entries,evaluation}:{entries:Entry[];evaluation:Evaluation}){
  const router=useRouter(),pathname=usePathname(),params=useSearchParams();
  const state=querySchema.parse(Object.fromEntries(params.entries()));
  const update=(values:Record<string,string|number>)=>{const next=new URLSearchParams(params.toString());next.set("page","1");for(const [key,value]of Object.entries(values)){if(value==="")next.delete(key);else next.set(key,String(value));}router.replace(`${pathname}?${next.toString()}`,{scroll:false});};
  const allowedSort=state.sort==="release_date_label"&&!evaluation.has_release_date||state.sort==="confidence_interval_display"&&!evaluation.has_confidence_interval||state.sort==="cost_usd"&&!evaluation.cost_label_count?"source_rank":state.sort;
  const filtered=useMemo(()=>entries.filter(e=>(!state.provider||e.provider===state.provider)&&e.model.toLowerCase().includes(state.q.toLowerCase())),[entries,state.provider,state.q]);
  const sorted=useMemo(()=>[...filtered].sort((a,b)=>{
    const value=(e:Entry):string|number|null=>allowedSort==="release_date_label"?dateValue(e.release_date_label):allowedSort==="confidence_interval_display"?e.confidence_interval_high_delta:e[allowedSort];
    const av=value(a),bv=value(b);if(av===null&&bv!==null)return 1;if(bv===null&&av!==null)return -1;
    let comparison=av===null||bv===null?0:typeof av==="number"&&typeof bv==="number"?av-bv:String(av).localeCompare(String(bv));
    comparison*=state.direction==="desc"?-1:1;
    if(comparison)return comparison;
    if(allowedSort==="source_rank")return a.source_row-b.source_row;
    return a.source_rank-b.source_rank||a.model.localeCompare(b.model)||a.source_row-b.source_row;
  }),[filtered,allowedSort,state.direction]);
  const pages=Math.max(1,Math.ceil(sorted.length/state.size)),page=Math.min(state.page,pages),rows=sorted.slice((page-1)*state.size,page*state.size);
  const columns=useMemo<ColumnDef<Entry>[]>(()=>[
    {accessorKey:"source_rank",header:"Rank"},{accessorKey:"provider",header:"Provider"},{accessorKey:"model",header:"Model"},
    {accessorKey:"score_value",header:evaluation.metric_label,cell:({row})=>row.original.score_display},
    ...(evaluation.has_scoring_status?[{id:"scoring_status",header:"Scoring status",cell:({row}:{row:{original:Entry}})=>row.original.scoring_status||"—"}]:[]),
    ...(evaluation.has_confidence_interval?[{accessorKey:"confidence_interval_display",header:"Elo CI",cell:({row}:{row:{original:Entry}})=>row.original.confidence_interval_display||"—"}]:[]),
    ...(evaluation.has_release_date?[{accessorKey:"release_date_label",header:"Release date",cell:({row}:{row:{original:Entry}})=>row.original.release_date_label||"—"}]:[]),
    ...(evaluation.cost_label_count?[{accessorKey:"cost_usd",header:"Cost per task",cell:({row}:{row:{original:Entry}})=>row.original.cost_display??(row.original.cost_usd===null?"—":`$${row.original.cost_usd}`)}]:[])
  ],[evaluation]);
  const table=useReactTable({data:rows,columns,getCoreRowModel:getCoreRowModel()});
  const providers=[...new Set(entries.map(e=>e.provider))].sort();
  return <section className="panel"><div className="toolbar"><label className="sr-only" htmlFor="model-search">Search model names</label><input id="model-search" placeholder="Search model names…" value={state.q} onChange={e=>update({q:e.target.value})}/><label className="sr-only" htmlFor="provider">Provider</label><select id="provider" value={state.provider} onChange={e=>update({provider:e.target.value})}><option value="">All providers</option>{providers.map(p=><option key={p}>{p}</option>)}</select><button onClick={()=>router.replace(pathname,{scroll:false})}>Clear filters</button></div><p aria-live="polite">{sorted.length.toLocaleString()} results{state.provider?` · ${state.provider}`:""}</p><div className="table-scroll"><table><caption className="sr-only">{evaluation.display_name} source rankings</caption><thead>{table.getHeaderGroups().map(group=><tr key={group.id}>{group.headers.map(header=><th key={header.id} scope="col" className={["source_rank","score_value","cost_usd"].includes(header.id)?"numeric":""} aria-sort={allowedSort===header.id?(state.direction==="asc"?"ascending":"descending"):"none"}><button disabled={header.id==="scoring_status"} onClick={()=>update({sort:header.id,direction:allowedSort===header.id&&state.direction==="asc"?"desc":"asc"})}>{flexRender(header.column.columnDef.header,header.getContext())} {allowedSort===header.id?(state.direction==="asc"?"↑":"↓"):header.id==="scoring_status"?"":"↕"}</button></th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map(row=><tr key={row.original.id}>{row.getVisibleCells().map(cell=><td key={cell.id} className={cell.column.id==="model"?"model":["source_rank","score_value","cost_usd"].includes(cell.column.id)?"numeric":""}>{flexRender(cell.column.columnDef.cell,cell.getContext())}</td>)}</tr>)}{rows.length===0&&<tr><td colSpan={columns.length} className="empty">No models match these filters. Clear filters to see all entries.</td></tr>}</tbody></table></div><div className="pager"><label>Rows per page <select value={state.size} onChange={e=>update({size:Number(e.target.value)})}>{[25,50,100,250].map(n=><option key={n} value={n}>{n}</option>)}</select></label><div><span>Page {page} of {pages}</span><button disabled={page===1} onClick={()=>update({page:page-1})}>Previous</button><button disabled={page===pages} onClick={()=>update({page:page+1})}>Next</button></div></div></section>;
}
