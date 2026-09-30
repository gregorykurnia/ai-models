import ExcelJS from "exceljs";
import { createHash } from "node:crypto";
import { readFile,mkdir,writeFile,rename } from "node:fs/promises";
import path from "node:path";
import { entrySchema,type Dataset,type Evaluation } from "../src/lib/contract";
import { aggregateMaster } from "../src/lib/master";

const filename=process.argv[2];
if(!filename) throw new Error("Usage: npm run import:workbook -- <xlsx> [--publish]");
const bytes=await readFile(filename);
const hash=createHash("sha256").update(bytes).digest("hex");
const captured=process.env.CAPTURED_AT || "2026-09-29";
if(!/^\d{4}-\d{2}-\d{2}$/.test(captured)||Number.isNaN(Date.parse(captured))) throw new Error("CAPTURED_AT must be an ISO date");
const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
const slug=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const id=(s:string)=>createHash("sha256").update(s).digest("hex").slice(0,24);
const text=(c:ExcelJS.Cell)=>c.text.trim();
const number=(c:ExcelJS.Cell)=>typeof c.value==="number"?c.value:typeof c.value==="object"&&c.value&&"result" in c.value&&typeof c.value.result==="number"?c.value.result:null;
const dataset:Dataset={sourceAsset:{id:hash,filename:path.basename(filename),content_hash:hash,captured_at:captured,imported_at:new Date().toISOString(),source_kind:"xlsx_snapshot"},evaluations:[],providers:[],models:[],snapshots:[],entries:[],issues:[],report:{}};
const providers=new Map<string,Record<string,unknown>>(),models=new Map<string,Record<string,unknown>>();
// Resolve providers only from exact, unambiguous labels in standard sheets.
const providerMatches=new Map<string,Set<string>>();
for(const sheet of workbook.worksheets){
  let modelColumn=0,providerColumn=0;
  sheet.eachRow(row=>{
    if(!modelColumn){row.eachCell((c,i)=>{if(text(c)==="Model")modelColumn=i;if(text(c)==="Provider")providerColumn=i;});return;}
    if(!providerColumn)return;
    const model=text(row.getCell(modelColumn)),provider=text(row.getCell(providerColumn));
    if(model&&provider){const matches=providerMatches.get(model)||new Set<string>();matches.add(provider);providerMatches.set(model,matches);}
  });
}
for(const sheet of workbook.worksheets){
  if(sheet.name==="Start Here")continue;
  if(sheet.name==="Intelligence Index"){
    const evaluationId=slug(sheet.name),snapshotId=`${evaluationId}-${hash.slice(0,16)}`;
    const notes="Imported from workbook columns A–D. First-row rank ‘Int’ is restored to 1 when followed by rank 2. Providers use exact, unambiguous model matches from other workbook sheets; unmatched or ambiguous providers are Unknown. No source URL or cost data is supplied. Scoring status distinguishes independently scored results from estimates.";
    const evaluation:Evaluation={id:evaluationId,slug:evaluationId,display_name:sheet.name,source_title:"Intelligence Index workbook snapshot",source_url:null,category:"capability_index",metric_key:"intelligence-index",metric_label:"Intelligence Index",score_kind:"integer_score",score_unit:"points",score_min:null,score_max:null,captured_at:captured,source_asset_id:hash,notes,published_snapshot_id:snapshotId,row_count:0,cost_label_count:0,precise_cost_count:0,has_confidence_interval:false,has_release_date:false,has_scoring_status:true};
    let previousRank=0,unknown=0;
    sheet.eachRow((row,n)=>{
      let rank=number(row.getCell(1));
      if(n===1&&text(row.getCell(1))==="Int"&&number(sheet.getRow(2).getCell(1))===2){rank=1;dataset.issues.push({sheet:sheet.name,message:"Row 1: rank cell ‘Int’ restored to 1 from its position before rank 2.",severity:"warning"});}
      const model=text(row.getCell(2)),matches=providerMatches.get(model),provider=matches?.size===1?[...matches][0]:"Unknown";
      const providerId=id(provider),modelId=id(`${provider}\0${model}`);
      const parsed=entrySchema.safeParse({id:id(`${snapshotId}:${n}`),evaluation_id:evaluationId,snapshot_id:snapshotId,model_id:modelId,provider_id:providerId,provider,model,source_rank:rank,score_value:number(row.getCell(3)),score_display:text(row.getCell(3)),scoring_status:text(row.getCell(4))||null,confidence_interval_display:null,confidence_interval_low_delta:null,confidence_interval_high_delta:null,release_date_label:null,cost_usd:null,cost_display:null,cost_status:"missing",source_sheet:sheet.name,source_row:n,source_asset_id:hash});
      if(!parsed.success||rank===null||rank<previousRank){dataset.issues.push({sheet:sheet.name,message:`Row ${n}: invalid Intelligence Index row or decreasing rank`,severity:"error"});return;}
      previousRank=rank;if(provider==="Unknown")unknown++;
      dataset.entries.push(parsed.data);evaluation.row_count++;
      providers.set(providerId,{id:providerId,slug:slug(provider),display_name:provider,aliases:[]});
      models.set(modelId,{id:modelId,provider_id:providerId,canonical_name:model,display_name:model,release_date_label:null,aliases:[],created_at:captured});
    });
    dataset.issues.push({sheet:sheet.name,message:`${unknown} rows have Unknown providers; source URL and costs are absent from the workbook.`,severity:"warning"});
    dataset.evaluations.push(evaluation);
    dataset.snapshots.push({id:snapshotId,evaluation_id:evaluationId,source_asset_id:hash,captured_at:captured,status:"validated",row_count:evaluation.row_count,cost_label_count:0,precise_cost_count:0});
    continue;
  }
  let header=0;let columns:Record<string,number>={};
  sheet.eachRow((row,n)=>{if(header)return;const labels:Record<string,number>={};row.eachCell((c,i)=>{labels[text(c)]=i;});if(labels.Rank&&labels.Provider&&labels.Model){header=n;columns=labels;}});
  if(!header){dataset.issues.push({sheet:sheet.name,message:"Missing standard Rank/Provider/Model header",severity:"error"});continue;}
  const metric=Object.keys(columns).find(k=>!['Rank','Provider','Model','Elo CI','Release Date','Cost per Task (USD)','AA Cost Chart Label'].includes(k));
  if(!metric){dataset.issues.push({sheet:sheet.name,message:"Missing metric column",severity:"error"});continue;}
  const metadata=[1,2,3,4].map(n=>text(sheet.getRow(n).getCell(1))).join("\n");
  const source=metadata.match(/https:\/\/[^\s]+/)?.[0];
  if(!source){dataset.issues.push({sheet:sheet.name,message:"Missing source URL",severity:"error"});continue;}
  const evaluationId=slug(sheet.name),snapshotId=`${evaluationId}-${hash.slice(0,16)}`;
  const signed=metric==="AA-Omniscience Index",percentage=metric.includes("%"),elo=metric==="Elo";
  const evaluation:Evaluation={id:evaluationId,slug:evaluationId,display_name:sheet.name,source_title:text(sheet.getRow(1).getCell(1)),source_url:source,category:metric.includes("Index")||metric==="Index Score"?"capability_index":"benchmark",metric_key:slug(metric),metric_label:metric,score_kind:signed?"signed_index":percentage?"percentage":elo?"elo":"integer_score",score_unit:percentage?"%":"points",score_min:signed?-100:percentage?0:null,score_max:signed?100:percentage?100:null,captured_at:captured,source_asset_id:hash,notes:text(sheet.getRow(4).getCell(1)),published_snapshot_id:snapshotId,row_count:0,cost_label_count:0,precise_cost_count:0,has_confidence_interval:!!columns['Elo CI'],has_release_date:!!columns['Release Date']};
  let previousRank=0;
  sheet.eachRow((row,n)=>{
    if(n<=header)return;
    const cell=(key:string)=>row.getCell(columns[key]||sheet.columnCount+1);
    const rank=number(cell("Rank"));
    if(rank===null){if(text(cell("Provider"))||text(cell("Model")))dataset.issues.push({sheet:sheet.name,message:`Row ${n}: missing numeric rank`,severity:"error"});return;}
    const provider=text(cell("Provider")),model=text(cell("Model")),score=number(cell(metric)),cost=number(cell("Cost per Task (USD)")),label=text(cell("AA Cost Chart Label"))||null,ci=text(cell("Elo CI"))||null;
    if(rank<previousRank)dataset.issues.push({sheet:sheet.name,message:`Row ${n}: rank sequence decreases`,severity:"error"});previousRank=rank;
    const providerId=id(provider),modelId=id(`${provider}\0${model}`),match=ci?.match(/(-?\d+(?:\.\d+)?)\s*\/\s*\+?(\d+(?:\.\d+)?)/);
    const parsed=entrySchema.safeParse({id:id(`${snapshotId}:${n}`),evaluation_id:evaluationId,snapshot_id:snapshotId,model_id:modelId,provider_id:providerId,provider,model,source_rank:rank,score_value:score,score_display:text(cell(metric)),confidence_interval_display:ci,confidence_interval_low_delta:match?Number(match[1]):null,confidence_interval_high_delta:match?Number(match[2]):null,release_date_label:text(cell("Release Date"))||null,cost_usd:cost,cost_display:label,cost_status:cost!==null?"exact":label?"bound":"missing",source_sheet:sheet.name,source_row:n,source_asset_id:hash});
    if(!parsed.success){dataset.issues.push({sheet:sheet.name,message:`Row ${n}: ${parsed.error.message}`,severity:"error"});return;}
    if(label&&/^[<>≤≥]/.test(label)&&cost!==null){dataset.issues.push({sheet:sheet.name,message:`Row ${n}: bounded cost unexpectedly has a precise numeric value`,severity:"error"});return;}
    dataset.entries.push(parsed.data);evaluation.row_count++;if(label)evaluation.cost_label_count++;if(cost!==null)evaluation.precise_cost_count++;
    providers.set(providerId,{id:providerId,slug:slug(provider),display_name:provider,aliases:[]});
    models.set(modelId,{id:modelId,provider_id:providerId,canonical_name:model,display_name:model,release_date_label:parsed.data.release_date_label,aliases:[],created_at:captured});
  });
  dataset.evaluations.push(evaluation);
  dataset.snapshots.push({id:snapshotId,evaluation_id:evaluationId,source_asset_id:hash,captured_at:captured,status:"validated",row_count:evaluation.row_count,cost_label_count:evaluation.cost_label_count,precise_cost_count:evaluation.precise_cost_count});
}
const sci=dataset.evaluations.find(e=>e.display_name==="SciCode"),summary=workbook.getWorksheet("Start Here");
summary?.eachRow(row=>{let found=false;row.eachCell(c=>{if(text(c)==="SciCode")found=true;});if(found&&sci){const numbers:number[]=[];row.eachCell(c=>{const v=number(c);if(v!==null)numbers.push(v);});if(numbers[0]!==sci.row_count)dataset.issues.push({sheet:"Start Here",message:`SciCode summary reports ${numbers[0]} ranked rows; parsed sheet contains ${sci.row_count}. Parsed rows are authoritative.`,severity:"warning"});}});
dataset.providers=[...providers.values()];dataset.models=[...models.values()];
const master=aggregateMaster(dataset.evaluations,dataset.entries);
dataset.issues.push(...master.issues);
dataset.report={sheet_count:workbook.worksheets.length,evaluation_count:dataset.evaluations.length,row_count:dataset.entries.length,provider_count:providers.size,distinct_raw_model_labels:new Set(dataset.entries.map(e=>e.model)).size,cost_label_count:dataset.entries.filter(e=>e.cost_display!==null).length,precise_cost_count:dataset.entries.filter(e=>e.cost_usd!==null).length,evaluations:dataset.evaluations.map(e=>({name:e.display_name,rows:e.row_count,cost_labels:e.cost_label_count,precise_costs:e.precise_cost_count})),issues:dataset.issues};
await mkdir("data",{recursive:true});await writeFile("data/validation-report.json",JSON.stringify(dataset.report,null,2));
if(dataset.issues.some(i=>i.severity==="error")||dataset.evaluations.length!==16)throw new Error("Import rejected; see data/validation-report.json. Previous valid data preserved.");
await writeFile("data/leaderboards.json.tmp",JSON.stringify(dataset));await rename("data/leaderboards.json.tmp","data/leaderboards.json");
console.log(JSON.stringify(dataset.report,null,2));
if(process.argv.includes("--publish")){const {publish}=await import("./publish-firestore");await publish(dataset);}
