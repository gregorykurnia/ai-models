import { z } from "zod";
import { entrySchema, type Entry, type Evaluation, type IntelligenceIndexTaskCost } from "./contract";

export const masterRowSchema=z.object({model_id:z.string(),identity_key:z.string(),provider:z.string(),model:z.string(),cells:z.record(z.string(),z.object({entry:entrySchema,href:z.string()})),source_rank:z.number(),source_entries:z.array(entrySchema),intelligence_index_cost:z.object({slug:z.string(),provider:z.string(),model:z.string(),cost_usd:z.number().nonnegative(),url:z.string().url(),profile_captured_at:z.string().optional()}).nullable()});
export type MasterRow=z.infer<typeof masterRowSchema>;
export type MasterTableRow=Omit<MasterRow,"source_entries"|"cells"> & {cells:Record<string,{entry:Pick<Entry,"source_rank"|"scoring_status">;href:string}>};
export function masterTableRows(rows:MasterRow[]):MasterTableRow[]{return rows.map(({source_entries,cells,...row})=>({...row,cells:Object.fromEntries(Object.entries(cells).map(([id,c])=>[id,{...c,entry:{source_rank:c.entry.source_rank,scoring_status:c.entry.scoring_status}}]))}));}
export function evaluationLink(e:Evaluation,model:string){return `/leaderboards/${e.slug}?q=${encodeURIComponent(model)}`;}

const masterEvaluationOrder=[
  "aa-briefcase-analytical-quality-elo",
  "aa-omniscience-index",
  "strategy-ops-index",
  "aa-briefcase-presentation-elo",
  "terminal-bench-4-0",
  "intelligence-index",
  "aa-briefcase-rubric-score",
  "finance-accounting",
  "economics-index",
  "aa-lcr-v1-1",
  "briefcase-v1-1",
  "gdpval-aa-v2-1",
  "automationbench-aa",
  "humanity-s-last-exam",
  "critpt",
  "mmmu-pro",
  "scicode",
  "gdp-pdf",
  "aa-omniscience-accuracy",
] as const;

const masterEvaluationLabels:Record<string,string>={
  "aa-briefcase-analytical-quality-elo":"Analytical Quality Elo",
  "aa-omniscience-index":"Omniscience Index",
  "strategy-ops-index":"Strategy and Ops Index",
  "aa-briefcase-presentation-elo":"Presentation Elo",
  "terminal-bench-4-0":"Terminal Bench",
  "intelligence-index":"Intelligence Index",
  "aa-briefcase-rubric-score":"Rubric Score",
  "finance-accounting":"Finance and Accounting",
  "economics-index":"Economics",
  "aa-lcr-v1-1":"AA LCR",
};

export function orderMasterEvaluations<T extends Pick<Evaluation,"id">>(evaluations:ReadonlyArray<T>):T[]{
  const priority=new Map<string,number>(masterEvaluationOrder.map((id,index)=>[id,index]));
  return evaluations.map((evaluation,index)=>({evaluation,index})).sort((a,b)=>
    (priority.get(a.evaluation.id)??Number.MAX_SAFE_INTEGER)-(priority.get(b.evaluation.id)??Number.MAX_SAFE_INTEGER)||a.index-b.index,
  ).map(({evaluation})=>evaluation);
}

export function masterEvaluationLabel(evaluation:Pick<Evaluation,"id"|"display_name">){
  return masterEvaluationLabels[evaluation.id]??evaluation.display_name;
}

const aggregateDimensionIds=[
  "aa-briefcase-analytical-quality-elo",
  "aa-briefcase-presentation-elo",
  "aa-briefcase-rubric-score",
  "aa-omniscience-index",
  "economics-index",
  "finance-accounting",
  "intelligence-index",
  "strategy-ops-index",
  "terminal-bench-4-0",
] as const;

export function averageMasterRank(row:Pick<MasterTableRow,"cells">){
  const ranks=aggregateDimensionIds.flatMap(id=>{
    const rank=row.cells[id]?.entry.source_rank;
    return rank===undefined?[]:[rank];
  });
  return ranks.length?{score:Math.round(ranks.reduce((sum,rank)=>sum+rank,0)/ranks.length*10)/10,count:ranks.length}:null;
}

function csvCell(value:string|number|null|undefined){
  const text=value===null||value===undefined?"":String(value);
  return /[",\r\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
}

export function masterLeaderboardCsv(rows:ReadonlyArray<MasterTableRow>,evaluations:ReadonlyArray<Pick<Evaluation,"id"|"display_name">>){
  const orderedEvaluations=orderMasterEvaluations(evaluations);
  const header=["Model","Provider","Cost Per Intelligence Index Task (USD)","Aggregate Score (average rank)","Aggregate Score dimensions used (of 9)",...orderedEvaluations.map(masterEvaluationLabel)];
  const data=rows.map(row=>[
    row.model,
    row.provider,
    row.intelligence_index_cost?.cost_usd,
    averageMasterRank(row)?.score,
    averageMasterRank(row)?.count,
    ...orderedEvaluations.map(e=>row.cells[e.id]?.entry.source_rank),
  ]);
  return `\ufeff${[header,...data].map(row=>row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

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

export function aggregateMaster(evaluations:Evaluation[],entries:Entry[],intelligenceIndexCosts:ReadonlyMap<string,IntelligenceIndexTaskCost|null>=new Map()){
  const rows=new Map<string,MasterRow>();
  const issues:{sheet:string;message:string;severity:string}[]=[];
  for(const e of evaluations){
    for(const entry of entries.filter(x=>x.evaluation_id===e.id).sort((a,b)=>a.source_rank-b.source_rank||a.source_row-b.source_row||a.id.localeCompare(b.id))){
      const identity=masterIdentityKey(entry.provider,entry.model);
      let row=rows.get(identity);
      if(!row){row={model_id:entry.model_id,identity_key:identity,provider:entry.provider,model:entry.model,cells:{},source_rank:entry.source_rank,source_entries:[],intelligence_index_cost:intelligenceIndexCosts.get(identity)??intelligenceIndexCosts.get(masterIdentityKey("",entry.model))??null};rows.set(identity,row);}
      row.source_entries.push(entry);row.source_rank=Math.min(row.source_rank,entry.source_rank);
      if(row.cells[e.id]){issues.push({sheet:e.display_name,message:`Duplicate ${entry.model_id}: retained row ${row.cells[e.id].entry.source_row}; discarded row ${entry.source_row}`,severity:"warning"});continue;}
      row.cells[e.id]={entry,href:evaluationLink(e,entry.model)};
    }
  }
  return {rows:sortMaster([...rows.values()],"model","asc"),issues};
}

export function sortMaster<T extends MasterTableRow>(rows:T[],sort:string,direction:string){return [...rows].sort((a,b)=>{
  const value=(r:T)=>sort==="model"?r.model:sort==="provider"?r.provider:sort==="intelligence-index-cost"?r.intelligence_index_cost?.cost_usd??null:sort==="aggregate-score"?averageMasterRank(r)?.score??null:r.cells[sort]?.entry.source_rank??null;
  const av=value(a),bv=value(b);
  if(av===null&&bv!==null)return 1;if(bv===null&&av!==null)return -1;
  const comparison=av===null||bv===null?0:typeof av==="number"&&typeof bv==="number"?av-bv:String(av).localeCompare(String(bv));
  return comparison*(direction==="asc"?1:-1)||a.source_rank-b.source_rank||a.model.localeCompare(b.model)||a.provider.localeCompare(b.provider)||a.model_id.localeCompare(b.model_id);
});}
