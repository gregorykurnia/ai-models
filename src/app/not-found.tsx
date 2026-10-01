import {Card, EmptyState, LinkButton} from "@/components/ui/primitives";

export default function NotFound() {
  return <Card><EmptyState headingLevel={1} title="Evaluation not found" action={<LinkButton href="/" variant="primary">Browse evaluations</LinkButton>} /></Card>;
}
