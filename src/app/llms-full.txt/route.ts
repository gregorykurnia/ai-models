import { llmsFull } from "@/lib/llms-text";

export const revalidate = 300;

export async function GET() {
  return new Response(await llmsFull(), {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}
