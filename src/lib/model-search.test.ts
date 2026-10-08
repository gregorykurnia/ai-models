import assert from "node:assert/strict";
import test from "node:test";
import { matchesModelSearch, parseModelSearchTerms } from "./model-search";

test("parses comma-separated terms, ignoring case, extra spaces, empty terms, and duplicates", () => {
  assert.deepEqual(parseModelSearchTerms(" SOL , haiku,, sol, "), ["sol", "haiku"]);
});

test("matches any keyword as a case-insensitive literal substring", () => {
  const terms = parseModelSearchTerms("sol, haiku");
  assert.equal(matchesModelSearch("Claude 3.5 Haiku", terms), true);
  assert.equal(matchesModelSearch("GPT-6.1-Sol", terms), true);
  assert.equal(matchesModelSearch("Claude 3.7 Sonnet", terms), false);
});

test("keeps spaces and punctuation inside each keyword literal", () => {
  assert.equal(matchesModelSearch("Claude 3.5 Haiku", parseModelSearchTerms("claude 3.5")), true);
  assert.equal(matchesModelSearch("Model [v2]", parseModelSearchTerms("[v2]")), true);
  assert.equal(matchesModelSearch("Model v2", parseModelSearchTerms("[v2]")), false);
});

test("matches an empty query and still returns matching terms when another term has no results", () => {
  assert.equal(matchesModelSearch("Any model", parseModelSearchTerms(" ,, ")), true);
  assert.equal(matchesModelSearch("GPT-6.1-Sol", parseModelSearchTerms("sol, missing")), true);
});
