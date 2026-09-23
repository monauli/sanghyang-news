import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { marketItemRepository } from "@/lib/market/market-item-repository";
import type { MarketItemKind } from "@/lib/db-types";
import { NAMA_COOKIE, tokenSah } from "@/lib/sandi";

const kinds = new Set(["fnb", "event", "destination"]);
const isoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") ?? undefined;
  const location = url.searchParams.get("location") ?? undefined;
  if (kind && !kinds.has(kind)) return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  return NextResponse.json(await marketItemRepository.list({ kind: kind as MarketItemKind | undefined, location }));
}

export async function POST(request: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.json({ error: "Aplikasi terkunci." }, { status: 503 });
  const token = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${NAMA_COOKIE}=([^;]+)`))?.[1];
  if (!tokenSah(token, password)) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  if (typeof body.articleId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.articleId) || typeof body.kind !== "string" || !kinds.has(body.kind)) {
    return NextResponse.json({ error: "articleId and valid kind are required" }, { status: 400 });
  }
  const parseDate = (value: unknown) => value == null ? null : typeof value === "string" && isoDateTime.test(value) && !Number.isNaN(Date.parse(value)) ? new Date(value) : undefined;
  const startsAt = parseDate(body.startsAt);
  const endsAt = parseDate(body.endsAt);
  if (startsAt === undefined || endsAt === undefined) return NextResponse.json({ error: "startsAt and endsAt must be ISO dates" }, { status: 400 });
  const article = await db.article.findUnique({ where: { id: body.articleId }, select: { id: true } });
  if (!article) return NextResponse.json({ error: "articleId not found" }, { status: 400 });
  const item = await marketItemRepository.save({ articleId: body.articleId, kind: body.kind as MarketItemKind, location: typeof body.location === "string" ? body.location : null, venue: typeof body.venue === "string" ? body.venue : null, organizer: typeof body.organizer === "string" ? body.organizer : null, brand: typeof body.brand === "string" ? body.brand : null, startsAt, endsAt, tags: Array.isArray(body.tags) && body.tags.every((tag) => typeof tag === "string") ? body.tags as string[] : null });
  return NextResponse.json(item, { status: 201 });
}
