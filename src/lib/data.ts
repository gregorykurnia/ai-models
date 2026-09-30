import { readFile } from "node:fs/promises";
import { cache } from "react";
import aaBriefcaseComponents from "../../data/aa-briefcase-components.json";
import { adminDb } from "./admin";
import type { Dataset,Entry,Evaluation } from "./contract";
import { briefcaseComponentDataset,mergeBriefcaseComponents,type BriefcaseComponentsSource } from "./aa-briefcase";
import { aggregateMaster } from "./master";
const componentSource=aaBriefcaseComponents as unknown as BriefcaseComponentsSource;
const localComponents=cache(async()=>briefcaseComponentDataset(componentSource));
const local=cache(async()=>{
  const dataset=await readFile(`${process.cwd()}/data/leaderboards.json`,"utf8");
  return mergeBriefcaseComponents(JSON.parse(dataset) as Dataset,componentSource);
});
export const getEvaluations=cache(async():Promise<Evaluation[]>=>{
  if(process.env.DATA_SOURCE==="firestore"){
    const published=(await adminDb().collection("evaluations").get()).docs.map(d=>d.data() as Evaluation).filter(e=>!!e.published_snapshot_id);
    const byId=new Map(published.map(evaluation=>[evaluation.id,evaluation]));
    try{
      for(const evaluation of (await localComponents()).evaluations.filter(item=>item.metric_group==="aa-briefcase-components")){
        if(!byId.has(evaluation.id))byId.set(evaluation.id,evaluation);
      }
    }catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
    return [...byId.values()].sort((a,b)=>a.display_name.localeCompare(b.display_name));
  }
  try{return (await local()).evaluations;}catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return [];throw error;}
});
export async function getEntries(evaluation:Evaluation):Promise<Entry[]>{
  if(process.env.DATA_SOURCE==="firestore"){
    const ref=adminDb().collection("snapshots").doc(evaluation.published_snapshot_id);
    if((await ref.get()).data()?.status!=="published"){
      if(evaluation.metric_group==="aa-briefcase-components")return (await localComponents()).entries.filter(entry=>entry.evaluation_id===evaluation.id).sort((a,b)=>a.source_rank-b.source_rank||a.source_row-b.source_row);
      throw new Error("Snapshot is unavailable");
    }
    return (await ref.collection("entries").get()).docs.map(d=>d.data() as Entry).sort((a,b)=>a.source_rank-b.source_rank||a.source_row-b.source_row);
  }
  return (await local()).entries.filter(e=>e.evaluation_id===evaluation.id).sort((a,b)=>a.source_rank-b.source_rank||a.source_row-b.source_row);
}
export const getMasterDataset=cache(async()=>{
  const evaluations=await getEvaluations();
  const entries=(await Promise.all(evaluations.map(getEntries))).flat();
  return {evaluations,...aggregateMaster(evaluations,entries)};
});
