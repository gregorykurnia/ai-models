"use client";
import {Alert, Button, Card} from "@/components/ui/primitives";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <Card><Alert tone="error" title="Unable to load this data">The snapshot could not be read. Please try again.</Alert><Button onClick={reset}>Try again</Button></Card>;
}
