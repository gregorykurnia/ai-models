import { readFile, writeFile, rename } from "node:fs/promises";
import type { Dataset } from "../src/lib/contract";
import { mergeBriefcaseComponents, type BriefcaseComponentsSource } from "../src/lib/aa-briefcase";
import profileSource from "../data/aa-model-profile-overlays.json";
import { mergeAaModelProfileOverlays, type AaModelProfileOverlay } from "../src/lib/aa-model-profile-overlays";

const [datasetText, sourceText] = await Promise.all([
  readFile("data/leaderboards.json", "utf8"),
  readFile("data/aa-briefcase-components.json", "utf8"),
]);
const dataset = mergeAaModelProfileOverlays(
  mergeBriefcaseComponents(
    JSON.parse(datasetText) as Dataset,
    JSON.parse(sourceText) as BriefcaseComponentsSource,
  ),
  profileSource as AaModelProfileOverlay,
);

await writeFile("data/leaderboards.json.tmp", JSON.stringify(dataset));
await rename("data/leaderboards.json.tmp", "data/leaderboards.json");
console.log(JSON.stringify({
  evaluation_count: dataset.evaluations.length,
  row_count: dataset.entries.length,
  added_indexes: dataset.evaluations.filter(evaluation => evaluation.metric_group === "aa-briefcase-components")
    .map(evaluation => ({ name: evaluation.display_name, rows: evaluation.row_count })),
}, null, 2));

if (process.argv.includes("--publish")) {
  const { publish } = await import("./publish-firestore");
  await publish(dataset);
}
