import { z } from "zod";
import { entrySchema, type Entry, type Evaluation } from "./contract";

export const scoringConfigSchema = z.object({version:z.literal(1),direction:z.enum(["higher","lower"]),scale:z.enum(["bounded","excluded"]),min:z.number().nullable(),max:z.number().nullable(),include_estimates:z.boolean(),reason:z.string().nullable()});
export type ScoringConfig=z.infer<typeof scoringConfigSchema>;
// Explicit policy by score kind; bounds come exclusively from source metadata.
export const scoringPolicy = {
  percentage:{scale:"bounded",include_estimates:false},
  signed_index:{scale:"bounded",include_estimates:false},
  integer_score:{scale:"bounded",include_estimates:false},
  elo:{scale:"excluded",include_estimates:false},
} as const;
export function scoringConfig(e:Evaluation):ScoringConfig {
  const policy=scoringPolicy[e.score_kind as keyof typeof scoringPolicy];
  const reason=!policy?"Unsupported score kind":policy.scale==="excluded"?"Elo has no approved stable comparison scale":e.score_min===null||e.score_max===null||e.score_max<=e.score_min?"Missing valid source bounds":null;
  return scoringConfigSchema.parse({version:1,direction:"higher",scale:reason?"excluded":"bounded",min:e.score_min,max:e.score_max,include_estimates:policy?.include_estimates??false,reason});
}
export function normalize(entry:Entry,config:ScoringConfig){
  if(/estimat/i.test(entry.scoring_status??"")&&!config.include_estimates)return {value:null,reason:"Estimates excluded by scoring policy"};
  if(config.scale==="excluded"||config.min===null||config.max===null)return {value:null,reason:config.reason};
  if(entry.score_value<config.min||entry.score_value>config.max)return {value:null,reason:"Score outside source bounds"};
  const value=100*(entry.score_value-config.min)/(config.max-config.min);
  return {value:config.direction==="higher"?value:100-value,reason:null};
}
export const masterRowSchema=z.object({model_id:z.string(),provider:z.string(),model:z.string(),cells:z.record(z.string(),z.object({entry:entrySchema,normalized_value:z.number().nullable(),exclusion_reason:z.string().nullable(),href:z.string()})),mean_normalized_score:z.number().nullable(),mean_coverage:z.number().int().nonnegative(),source_rank:z.number(),source_entries:z.array(entrySchema)});
export type MasterRow=z.infer<typeof masterRowSchema>;
export type MasterTableRow=Omit<MasterRow,"source_entries"|"cells"> & {cells:Record<string,{entry:Pick<Entry,"score_display"|"source_rank"|"scoring_status">;normalized_value:number|null;exclusion_reason:string|null;href:string}>};
export function masterTableRows(rows:MasterRow[]):MasterTableRow[]{return rows.map(({source_entries,cells,...row})=>({...row,cells:Object.fromEntries(Object.entries(cells).map(([id,c])=>[id,{...c,entry:{score_display:c.entry.score_display,source_rank:c.entry.source_rank,scoring_status:c.entry.scoring_status}}]))}));}
export function evaluationLink(e:Evaluation,model:string){return `/leaderboards/${e.slug}?q=${encodeURIComponent(model)}`;}
export function aggregateMaster(evaluations:Evaluation[],entries:Entry[]){
  const rows=new Map<string,MasterRow>();
  const issues:{sheet:string;message:string;severity:string}[]=[];
  for(const e of evaluations){
    const config=scoringConfig(e);
    if(config.reason)issues.push({sheet:e.display_name,message:config.reason,severity:"warning"});
    for(const entry of entries.filter(x=>x.evaluation_id===e.id).sort((a,b)=>a.source_rank-b.source_rank||a.source_row-b.source_row||a.id.localeCompare(b.id))){
      let row=rows.get(entry.model_id);
      if(!row){row={model_id:entry.model_id,provider:entry.provider,model:entry.model,cells:{},mean_normalized_score:null,mean_coverage:0,source_rank:entry.source_rank,source_entries:[]};rows.set(entry.model_id,row);}
      row.source_entries.push(entry);row.source_rank=Math.min(row.source_rank,entry.source_rank);
      if(row.cells[e.id]){issues.push({sheet:e.display_name,message:`Duplicate ${entry.model_id}: retained row ${row.cells[e.id].entry.source_row}; discarded row ${entry.source_row}`,severity:"warning"});continue;}
      const result=normalize(entry,config);
      row.cells[e.id]={entry,normalized_value:result.value,exclusion_reason:result.reason,href:evaluationLink(e,entry.model)};
      if(result.reason&&!config.reason)issues.push({sheet:e.display_name,message:`Row ${entry.source_row}: ${result.reason}`,severity:"warning"});
    }
  }
  for(const row of rows.values()){
    const values=Object.values(row.cells).flatMap(c=>c.normalized_value===null?[]:[c.normalized_value]);
    row.mean_coverage=values.length;row.mean_normalized_score=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
    if(values.length<3)issues.push({sheet:"Master",message:`${row.model_id}: low comparable coverage (${values.length}/${evaluations.length})`,severity:"warning"});
  }
  return {rows:sortMaster([...rows.values()],"mean","desc"),issues,configs:Object.fromEntries(evaluations.map(e=>[e.id,scoringConfig(e)]))};
}
export function sortMaster<T extends MasterTableRow>(rows:T[],sort:string,direction:string){return [...rows].sort((a,b)=>{
  const value=(r:T)=>sort==="mean"?r.mean_normalized_score:sort==="model"?r.model:sort==="provider"?r.provider:r.cells[sort]?.normalized_value??null;
  const av=value(a),bv=value(b);
  if(av===null&&bv!==null)return 1;if(bv===null&&av!==null)return -1;
  const comparison=av===null||bv===null?0:typeof av==="number"&&typeof bv==="number"?av-bv:String(av).localeCompare(String(bv));
  return comparison*(direction==="asc"?1:-1)||a.source_rank-b.source_rank||a.model.localeCompare(b.model)||a.provider.localeCompare(b.provider)||a.model_id.localeCompare(b.model_id);
});}
