import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  try {
    decodeURI(request.nextUrl.pathname);
  } catch {
    // Handle undecodable slugs before Next.js tries the prerendered route.
    return NextResponse.rewrite(new URL("/404", request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: "/workflows/:slug" };
