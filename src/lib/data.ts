import { cache } from "react";
import { unstable_cache } from "next/cache";
import leaderboardSource from "../../data/leaderboards.json";
import aaBriefcaseComponents from "../../data/aa-briefcase-components.json";
import { adminDb } from "./admin";
import type { Dataset,Entry,Evaluation } from "./contract";
import { briefcaseComponentDataset,mergeBriefcaseComponents,type BriefcaseComponentsSource } from "./aa-briefcase";
import { aggregateMaster } from "./master";
import { getIntelligenceIndexTaskCostMap,intelligenceIndexCostCapturedAt } from "./intelligence-index-costs";
const componentSource=aaBriefcaseComponents as unknown as BriefcaseComponentsSource;
const localComponents=cache(async()=>briefcaseComponentDataset(componentSource));
const local=cache(async()=>mergeBriefcaseComponents(leaderboardSource as unknown as Dataset,componentSource));
const publishedEvaluations=unstable_cache(async()=>
  (await adminDb().collection("evaluations").get()).docs.map(d=>d.data() as Evaluation).filter(e=>!!e.published_snapshot_id),
  ["published-evaluations"],{revalidate:300});
const remoteEntries=unstable_cache(async(snapshotId:string)=>{
  const ref=adminDb().collection("snapshots").doc(snapshotId);
  if((await ref.get()).data()?.status!=="published")throw new Error("Snapshot is unavailable");
  return (await ref.collection("entries").get()).docs.map(d=>d.data() as Entry).sort((a,b)=>a.source_rank-b.source_rank||a.source_row-b.source_row);
},["published-snapshot-entries"],{revalidate:false});
export const getEvaluations=cache(async():Promise<Evaluation[]>=>{
  if(process.env.DATA_SOURCE==="firestore"){
    let published:Evaluation[];
    try{published=await publishedEvaluations();}
    catch(error){
      const code=(error as {code?:number}).code;
      if(![4,8,14].includes(code??-1))throw error;
      console.warn("Firestore catalog temporarily unavailable; serving bundled published snapshots",{code});
      return (await local()).evaluations;
    }
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
    const bundled=await local();
    if(bundled.evaluations.some(item=>item.id===evaluation.id&&item.published_snapshot_id===evaluation.published_snapshot_id))
      return bundled.entries.filter(entry=>entry.evaluation_id===evaluation.id&&entry.snapshot_id===evaluation.published_snapshot_id).sort((a,b)=>a.source_rank-b.source_rank||a.source_row-b.source_row);
    return remoteEntries(evaluation.published_snapshot_id);
  }
  return (await local()).entries.filter(e=>e.evaluation_id===evaluation.id).sort((a,b)=>a.source_rank-b.source_rank||a.source_row-b.source_row);
}
export const getPublishedDataset=cache(async()=>{
  try{
    const evaluations=await getEvaluations();
    const entries=(await Promise.all(evaluations.map(getEntries))).flat();
    return {evaluations,entries};
  }catch(error){
    if(![4,8,14].includes((error as {code?:number}).code??-1))throw error;
    console.warn("Firestore snapshot temporarily unavailable; serving complete bundled dataset");
    const bundled=await local();
    return {evaluations:bundled.evaluations,entries:bundled.entries};
  }
});
export const getEvaluationDataset=cache(async(slug:string)=>{
  const evaluations=await getEvaluations();
  const evaluation=evaluations.find(item=>item.slug===slug);
  if(!evaluation)return null;
  try{return {evaluations,evaluation,entries:await getEntries(evaluation)};}
  catch(error){
    if(![4,8,14].includes((error as {code?:number}).code??-1))throw error;
    const bundled=await local();
    const fallback=bundled.evaluations.find(item=>item.slug===slug);
    if(!fallback)throw error;
    return {evaluations:bundled.evaluations,evaluation:fallback,entries:bundled.entries.filter(entry=>entry.evaluation_id===fallback.id&&entry.snapshot_id===fallback.published_snapshot_id)};
  }
});
export const getMasterDataset=cache(async()=>{
  const {evaluations,entries}=await getPublishedDataset();
  return {evaluations,...aggregateMaster(evaluations,entries,getIntelligenceIndexTaskCostMap()),intelligenceIndexCostCapturedAt};
});
