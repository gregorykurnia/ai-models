import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {aggregateMaster,normalize,scoringConfig,sortMaster,masterRowSchema,masterTableRows} from "../src/lib/master";
import type {Dataset,Entry} from "../src/lib/contract";
const d=JSON.parse(await readFile("data/leaderboards.json","utf8")) as Dataset;
const percentage=d.evaluations.find(e=>e.score_kind==="percentage")!;
const signed=d.evaluations.find(e=>e.score_kind==="signed_index")!;
const base=d.entries.find(e=>e.evaluation_id===percentage.id)!;
const entry=(changes:Partial<Entry>)=>({...base,...changes});
assert.equal(normalize(entry({score_value:50}),scoringConfig(percentage)).value,50);
assert.equal(normalize(entry({score_value:-50}),scoringConfig(signed)).value,25);
assert.equal(normalize(entry({scoring_status:"Estimated"}),scoringConfig(percentage)).value,null);
assert.equal(normalize(entry({score_value:101}),scoringConfig(percentage)).value,null);
for(const e of d.evaluations.filter(e=>e.score_kind==="elo"||e.score_min===null))assert.equal(normalize(base,scoringConfig(e)).value,null);
const second={...percentage,id:"fixture-2",slug:"fixture-2"};
const fixture=aggregateMaster([percentage,second],[entry({score_value:50}),entry({evaluation_id:second.id,score_value:100,id:"second"}),entry({source_rank:base.source_rank+1,id:"duplicate",score_value:1}),entry({model_id:"partial",model:"Partial",score_value:50}),entry({model_id:"estimate",scoring_status:"Estimated"})]);
assert.equal(fixture.rows.find(r=>r.model_id===base.model_id)!.mean_normalized_score,75);
assert.equal(fixture.rows.find(r=>r.model_id===base.model_id)!.mean_coverage,2);
assert.equal(fixture.rows.find(r=>r.model_id==="partial")!.mean_coverage,1);
assert.equal(fixture.rows.find(r=>r.model_id==="estimate")!.mean_normalized_score,null);
assert(fixture.issues.some(i=>i.message.includes("Duplicate")));
const result=aggregateMaster(d.evaluations,d.entries);
assert.deepEqual(result,aggregateMaster(d.evaluations,[...d.entries].reverse()));
for(const row of result.rows)masterRowSchema.parse(row);
for(const dir of ["asc","desc"]){const rows=sortMaster(result.rows,percentage.id,dir);const firstNull=rows.findIndex(r=>r.cells[percentage.id]?.normalized_value==null);if(firstNull>=0)assert(rows.slice(firstNull).every(r=>r.cells[percentage.id]?.normalized_value==null));}
// Reconcile ten high-coverage rows against the immutable source dataset.
for(const row of [...result.rows].sort((a,b)=>b.source_entries.length-a.source_entries.length).slice(0,10))for(const [id,cell] of Object.entries(row.cells)){
  const source=d.entries.filter(e=>e.model_id===row.model_id&&e.evaluation_id===id).sort((a,b)=>a.source_rank-b.source_rank||a.source_row-b.source_row||a.id.localeCompare(b.id))[0];
  assert.deepEqual(cell.entry,source);assert.equal(new URL(cell.href,"http://localhost").searchParams.get("q"),row.model);
  for(const dir of ["asc","desc"])assert.equal(sortMaster([row],id,dir)[0].cells[id].entry.source_rank,source.source_rank);
}
assert.deepEqual(sortMaster(fixture.rows,"mean","desc"),sortMaster([...fixture.rows].reverse(),"mean","desc"));
console.log(JSON.stringify({models:result.rows.length,evaluations:d.evaluations.length,issues:result.issues.length,client_rows_bytes:Buffer.byteLength(JSON.stringify(masterTableRows(result.rows))),reconciled_rows:10},null,2));
