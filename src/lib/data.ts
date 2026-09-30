import { readFile } from "node:fs/promises";
import { cache } from "react";
import { adminDb } from "./admin";
import type { Dataset,Entry,Evaluation } from "./contract";
import { aggregateMaster } from "./master";
const local=cache(async()=>JSON.parse(await readFile(`${process.cwd()}/data/leaderboards.json`,"utf8")) as Dataset);
export const getEvaluations=cache(async():Promise<Evaluation[]>=>{
  if(process.env.DATA_SOURCE==="firestore")return (await adminDb().collection("evaluations").get()).docs.map(d=>d.data() as Evaluation).filter(e=>!!e.published_snapshot_id).sort((a,b)=>a.display_name.localeCompare(b.display_name));
  try{return (await local()).evaluations;}catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return [];throw error;}
});
export async function getEntries(evaluation:Evaluation):Promise<Entry[]>{
  if(process.env.DATA_SOURCE==="firestore"){
    const ref=adminDb().collection("snapshots").doc(evaluation.published_snapshot_id);
    if((await ref.get()).data()?.status!=="published")throw new Error("Snapshot is unavailable");
    return (await ref.collection("entries").get()).docs.map(d=>d.data() as Entry).sort((a,b)=>a.source_rank-b.source_rank||a.source_row-b.source_row);
  }
  return (await local()).entries.filter(e=>e.evaluation_id===evaluation.id).sort((a,b)=>a.source_rank-b.source_rank||a.source_row-b.source_row);
}
export const getMasterDataset=cache(async()=>{
  const evaluations=await getEvaluations();
  const entries=(await Promise.all(evaluations.map(getEntries))).flat();
  return {evaluations,...aggregateMaster(evaluations,entries)};
});
