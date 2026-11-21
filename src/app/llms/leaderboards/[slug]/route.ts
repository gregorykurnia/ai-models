import { llmsEvaluation } from "@/lib/llms-text";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const text = await llmsEvaluation((await params).slug);
  if (text === null) return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  return new Response(text, {
    headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}
