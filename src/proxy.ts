import { NextResponse, type NextRequest } from "next/server";
import { workflows } from "@/lib/workflow-registry";

export function proxy(request: NextRequest) {
  const segment = request.nextUrl.pathname.split("/")[2];
  let slug: string | undefined;
  try {
    slug = decodeURIComponent(segment);
  } catch {
    // An invalid encoding cannot identify a registered workflow.
  }
  if (workflows.some(workflow => workflow.slug === slug)) return NextResponse.next();

  // Resolve missing slugs before the root loading boundary starts streaming.
  return NextResponse.rewrite(new URL("/404", request.url));
}

export const config = { matcher: "/workflows/:slug" };
