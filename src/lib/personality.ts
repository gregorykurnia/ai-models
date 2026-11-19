import source from "../../data/aa-personalitybench.json";

export type PersonalityTrait = {
  key: string;
  label: string;
  definition: string;
  lower_is_better: boolean;
  source_url: string;
};

export type PersonalityIndex = {
  key: string;
  label: string;
  description: string;
  question_count: number;
  traits: PersonalityTrait[];
};

export type PersonalityTraitScore = {
  percentile: number | null;
  elo: number | null;
  elo_interval: { lower: number; upper: number } | null;
};

export type PersonalityModel = {
  name: string;
  provider: string;
  identity_key: string;
  index_percentiles: Record<string, number | null>;
  traits: Record<string, PersonalityTraitScore>;
};

export type PersonalityDataset = {
  captured_at: string;
  source_url: string;
  indexes: PersonalityIndex[];
  models: PersonalityModel[];
};

export function getPersonalityDataset(): PersonalityDataset {
  return source;
}

export type PersonalityLevel =
  | { kind: "all" }
  | { kind: "index"; index: PersonalityIndex }
  | { kind: "trait"; index: PersonalityIndex; trait: PersonalityTrait };

export type PersonalitySortDirection = "asc" | "desc";

export type PersonalityColumn = {
  key: string;
  label: string;
  detail: string;
  lowerIsBetter: boolean;
  value: (model: PersonalityModel) => number | null;
};

/** Reads `index` and `trait` from the URL. Unknown values fall back, never throw. */
export function resolvePersonalityLevel(dataset: PersonalityDataset, indexKey: string | null, traitKey: string | null): PersonalityLevel {
  if (indexKey) {
    const index = dataset.indexes.find(candidate => candidate.key === indexKey);
    if (!index) return { kind: "all" };
    const trait = index.traits.find(candidate => candidate.key === traitKey) ?? (index.traits.length === 1 ? index.traits[0] : undefined);
    return trait ? { kind: "trait", index, trait } : { kind: "index", index };
  }
  if (traitKey) {
    for (const index of dataset.indexes) {
      const trait = index.traits.find(candidate => candidate.key === traitKey);
      if (trait) return { kind: "trait", index, trait };
    }
  }
  return { kind: "all" };
}

const LOWER_IS_BETTER = "↓ lower is better";

function indexLowerIsBetter(index: PersonalityIndex) {
  // Slop's index is its one trait's percentile, so it reads the same way.
  return index.traits.length === 1 && index.traits[0].lower_is_better;
}

/** The sortable score columns of a level, in order. The Elo interval isn't sortable, so it isn't here. */
export function personalityColumns(dataset: PersonalityDataset, level: PersonalityLevel): PersonalityColumn[] {
  if (level.kind === "all") return dataset.indexes.map(index => ({
    key: index.key,
    label: index.label,
    detail: indexLowerIsBetter(index) ? LOWER_IS_BETTER : "Percentile",
    lowerIsBetter: indexLowerIsBetter(index),
    value: model => model.index_percentiles[index.key] ?? null,
  }));
  if (level.kind === "index") return [
    {
      key: level.index.key,
      label: level.index.label,
      detail: "Index percentile",
      lowerIsBetter: indexLowerIsBetter(level.index),
      value: (model: PersonalityModel) => model.index_percentiles[level.index.key] ?? null,
    },
    ...level.index.traits.map(trait => ({
      key: trait.key,
      label: trait.label,
      detail: trait.lower_is_better ? LOWER_IS_BETTER : "Percentile",
      lowerIsBetter: trait.lower_is_better,
      value: (model: PersonalityModel) => model.traits[trait.key]?.percentile ?? null,
    })),
  ];
  const { trait } = level;
  return [
    {
      key: "percentile",
      label: "Percentile",
      // The trait's own view says "lower is better" without a second arrow beside the sort arrow.
      detail: trait.lower_is_better ? "1 to 100 · lower is better" : "1 to 100",
      lowerIsBetter: trait.lower_is_better,
      value: model => model.traits[trait.key]?.percentile ?? null,
    },
    {
      key: "elo",
      label: "Elo",
      detail: trait.lower_is_better ? "Bradley-Terry · lower is better" : "Bradley-Terry",
      lowerIsBetter: trait.lower_is_better,
      value: model => model.traits[trait.key]?.elo ?? null,
    },
  ];
}

