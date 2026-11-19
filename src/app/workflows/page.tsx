import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui/primitives";
import { workflows } from "@/lib/workflow-registry";

export const dynamic = "force-dynamic";

export default function WorkflowsPage() {
  return <>
    <PageHeader><h1>Workflows</h1></PageHeader>
    {workflows.length === 0
      ? <Card><EmptyState title="No workflows yet" /></Card>
      : <div className="catalog workflow-catalog">
          {workflows.map(workflow => (
            <Card as="article" key={workflow.slug}>
              <h2>{workflow.title}</h2>
              <p>{workflow.summary}</p>
              <Badge className="self-start">{workflow.steps.length} {workflow.steps.length === 1 ? "step" : "steps"}</Badge>
              <LinkButton href={`/workflows/${workflow.slug}`} size="compact" className="self-start" aria-label={`Open ${workflow.title}`}>
                Open →
              </LinkButton>
            </Card>
          ))}
        </div>}
  </>;
}
