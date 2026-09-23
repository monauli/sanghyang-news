import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { NAMA_COOKIE, tokenSah } from "@/lib/sandi";
import { generateInsights, INSIGHT_STATUSES, INSIGHT_TYPES } from "@/lib/market/insights";
import type { GeneratedInsight } from "@/lib/market/insights";
import { insightFingerprint, insightRepository } from "@/lib/market/insight-repository";

const auth = (request: Request) => { const password = process.env.APP_PASSWORD; const token = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${NAMA_COOKIE}=([^;]+)`))?.[1]; return Boolean(password && tokenSah(token, password)); };
const valid = (value: unknown, values: readonly string[]) => value === undefined || (typeof value === "string" && values.includes(value));

export async function GET(request: Request) {
  if (!auth(request)) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  if (!valid(params.get("type") ?? undefined, INSIGHT_TYPES) || !valid(params.get("status") ?? undefined, INSIGHT_STATUSES)) return NextResponse.json({ error: "invalid filters" }, { status: 400 });
  return NextResponse.json(await insightRepository.list({ type: params.get("type") as never || undefined, status: params.get("status") as never || undefined }));
}

export async function createInsightsPost(request: Request, deps = { repository: insightRepository, generate: generateInsights, findData: async () => {
  const [items, prices, promotions, reviews] = await Promise.all([
    db.marketItem.findMany({ orderBy: { createdAt: "desc" } }), db.competitorPriceSnapshot.findMany({ orderBy: { observedAt: "desc" } }),
    db.competitorPromotion.findMany({ orderBy: { capturedAt: "desc" } }), db.competitorReview.findMany({ orderBy: { capturedAt: "desc" } }),
  ]);
  return { items, prices, promotions, reviews };
} }) {
  if (!auth(request)) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  const { items, prices, promotions, reviews } = await deps.findData();
  const rows = [...items.map(x => ({ date: x.createdAt.toISOString(), category: x.kind, source: "Market news", headline: x.description ?? "Market item", sentiment: "positive" as const })), ...prices.map(x => ({ date: x.observedAt.toISOString(), category: "competitor", source: x.source, headline: `${x.roomName ?? x.packageName ?? "Rate"} ${x.price}`, sentiment: "neutral" as const })), ...promotions.map(x => ({ date: x.capturedAt.toISOString(), category: "promotion", source: x.source, headline: x.title, sentiment: "neutral" as const })), ...reviews.map(x => ({ date: x.capturedAt.toISOString(), category: "review", source: x.source, headline: x.text, sentiment: x.sentiment as "positive" | "neutral" | "negative" }))];
  const generated = await deps.generate({ rows, counts: { marketItems: items.length, competitors: new Set(prices.map(x => x.competitorId)).size, promotions: promotions.length, reviews: reviews.length } });
  const active = await deps.repository.list({ status: "active" });
  const existing = new Set(active.map(x => {
    const row = x as { fingerprint?: unknown; type: GeneratedInsight["type"]; title: string; summary: string };
    return typeof row.fingerprint === "string" && row.fingerprint ? row.fingerprint : insightFingerprint(row);
  }));
  const saved = await Promise.all(generated.filter(item => !existing.has(insightFingerprint(item))).map(item => deps.repository.create(item)));
  return NextResponse.json(saved, { status: 201 });
}

export async function POST(request: Request) { return createInsightsPost(request); }