/** The direction a column sorts in when first picked: lowest first for Slop and Sycophantic, names A to Z. */
export function firstSortDirection(columns: PersonalityColumn[], key: string): PersonalitySortDirection {
  if (key === "model" || key === "provider") return "asc";
  return columns.find(column => column.key === key)?.lowerIsBetter ? "asc" : "desc";
}

export function defaultPersonalitySort(columns: PersonalityColumn[]): { sort: string; direction: PersonalitySortDirection } {
  const first = columns[0];
  return first ? { sort: first.key, direction: first.lowerIsBetter ? "asc" : "desc" } : { sort: "model", direction: "asc" };
}

/** `s` and `d` from the URL; a column the level lacks gives the level's default sort and direction. */
export function resolvePersonalitySort(columns: PersonalityColumn[], sortKey: string | null, directionKey: string | null) {
  const valid = sortKey === "model" || sortKey === "provider" || columns.some(column => column.key === sortKey);
  if (!sortKey || !valid) return defaultPersonalitySort(columns);
  const direction: PersonalitySortDirection = directionKey === "asc" || directionKey === "desc" ? directionKey : firstSortDirection(columns, sortKey);
  return { sort: sortKey, direction };
}

/** Sorts on the unrounded value; a missing value goes last both ways, ties fall back to the model name. */
export function sortPersonalityModels(models: PersonalityModel[], columns: PersonalityColumn[], sort: string, direction: PersonalitySortDirection) {
  const byName = (a: PersonalityModel, b: PersonalityModel) => a.name.localeCompare(b.name) || a.provider.localeCompare(b.provider);
  const sign = direction === "asc" ? 1 : -1;
  if (sort === "model") return [...models].sort((a, b) => sign * byName(a, b));
  if (sort === "provider") return [...models].sort((a, b) => sign * a.provider.localeCompare(b.provider) || byName(a, b));
  const column = columns.find(candidate => candidate.key === sort);
  if (!column) return [...models].sort(byName);
  return [...models].sort((a, b) => {
    const left = column.value(a), right = column.value(b);
    if (left === null && right === null) return byName(a, b);
    if (left === null) return 1;
    if (right === null) return -1;
    return sign * (left - right) || byName(a, b);
  });
}

/** The query keys a level owns. Changing level drops them and the page; search, providers, favorites and size stay. */
const LEVEL_RESET_KEYS = ["index", "trait", "s", "d", "i"];

export function personalityLevelHref(current: URLSearchParams | string, indexKey?: string, traitKey?: string) {
  const next = new URLSearchParams(current);
  for (const key of LEVEL_RESET_KEYS) next.delete(key);
  if (indexKey) next.set("index", indexKey);
  if (traitKey) next.set("trait", traitKey);
  const query = next.toString();
  return query ? `/personality?${query}` : "/personality";
}

export function personalityPageSize(value: string | null) {
  const size = Number(value);
  return [25, 50, 100].includes(size) ? size : 25;
}

export function personalityPage(value: string | null, pages: number) {
  return Math.min(pages, Math.max(1, Math.floor(Number(value)) || 1));
}

export const formatPercentile = (value: number | null) => value === null ? "—" : String(Math.round(value));

const eloFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const wholeFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const formatElo = (value: number | null) => value === null ? "—" : eloFormatter.format(value);

export function formatEloInterval(interval: PersonalityTraitScore["elo_interval"]) {
  return interval ? `${wholeFormatter.format(interval.lower)}–${wholeFormatter.format(interval.upper)}` : "—";
}

export function personalityCaptureLabel(capturedAt: string) {
  return new Date(capturedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
