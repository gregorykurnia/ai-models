import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultPersonalitySort,
  firstSortDirection,
  formatElo,
  formatEloInterval,
  formatPercentile,
  getPersonalityDataset,
  personalityColumns,
  personalityLevelHref,
  personalityPage,
  personalityPageSize,
  resolvePersonalityLevel,
  resolvePersonalitySort,
  sortPersonalityModels,
  type PersonalityDataset,
  type PersonalityLevel,
  type PersonalityModel,
} from "../src/lib/personality";

const dataset = getPersonalityDataset();

function describe(level: PersonalityLevel) {
  if (level.kind === "all") return "all";
  if (level.kind === "index") return `index:${level.index.key}`;
  return `trait:${level.index.key}/${level.trait.key}`;
}

const level = (index: string | null, trait: string | null) => describe(resolvePersonalityLevel(dataset, index, trait));

test("URL levels: defaults, an index, and a trait under its index", () => {
  assert.equal(level(null, null), "all");
  assert.equal(level("warmth", null), "index:warmth");
  assert.equal(level("warmth", "sincere"), "trait:warmth/sincere");
  assert.equal(level("transparency", "sycophantic"), "trait:transparency/sycophantic");
});

test("URL levels: an unknown index falls back to All indexes, never an error", () => {
  assert.equal(level("charm", null), "all");
  assert.equal(level("charm", "sincere"), "all");
  assert.equal(level("", null), "all");
  assert.equal(level("WARMTH", null), "all");
});

test("URL levels: a trait with no index opens under its own index", () => {
  assert.equal(level(null, "sincere"), "trait:warmth/sincere");
  assert.equal(level(null, "constructivelyPushesBack"), "trait:conviction/constructivelyPushesBack");
  assert.equal(level(null, "nonsense"), "all");
});

test("URL levels: a trait from another index opens that index and drops the trait", () => {
  assert.equal(level("conviction", "sincere"), "index:conviction");
  assert.equal(level("warmth", "nonsense"), "index:warmth");
});

test("URL levels: Slop, with one trait, opens its trait view directly", () => {
  assert.equal(level("slop", null), "trait:slop/slop");
  assert.equal(level(null, "slop"), "trait:slop/slop");
});

test("levels carry the right columns", () => {
  const keys = (index: string | null, trait: string | null) => personalityColumns(dataset, resolvePersonalityLevel(dataset, index, trait)).map(column => column.key);
  assert.deepEqual(keys(null, null), ["expressiveness", "organization", "informativeness", "transparency", "warmth", "conviction", "imagination", "slop"]);
  assert.deepEqual(keys("warmth", null), ["warmth", "friendly", "humorous", "sincere", "emotionallyIntelligent"]);
  assert.deepEqual(keys("imagination", null), ["imagination", "creative", "openEnded"]);
  assert.deepEqual(keys("warmth", "sincere"), ["percentile", "elo"]);
  const all = personalityColumns(dataset, resolvePersonalityLevel(dataset, null, null));
  assert.deepEqual(all.filter(column => column.lowerIsBetter).map(column => [column.key, column.detail]), [["slop", "↓ lower is better"]]);
  const transparency = personalityColumns(dataset, resolvePersonalityLevel(dataset, "transparency", null));
  assert.deepEqual(transparency.filter(column => column.lowerIsBetter).map(column => [column.key, column.detail]), [["sycophantic", "↓ lower is better"]]);
});

test("default sorts: the first score column highest first; Slop and Sycophantic lowest first", () => {
  const sortFor = (index: string | null, trait: string | null) => defaultPersonalitySort(personalityColumns(dataset, resolvePersonalityLevel(dataset, index, trait)));
  assert.deepEqual(sortFor(null, null), { sort: "expressiveness", direction: "desc" });
  assert.deepEqual(sortFor("warmth", null), { sort: "warmth", direction: "desc" });
  assert.deepEqual(sortFor("transparency", null), { sort: "transparency", direction: "desc" });
  assert.deepEqual(sortFor("warmth", "sincere"), { sort: "percentile", direction: "desc" });
  assert.deepEqual(sortFor("slop", null), { sort: "percentile", direction: "asc" });
  assert.deepEqual(sortFor("transparency", "sycophantic"), { sort: "percentile", direction: "asc" });
});

test("a header picked first sorts lowest first for Slop and Sycophantic, highest first otherwise", () => {
  const all = personalityColumns(dataset, resolvePersonalityLevel(dataset, null, null));
  assert.equal(firstSortDirection(all, "slop"), "asc");
  assert.equal(firstSortDirection(all, "warmth"), "desc");
  assert.equal(firstSortDirection(all, "model"), "asc");
  const transparency = personalityColumns(dataset, resolvePersonalityLevel(dataset, "transparency", null));
  assert.equal(firstSortDirection(transparency, "sycophantic"), "asc");
  assert.equal(firstSortDirection(transparency, "truthful"), "desc");
});

test("URL sort: an s the level lacks uses the level's default sort; d is kept for a valid s", () => {
  const warmth = personalityColumns(dataset, resolvePersonalityLevel(dataset, "warmth", null));
  assert.deepEqual(resolvePersonalitySort(warmth, "sincere", "asc"), { sort: "sincere", direction: "asc" });
  assert.deepEqual(resolvePersonalitySort(warmth, "sincere", null), { sort: "sincere", direction: "desc" });
  assert.deepEqual(resolvePersonalitySort(warmth, "provider", "desc"), { sort: "provider", direction: "desc" });
  assert.deepEqual(resolvePersonalitySort(warmth, "direct", "asc"), { sort: "warmth", direction: "desc" });
  assert.deepEqual(resolvePersonalitySort(warmth, "interval", "asc"), { sort: "warmth", direction: "desc" });
  assert.deepEqual(resolvePersonalitySort(warmth, null, "asc"), { sort: "warmth", direction: "desc" });
  assert.deepEqual(resolvePersonalitySort(warmth, "sincere", "sideways"), { sort: "sincere", direction: "desc" });
  const slop = personalityColumns(dataset, resolvePersonalityLevel(dataset, "slop", null));
  assert.deepEqual(resolvePersonalitySort(slop, "elo", null), { sort: "elo", direction: "asc" });
  assert.deepEqual(resolvePersonalitySort(slop, "warmth", "desc"), { sort: "percentile", direction: "asc" });
});

