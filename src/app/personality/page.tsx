import {Suspense} from "react";
import PersonalityLeaderboard from "@/components/personality-leaderboard";
import {getPersonalityDataset,personalityCaptureLabel} from "@/lib/personality";
import {PageHeader,Spinner} from "@/components/ui/primitives";

export default function PersonalityPage(){
  const dataset=getPersonalityDataset();
  return <>
    <PageHeader className="personality-page-header">
      <div className="eyebrow">AA-PersonalityBench · how models write</div>
      <h1>Personality</h1>
      <p>Artificial Analysis · captured {personalityCaptureLabel(dataset.captured_at)} · {dataset.models.length} models · <a href={dataset.source_url} target="_blank" rel="noreferrer">AA-PersonalityBench ↗</a></p>
      <p className="personality-page-header__about">Style, not skill: 8 indexes and the 30 traits under them, judged pairwise by a panel of LLM judges. Separate from the evaluation ranks.</p>
    </PageHeader>
    <Suspense fallback={<div className="ui-loading-state"><Spinner label="Loading personality table"/><span>Loading personality table…</span></div>}>
      <PersonalityLeaderboard dataset={dataset}/>
    </Suspense>
  </>;
}
