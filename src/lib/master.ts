import { z } from "zod";
import { entrySchema, type Entry, type Evaluation } from "./contract";

export const masterRowSchema=z.object({model_id:z.string(),provider:z.string(),model:z.string(),cells:z.record(z.string(),z.object({entry:entrySchema,href:z.string()})),source_rank:z.number(),source_entries:z.array(entrySchema)});
export type MasterRow=z.infer<typeof masterRowSchema>;
export type MasterTableRow=Omit<MasterRow,"source_entries"|"cells"> & {cells:Record<string,{entry:Pick<Entry,"source_rank"|"scoring_status">;href:string}>};
export function masterTableRows(rows:MasterRow[]):MasterTableRow[]{return rows.map(({source_entries,cells,...row})=>({...row,cells:Object.fromEntries(Object.entries(cells).map(([id,c])=>[id,{...c,entry:{source_rank:c.entry.source_rank,scoring_status:c.entry.scoring_status}}]))}));}
export function evaluationLink(e:Evaluation,model:string){return `/leaderboards/${e.slug}?q=${encodeURIComponent(model)}`;}

// Evaluation sheets use different labels for the same reasoning/fallback variant.
// Normalize only those known formatting differences; keep the model and variant
// configuration in the identity so effort levels never get merged together.
export function masterIdentityKey(provider:string,model:string){
  const canonicalModel=model.toLowerCase()
    .replace(/\(adaptive reasoning,\s*(max|xhigh|high|medium|low) effort,\s*default fallback\)/g,"($1 with fallback)")
    .replace(/\(adaptive reasoning,\s*(max|xhigh|high|medium|low) effort\)/g,"($1)")
    .replace(/\(reasoning,\s*(max|xhigh|high|medium|low) effort\)/g,"($1)")
    .replace(/\(non-reasoning,\s*(max|xhigh|high|medium|low) effort\)/g,"(non-reasoning, $1)")
    .replace(/\s+/g," ").trim();
  return `${provider.toLowerCase().replace(/\s+/g," ").trim()}\u0000${canonicalModel}`;
}

export function aggregateMaster(evaluations:Evaluation[],entries:Entry[]){
  const rows=new Map<string,MasterRow>();
  const issues:{sheet:string;message:string;severity:string}[]=[];
  for(const e of evaluations){
    for(const entry of entries.filter(x=>x.evaluation_id===e.id).sort((a,b)=>a.source_rank-b.source_rank||a.source_row-b.source_row||a.id.localeCompare(b.id))){
      const identity=masterIdentityKey(entry.provider,entry.model);
      let row=rows.get(identity);
      if(!row){row={model_id:entry.model_id,provider:entry.provider,model:entry.model,cells:{},source_rank:entry.source_rank,source_entries:[]};rows.set(identity,row);}
      row.source_entries.push(entry);row.source_rank=Math.min(row.source_rank,entry.source_rank);
      if(row.cells[e.id]){issues.push({sheet:e.display_name,message:`Duplicate ${entry.model_id}: retained row ${row.cells[e.id].entry.source_row}; discarded row ${entry.source_row}`,severity:"warning"});continue;}
      row.cells[e.id]={entry,href:evaluationLink(e,entry.model)};
    }
  }
  return {rows:sortMaster([...rows.values()],"model","asc"),issues};
}

export function sortMaster<T extends MasterTableRow>(rows:T[],sort:string,direction:string){return [...rows].sort((a,b)=>{
  const value=(r:T)=>sort==="model"?r.model:sort==="provider"?r.provider:r.cells[sort]?.entry.source_rank??null;
  const av=value(a),bv=value(b);
  if(av===null&&bv!==null)return 1;if(bv===null&&av!==null)return -1;
  const comparison=av===null||bv===null?0:typeof av==="number"&&typeof bv==="number"?av-bv:String(av).localeCompare(String(bv));
  return comparison*(direction==="asc"?1:-1)||a.source_rank-b.source_rank||a.model.localeCompare(b.model)||a.provider.localeCompare(b.provider)||a.model_id.localeCompare(b.model_id);
});}
