import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvaluationDataset } from "@/lib/data";
import type { Evaluation } from "@/lib/contract";
import Leaderboard from "@/components/leaderboard";
import { PageHeader } from "@/components/ui/primitives";
import { intelligenceIndexCostsForEntries,intelligenceIndexCostCapturedAt } from "@/lib/intelligence-index-costs";

function ComponentIndexNav({ active, evaluations }: { active: Evaluation; evaluations: Evaluation[] }) {
  const related = evaluations.filter(evaluation => evaluation.metric_group === active.metric_group);
  if (related.length < 2) return null;
  return <section className="metric-group panel" aria-label="AA-Briefcase component indexes">
    <div className="metric-group-copy">
      <div className="eyebrow">AA-Briefcase component indexes</div>
      <p>The source places Analytical Quality and Presentation in one tab with separate graph indicators. Open each complete ranking below.</p>
    </div>
    <nav className="metric-group-links" aria-label="Choose a component index">
      {related.map(evaluation => <Link
        className="metric-group-link"
        href={`/leaderboards/${evaluation.slug}`}
        key={evaluation.id}
        aria-current={evaluation.id === active.id ? "page" : undefined}
      >
        <span
          className={`metric-indicator metric-indicator--${evaluation.metric_indicator}`}
          style={{ backgroundColor: evaluation.metric_color }}
          aria-hidden="true"
        />
        <span><strong>{evaluation.metric_label}</strong><small>{evaluation.source_tab}</small></span>
      </Link>)}
    </nav>
  </section>;
}

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ evaluationSlug: string }> }) {
  const { evaluationSlug } = await params;
  const dataset = await getEvaluationDataset(evaluationSlug);
  if (!dataset) notFound();
  const {evaluations,evaluation,entries} = dataset;
  const taskCosts = intelligenceIndexCostsForEntries(entries);
  const capturedDate = new Date(`${evaluation.captured_at}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
  const costCapturedDate = new Date(`${intelligenceIndexCostCapturedAt.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });

  return <>
    <PageHeader>
    <div className="breadcrumb"><Link href="/">Evaluations</Link> / {evaluation.display_name}</div>
    <div className="eyebrow">{evaluation.metric_label} · {evaluation.score_kind.replaceAll("_", " ")}</div>
    <h1>{evaluation.display_name}</h1>
    <p>{evaluation.source_title}</p>
    <p>As of {capturedDate} · {evaluation.row_count.toLocaleString()} ranked rows · {evaluation.source_url
      ? <a href={evaluation.source_url} target="_blank" rel="noreferrer">Original source ↗</a>
      : "Source: supplied workbook"}</p>
    <p>Cost per Intelligence Index task is the Artificial Analysis profile value captured {costCapturedDate}, weighted across the Index evaluations. Workbook cost values mentioned in the source notes below are evaluation-specific.</p>
    </PageHeader>
    {evaluation.metric_group && <ComponentIndexNav active={evaluation} evaluations={evaluations} />}
    {evaluation.notes && <p>{evaluation.notes}</p>}
    <Leaderboard entries={entries} evaluation={evaluation} taskCosts={taskCosts} />
  </>;
}
