import { readFileSync, writeFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const html = readFileSync(new URL("index.html", import.meta.url), "utf8");
const template = readFileSync(new URL("template.html", import.meta.url), "utf8");

function embeddedJson(name) {
  const match = html.match(new RegExp(`^const ${name} = ([^\\r\\n]+);$`, "m"));
  if (!match) throw new Error(`index.html is missing the ${name} JSON declaration`);
  return JSON.parse(match[1]);
}

const DATA = embeddedJson("DATA");
const profiles = embeddedJson("PROFILES");
const start = template.indexOf("\nconst esc =");
const end = template.indexOf("\nfunction render()", start);
if (start < 0 || end < 0) throw new Error("template.html is missing the personality helper block");

// Evaluate the page's scoring helpers without running its DOM rendering code.
const { r0, rankText, refFor, personalityTypes, similarModels, ENN } = runInNewContext(
  `${template.slice(start, end)}\n({ r0, rankText, refFor, personalityTypes, similarModels, ENN });`,
  { DATA },
);

const models = Object.entries(DATA.models);
const artifact = "https://claude.ai/artifact/5XNehhaSU7LnZ18MCfZatJ";
const text = value => String(value).replace(/[\\`*_[\]<>]/g, "\\$&");
const cell = value => text(value).replace(/\|/g, "\\|");
const score = value => value == null ? "—" : r0(value);
const label = metric => metric.lower ? `${metric.label} (lower is better)` : metric.label;

function table(headers, rows) {
  const row = values => `| ${values.map(cell).join(" | ")} |`;
  return [row(headers), row(headers.map(() => "---")), ...rows.map(row)].join("\n");
}

function ordinal(value) {
  const suffix = value % 100 >= 11 && value % 100 <= 13
    ? "th"
    : { 1: "st", 2: "nd", 3: "rd" }[value % 10] ?? "th";
  return `${value}${suffix}`;
}

function cardList(profile, cards = []) {
  return cards.map(card => {
    const refs = card.refs.map(ref => {
      const metric = refFor(profile, ref);
      const value = metric.v == null ? "—" : `${ordinal(r0(metric.v))} pct (${metric.rk})`;
      return `  - ${text(label(metric))}: ${value}`;
    });
    return [`- **${text(card.title)}.** ${text(card.body)}`, ...refs].join("\n");
  }).join("\n");
}

function profileTable(profile, model) {
  const previous = DATA.models[profile.previous];
  const headers = ["Metric", "Percentile", "Rank"];
  if (previous) headers.push(`${profile.previous} percentile`, "Change (pct points)");

  function metricRow(kind, metric, name) {
    const value = model[kind][metric.key];
    const row = [name, score(value), value == null ? "—" : rankText(kind, metric.key, value, metric.lower)];
    if (previous) {
      const before = previous[kind][metric.key];
      const change = value == null || before == null ? null : r0(value) - r0(before);
      row.push(score(before), change == null ? "—" : change > 0 ? `+${change}` : change);
    }
    return row;
  }

  const indexes = DATA.indexes.map(index => metricRow("i", index, label({ ...index, label: `${index.label} index` })));
  const traits = DATA.indexes.flatMap(index => index.traits.map(trait => metricRow("t", trait, label(trait))));
  return table(headers, [...indexes, ...traits]);
}

const list = (items = []) => items.filter(Boolean).map(item => `- ${text(item)}`).join("\n");
const matches = rows => list(rows.map(row => `${row.name} (${r0(row.match)}% match)`));
const subsection = (heading, body) => body ? `### ${heading}\n\n${body}` : "";

function renderProfile(profile) {
  const model = DATA.models[profile.model];
  const { mbti, enneagram } = personalityTypes(model);
  const { type, wing } = enneagram;
  const { closest, opposite } = similarModels(profile.model);
  const sections = [
    `## ${text(profile.display)}`,
    list([
      `Variant: ${profile.variant}`,
      `Maker: ${profile.maker}`,
      profile.archetype && `Archetype: ${profile.archetype.name}. ${profile.archetype.line}`,
      `Tagline: ${profile.tagline}`,
    ]),
    subsection("Personality types", list([
      `MBTI: ${mbti}`,
      `Enneagram: ${type}w${wing} (${ENN[type].name}, ${ENN[wing].name} wing)`,
      profile.typesNote,
    ])),
    subsection("Summary", list(profile.summary)),
    subsection("Strengths", cardList(profile, profile.strengths)),
    subsection("Gaps", cardList(profile, profile.gaps)),
    subsection("Versus", list(profile.versus)),
    subsection("Tips", list(profile.tips)),
    subsection("Best for", cardList(profile, profile.bestFor)),
    subsection("Worst for", cardList(profile, profile.worstFor)),
    subsection("Indexes and traits", profileTable(profile, model)),
    subsection("Closest models", matches(closest)),
    subsection("Most opposite models", matches(opposite)),
  ];
  return sections.filter(Boolean).join("\n\n");
}

function benchTable(kind, metrics) {
  return table(["Model", ...metrics.map(label)], models.map(([name, model]) => [
    name, ...metrics.map(metric => score(model[kind][metric.key])),
  ]));
}

const markdown = [
  "# AI model personality profiles",
  [
    `- Written profiles and writing-style scores from Artificial Analysis’s [AA-PersonalityBench](${DATA.source}).`,
    `- Captured ${DATA.captured}. The benchmark compares ${models.length} models.`,
    "- A higher percentile means more of the trait. Sycophantic and Slop are marked lower is better, including the Slop index.",
    "- Percentiles are rounded as on the interactive page. Ranks use the underlying values. Changes show the difference between the displayed percentiles.",
    "- The MBTI and Enneagram types are calculated from the scores for fun. Match percentages reflect how close two models are across all 30 traits.",
    `- [Interactive personality profiles](${artifact})`,
  ].join("\n"),
  ...profiles.map(renderProfile),
  "## All models",
  "### Index percentiles", benchTable("i", DATA.indexes),
  ...DATA.indexes.flatMap(index => [`### ${text(index.label)} trait percentiles`, benchTable("t", index.traits)]),
].join("\n\n") + "\n";

writeFileSync(new URL("profiles.md", import.meta.url), markdown);
console.log(`wrote profiles.md: ${profiles.length} profile(s), ${models.length} models in field`);
