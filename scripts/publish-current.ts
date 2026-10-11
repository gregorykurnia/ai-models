// Publishes the bundled data/leaderboards.json to Firestore: the snapshots the evaluations point at.
// Run with `npm run publish:data`, which loads .env.local for the service account.
import { readFile } from "node:fs/promises";
import type { Dataset } from "../src/lib/contract";
import { publish } from "./publish-firestore";

const dataset = JSON.parse(await readFile("data/leaderboards.json", "utf8")) as Dataset;
const active = new Set(dataset.evaluations.map(evaluation => evaluation.published_snapshot_id));
const snapshots = dataset.snapshots.filter(snapshot => active.has(String(snapshot.id)));
const missing = [...active].filter(id => !snapshots.some(snapshot => String(snapshot.id) === id));
if (missing.length) throw new Error(`Evaluations point at snapshots missing from the bundled data: ${missing.join(", ")}`);

await publish({ ...dataset, snapshots });
