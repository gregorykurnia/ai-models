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
