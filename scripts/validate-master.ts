import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {aggregateMaster,sortMaster,masterRowSchema,masterTableRows} from "../src/lib/master";
import type {Dataset,Entry} from "../src/lib/contract";
const d=JSON.parse(await readFile("data/leaderboards.json","utf8")) as Dataset;
const evaluation=d.evaluations[0];
const base=d.entries.find(e=>e.evaluation_id===evaluation.id)!;
const entry=(changes:Partial<Entry>)=>({...base,...changes});
const second={...evaluation,id:"fixture-2",slug:"fixture-2"};
const fixture=aggregateMaster([evaluation,second],[entry({source_rank:2}),entry({evaluation_id:second.id,source_rank:7,id:"second"}),entry({source_rank:3,id:"duplicate"}),entry({model_id:"partial",model:"Partial",source_rank:2}),entry({model_id:"estimate",scoring_status:"Estimated",source_rank:1})]);
assert.equal(fixture.rows.find(r=>r.model_id===base.model_id)!.cells[evaluation.id].entry.source_rank,2);
assert.equal(fixture.rows.find(r=>r.model_id===base.model_id)!.cells[second.id].entry.source_rank,7);
assert.equal(fixture.rows.find(r=>r.model_id==="partial")!.cells[second.id],undefined);
assert.equal(fixture.rows.find(r=>r.model_id==="estimate")!.cells[evaluation.id].entry.source_rank,1);
assert(fixture.issues.some(i=>i.message.includes("Duplicate")));
assert.equal(sortMaster(fixture.rows,evaluation.id,"asc")[0].model_id,"estimate");
assert.deepEqual(sortMaster(fixture.rows,evaluation.id,"asc"),sortMaster([...fixture.rows].reverse(),evaluation.id,"asc"));
const result=aggregateMaster(d.evaluations,d.entries);
assert.deepEqual(result,aggregateMaster(d.evaluations,[...d.entries].reverse()));
let cells=0;
for(const row of result.rows){
  masterRowSchema.parse(row);
  assert(!("mean_normalized_score" in row));
  for(const [id,cell] of Object.entries(row.cells)){
    const source=d.entries.filter(e=>e.model_id===row.model_id&&e.evaluation_id===id).sort((a,b)=>a.source_rank-b.source_rank||a.source_row-b.source_row||a.id.localeCompare(b.id))[0];
    assert.deepEqual(cell.entry,source);
    assert.equal(new URL(cell.href,"http://localhost").searchParams.get("q"),row.model);
    assert(!("normalized_value" in cell));
    cells++;
  }
}
for(const evaluation of d.evaluations)for(const dir of ["asc","desc"]){
  const rows=sortMaster(result.rows,evaluation.id,dir);
  const firstMissing=rows.findIndex(r=>!r.cells[evaluation.id]);
  if(firstMissing>=0)assert(rows.slice(firstMissing).every(r=>!r.cells[evaluation.id]));
  const ranks=rows.flatMap(r=>r.cells[evaluation.id]?[r.cells[evaluation.id].entry.source_rank]:[]);
  assert.deepEqual(ranks,[...ranks].sort((a,b)=>dir==="asc"?a-b:b-a));
}
console.log(JSON.stringify({models:result.rows.length,evaluations:d.evaluations.length,reconciled_cells:cells,issues:result.issues.length,client_rows_bytes:Buffer.byteLength(JSON.stringify(masterTableRows(result.rows)))},null,2));
