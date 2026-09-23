import { NextResponse } from "next/server";
import { marketItemRepository } from "@/lib/market/market-item-repository";
import type { MarketItemKind } from "@/lib/db-types";

const kinds = new Set(["fnb", "event", "destination"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") ?? undefined;
  const location = url.searchParams.get("location") ?? undefined;
  if (kind && !kinds.has(kind)) return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  return NextResponse.json(await marketItemRepository.list({ kind: kind as MarketItemKind | undefined, location }));
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  if (typeof body.articleId !== "string" || typeof body.kind !== "string" || !kinds.has(body.kind)) {
    return NextResponse.json({ error: "articleId and valid kind are required" }, { status: 400 });
  }
  const item = await marketItemRepository.save({ articleId: body.articleId, kind: body.kind as MarketItemKind, location: typeof body.location === "string" ? body.location : null, venue: typeof body.venue === "string" ? body.venue : null, organizer: typeof body.organizer === "string" ? body.organizer : null, brand: typeof body.brand === "string" ? body.brand : null, tags: Array.isArray(body.tags) && body.tags.every((tag) => typeof tag === "string") ? body.tags as string[] : null });
  return NextResponse.json(item, { status: 201 });
}
