import Link from "next/link";
import {Suspense} from "react";
import MasterLeaderboard from "@/components/master-leaderboard";
import {getMasterDataset} from "@/lib/data";
import {masterTableRows} from "@/lib/master";
import {Card, EmptyState, PageHeader, Section, SectionHeader, Spinner} from "@/components/ui/primitives";
import styles from "./home.module.css";

export const dynamic="force-dynamic";

export default async function Home(){
  const {evaluations,rows,intelligenceIndexCostCapturedAt}=await getMasterDataset();
  return <>
    <PageHeader>
    <div className="eyebrow">Artificial Analysis · leaderboard snapshots</div>
    <h1>Compare model ranks across evaluations.</h1>
    <p>See each model’s rank across the benchmarks, then open an individual leaderboard for more detail.</p>
    </PageHeader>
    <Card density="compact"><div className="eyebrow">Task suitability planner</div><h2>Find the best model for a task</h2><p>Choose evaluations, set your priorities, and compare model suitability with transparent coverage.</p><Link href="/suitability">Create a task comparison →</Link></Card>

    <Suspense fallback={<div className="ui-loading-state"><Spinner label="Loading master leaderboard" /><span>Loading master leaderboard…</span></div>}>
      <MasterLeaderboard rows={masterTableRows(rows)} evaluations={evaluations} costCapturedAt={intelligenceIndexCostCapturedAt}/>
    </Suspense>

    {evaluations.length===0
      ? <Card><EmptyState title="No snapshot available yet" description="Import the workbook to populate the evaluation catalog." /></Card>
      : <Section className={styles.evaluationSection} aria-labelledby="individual-evaluations">
          <SectionHeader>
            <div>
          <div className="eyebrow">Browse a single benchmark</div>
          <h2 id="individual-evaluations">Explore individual evaluations</h2>
            </div>
          </SectionHeader>
          <div className="catalog">
            {evaluations.map(e=><Card as="article" className="evaluation-card" key={e.id}>
              <div className="eyebrow">{e.category.replaceAll("_"," ")}</div>
              <h3><Link href={`/leaderboards/${e.slug}`}>{e.display_name}</Link></h3>
              {e.metric_group && <div className="metric-tag"><span className={`metric-indicator metric-indicator--${e.metric_indicator}`} style={{backgroundColor:e.metric_color}} aria-hidden="true"/><span>{e.source_tab}</span></div>}
              <p className="evaluation-meta">{e.metric_label} · {e.row_count.toLocaleString()} ranked models</p>
              <Link className="open" href={`/leaderboards/${e.slug}`}>View leaderboard →</Link>
            </Card>)}
          </div>
        </Section>}

    <p className={styles.dataNote}>Intelligence Index includes workbook estimates and documented provider mapping. <Link href="/about/data">Read the data notes</Link>.</p>
  </>;
}
