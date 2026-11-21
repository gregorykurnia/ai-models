import { llmsIndex } from "@/lib/llms-text";

export const revalidate = 300;

export async function GET() {
  return new Response(await llmsIndex(), {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}
