import { adminDb } from "../src/lib/admin";
import type { Dataset } from "../src/lib/contract";
export async function publish(data:Dataset){
  const db=adminDb(),run=db.collection("ingestionRuns").doc();
  await run.set({source_asset_id:data.sourceAsset.id,started_at:new Date().toISOString(),status:"started",accepted_rows:data.entries.length});
  try{
    for(const sourceAsset of [data.sourceAsset,...(data.sourceAssets??[])])await db.collection("sourceAssets").doc(String(sourceAsset.id)).create(sourceAsset).catch(e=>{if(e.code!==6)throw e;});
    for(const issue of data.issues)await db.collection("ingestionIssues").doc().set({...issue,run_id:run.id});
    for(const collection of ["providers","models"] as const){for(let start=0;start<data[collection].length;start+=400){const batch=db.batch();for(const record of data[collection].slice(start,start+400))batch.set(db.collection(collection).doc(String(record.id)),record,{merge:true});await batch.commit();}}
    for(const snapshot of data.snapshots){
      const ref=db.collection("snapshots").doc(String(snapshot.id));
      if((await ref.get()).data()?.status==="published")continue;
      await ref.set({...snapshot,status:"importing"});
      const entries=data.entries.filter(e=>e.snapshot_id===snapshot.id);
      for(let start=0;start<entries.length;start+=400){const batch=db.batch();for(const entry of entries.slice(start,start+400))batch.set(ref.collection("entries").doc(entry.id),entry);await batch.commit();}
      if((await ref.collection("entries").count().get()).data().count!==entries.length)throw new Error(`Incomplete snapshot ${snapshot.id}`);
      await ref.update({status:"validated"});
    }
    // Publish every evaluation pointer atomically only after all entries are durable.
    await db.runTransaction(async tx=>{
      const current=await tx.getAll(...data.evaluations.map(e=>db.collection("evaluations").doc(e.id)));
      if(current.some((doc,index)=>doc.exists&&String(doc.data()?.captured_at)>String(data.evaluations[index].captured_at)))throw new Error("An older capture cannot replace a newer published snapshot");
      for(const evaluation of data.evaluations){tx.set(db.collection("evaluations").doc(evaluation.id),evaluation);tx.update(db.collection("snapshots").doc(evaluation.published_snapshot_id),{status:"published"});}
      tx.update(run,{status:"published",completed_at:new Date().toISOString()});
    });
    console.log("Published all evaluation snapshots.");
  }catch(error){await run.update({status:"failed",error:error instanceof Error?error.message:String(error)});throw error;}
}
