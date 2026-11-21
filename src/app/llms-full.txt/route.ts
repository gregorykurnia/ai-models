import { llmsFull } from "@/lib/llms-text";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(await llmsFull(), {
    headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}
