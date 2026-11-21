import { Suspense } from "react";
import Planner, { PlannerLoading } from "@/components/suitability-planner";
import { getPublishedDataset } from "@/lib/data";
import { buildPlannerData } from "@/lib/suitability-data";

export const revalidate = 300;

export default async function SuitabilityPage() {
  const {evaluations,entries} = await getPublishedDataset();
  return <Suspense fallback={<PlannerLoading />}>
    <Planner data={buildPlannerData(evaluations, entries)} />
  </Suspense>;
}