function fixtureModel(name: string, warmth: number | null, sincere: number | null): PersonalityModel {
  return {
    name,
    provider: "Fixture",
    identity_key: `fixture\u0000${name.toLowerCase()}`,
    index_percentiles: { warmth },
    traits: { sincere: { percentile: sincere, elo: sincere === null ? null : 1000 + sincere, elo_interval: null } },
  };
}

const fixture: PersonalityDataset = {
  captured_at: "2026-11-19T07:36:14.917Z",
  source_url: "https://example.test",
  indexes: [{ key: "warmth", label: "Warmth", description: "Warm", question_count: 120, traits: [{ key: "sincere", label: "Sincere", definition: "Sincere?", lower_is_better: false, source_url: "https://example.test/sincere" }] }],
  models: [fixtureModel("Bravo", 40.6, null), fixtureModel("Alpha", null, 70), fixtureModel("Charlie", 90.2, 30), fixtureModel("Delta", 40.6, 50)],
};

test("a null value sorts last both ways, ties fall back to the name", () => {
  const columns = personalityColumns(fixture, { kind: "all" });
  const names = (direction: "asc" | "desc") => sortPersonalityModels(fixture.models, columns, "warmth", direction).map(model => model.name);
  assert.deepEqual(names("desc"), ["Charlie", "Bravo", "Delta", "Alpha"]);
  assert.deepEqual(names("asc"), ["Bravo", "Delta", "Charlie", "Alpha"]);
  const trait = resolvePersonalityLevel(fixture, null, "sincere");
  const traitColumns = personalityColumns(fixture, trait);
  for (const sort of ["percentile", "elo"]) {
    assert.equal(sortPersonalityModels(fixture.models, traitColumns, sort, "asc").at(-1)?.name, "Bravo");
    assert.equal(sortPersonalityModels(fixture.models, traitColumns, sort, "desc").at(-1)?.name, "Bravo");
  }
  assert.deepEqual(sortPersonalityModels(fixture.models, columns, "model", "desc").map(model => model.name), ["Delta", "Charlie", "Bravo", "Alpha"]);
});

test("sorting uses the unrounded value although cells show whole numbers", () => {
  const models = [fixtureModel("Low", 80.4, 1), fixtureModel("High", 80.6, 1)];
  const columns = personalityColumns(fixture, { kind: "all" });
  assert.deepEqual(sortPersonalityModels(models, columns, "warmth", "desc").map(model => model.name), ["High", "Low"]);
  assert.equal(formatPercentile(80.4), "80");
  assert.equal(formatPercentile(80.6), "81");
  assert.equal(formatPercentile(null), "—");
  assert.equal(formatElo(1268.34), "1,268.3");
  assert.equal(formatElo(null), "—");
  assert.equal(formatEloInterval({ lower: 1268.2, upper: 1316.9 }), "1,268–1,317");
  assert.equal(formatEloInterval(null), "—");
});

test("changing level resets the page and sort, and keeps search, providers, favorites and page size", () => {
  const current = "index=warmth&trait=sincere&q=claude&p=Anthropic&p=OpenAI&f=1&s=elo&d=asc&i=3&z=50";
  const toConviction = new URL(personalityLevelHref(current, "conviction"), "https://x.test");
  assert.equal(toConviction.pathname, "/personality");
  assert.equal(toConviction.searchParams.get("index"), "conviction");
  assert.equal(toConviction.searchParams.get("trait"), null);
  assert.equal(toConviction.searchParams.get("s"), null);
  assert.equal(toConviction.searchParams.get("d"), null);
  assert.equal(toConviction.searchParams.get("i"), null);
  assert.equal(toConviction.searchParams.get("q"), "claude");
  assert.deepEqual(toConviction.searchParams.getAll("p"), ["Anthropic", "OpenAI"]);
  assert.equal(toConviction.searchParams.get("f"), "1");
  assert.equal(toConviction.searchParams.get("z"), "50");
  assert.equal(personalityLevelHref(current, "warmth", "humorous"), "/personality?q=claude&p=Anthropic&p=OpenAI&f=1&z=50&index=warmth&trait=humorous");
  assert.equal(personalityLevelHref("index=warmth&s=sincere&i=2"), "/personality");
  // A reload of the new href lands on page 1 with the level's default sort.
  const reloaded = new URL(personalityLevelHref(current, "slop"), "https://x.test").searchParams;
  const columns = personalityColumns(dataset, resolvePersonalityLevel(dataset, reloaded.get("index"), reloaded.get("trait")));
  assert.deepEqual(resolvePersonalitySort(columns, reloaded.get("s"), reloaded.get("d")), { sort: "percentile", direction: "asc" });
  assert.equal(personalityPage(reloaded.get("i"), 3), 1);
});

test("page and size fall back like the master's", () => {
  assert.equal(personalityPageSize("50"), 50);
  assert.equal(personalityPageSize("30"), 25);
  assert.equal(personalityPageSize(null), 25);
  assert.equal(personalityPage("9", 3), 3);
  assert.equal(personalityPage("-2", 3), 1);
  assert.equal(personalityPage("abc", 3), 1);
  assert.equal(personalityPage("2.7", 3), 2);
});
