import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/primitives";
import WorkflowAnchor from "@/components/workflow-anchor";
import WorkflowView from "@/components/workflow-view";
import { getMasterDataset } from "@/lib/data";
import { getPersonalityDataset, personalityCaptureLabel } from "@/lib/personality";
import { workflows } from "@/lib/workflow-registry";
import { BENCHMARK_BAR } from "@/lib/workflows";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams() {
  return workflows.map(({ slug }) => ({ slug }));
}

export default async function WorkflowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const workflow = workflows.find(item => item.slug === slug);
  if (!workflow) notFound();

  const dataset = getPersonalityDataset();
  const masterRows = workflow.steps.some(step => step.evaluations?.length) ? (await getMasterDataset()).rows : [];

  return <>
    <PageHeader>
      <div className="breadcrumb"><Link href="/workflows">Workflows</Link> / {workflow.title}</div>
      <h1>{workflow.title}</h1>
      <p>{workflow.summary}</p>
      <p>
        Updated <time dateTime={workflow.updated}>{personalityCaptureLabel(workflow.updated)}</time>
        {" · picks from "}<Link href="/personality">AA-PersonalityBench</Link>, captured {personalityCaptureLabel(dataset.captured_at)}
      </p>
      <p>
        Picks use your model list (<Link href="/workflows#workflow-models">on the Workflows page</Link>) and must rank in the top {BENCHMARK_BAR * 100}% of each of the step&apos;s benchmarks.
      </p>
    </PageHeader>
    <WorkflowView workflow={workflow} dataset={dataset} masterRows={masterRows} />
    <WorkflowAnchor />
  </>;
}
