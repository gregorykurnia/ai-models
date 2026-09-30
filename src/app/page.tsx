import Link from "next/link";
import {Suspense} from "react";
import MasterLeaderboard from "@/components/master-leaderboard";
import {getMasterDataset} from "@/lib/data";
import {masterTableRows} from "@/lib/master";
import styles from "./home.module.css";

export const dynamic="force-dynamic";

export default async function Home(){
  const {evaluations,rows}=await getMasterDataset();
  return <>
    <div className="eyebrow">Artificial Analysis · 29 Sep 2026</div>
    <h1>Compare model ranks across evaluations.</h1>
    <p>See each model’s rank across the benchmarks, then open an individual leaderboard for more detail.</p>

    <Suspense fallback={<p>Loading master leaderboard…</p>}>
      <MasterLeaderboard rows={masterTableRows(rows)} evaluations={evaluations}/>
    </Suspense>

    {evaluations.length===0
      ? <section className="panel"><h2>No snapshot available yet</h2><p>Import the workbook to populate the evaluation catalog.</p></section>
      : <section className={styles.evaluationSection} aria-labelledby="individual-evaluations">
          <div className="eyebrow">Browse a single benchmark</div>
          <h2 id="individual-evaluations">Explore individual evaluations</h2>
          <div className="catalog">
            {evaluations.map(e=><article className="card" key={e.id}>
              <div className="eyebrow">{e.category.replaceAll("_"," ")}</div>
              <h3><Link href={`/leaderboards/${e.slug}`}>{e.display_name}</Link></h3>
              <p className="evaluation-meta">{e.metric_label} · {e.row_count.toLocaleString()} ranked models</p>
              <Link className="open" href={`/leaderboards/${e.slug}`}>View leaderboard →</Link>
            </article>)}
          </div>
        </section>}

    <p className={styles.dataNote}>Intelligence Index includes workbook estimates and documented provider mapping. <Link href="/about/data">Read the data notes</Link>.</p>
  </>;
}
