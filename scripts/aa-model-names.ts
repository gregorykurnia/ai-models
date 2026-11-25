// Evaluation sources abbreviate fallback configurations that the master spells out.
export function canonicalModelName(name: string) {
  const fallback = name.match(/^(.*) \((Max|Xhigh|High|Medium|Low), Default Fallback\)$/);
  if (fallback) return `${fallback[1]} (Adaptive Reasoning, ${fallback[2]} Effort, Default Fallback)`;
  // Some AA pages omit Haiku's default fallback suffix.
  const haiku = name.match(/^(Claude Haiku 5\.5) \((Max|Xhigh|High|Medium|Low)\)$/);
  if (haiku) return `${haiku[1]} (Adaptive Reasoning, ${haiku[2]} Effort, Default Fallback)`;
  const opusFallback = name.match(/^(Claude Fable 5) \((Max|Xhigh|High|Medium|Low), Opus 4\.8 Fallback\)$/);
  if (opusFallback) return `${opusFallback[1]} (Adaptive Reasoning, ${opusFallback[2]} Effort, Opus 4.8 Fallback)`;
  // On 25 Nov 2026 AA added "(Max)" to GLM-5.3-Flash under the same model ID; the master keeps its row and key.
  if (name === "GLM-5.3-Flash (Max)") return "GLM-5.3-Flash";
  return name;
}
