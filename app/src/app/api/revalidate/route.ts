import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * On-demand ISR revalidation endpoint.
 * Called by the Convex data pipeline after each 6h refresh to ensure
 * /llms-full.txt reflects fresh data immediately.
 *
 * Protected by a shared secret — not a public API.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { secret, paths } = body as { secret?: string; paths?: string[] };

  // Validate secret — if not configured, allow (dev mode)
  const expectedSecret = process.env.REVALIDATION_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  if (!paths || !Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json({ error: "No paths provided" }, { status: 400 });
  }

  // Only allow revalidation of known paths
  const allowedPaths = ["/llms-full.txt", "/llms.txt"];
  const validPaths = paths.filter((p) => allowedPaths.includes(p));

  for (const path of validPaths) {
    revalidatePath(path);
  }

  return NextResponse.json({
    revalidated: validPaths,
    at: new Date().toISOString(),
  });
}
