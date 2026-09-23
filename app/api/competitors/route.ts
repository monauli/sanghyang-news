import { NextResponse } from "next/server";
import { competitorRepository } from "@/lib/market/competitor-repository";
import { db } from "@/lib/db";
import { NAMA_COOKIE, tokenSah } from "@/lib/sandi";

const auth = (request: Request) => {
  const password = process.env.APP_PASSWORD;
  const token = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${NAMA_COOKIE}=([^;]+)`))?.[1];
  return Boolean(password && tokenSah(token, password));
};
const url = (value: unknown) => value == null ? null : typeof value === "string" && URL.canParse(value) && ["http:", "https:"].includes(new URL(value).protocol) ? value : undefined;
const uuid = (value: unknown) => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
const date = (value: unknown) => value == null ? null : typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value)) ? new Date(value) : undefined;

export async function GET(request: Request) {
  if (!auth(request)) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("competitorId");
  const type = new URL(request.url).searchParams.get("type");
  return NextResponse.json(id ? type === "promotion" ? await competitorRepository.listPromotions(id) : type === "review" ? await competitorRepository.listReviews(id) : await competitorRepository.listPriceSnapshots(id) : await competitorRepository.listCompetitors());
}

export async function POST(request: Request) {
  if (!auth(request)) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  if (body.type === "competitor") {
    if (typeof body.name !== "string" || !body.name.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
    const values = [body.websiteUrl, body.googleMapsUrl, body.instagramUrl, body.facebookUrl, body.tiktokUrl, body.bookingUrl, body.socialUrl].map(url);
    if (values.some((value) => value === undefined)) return NextResponse.json({ error: "invalid URL" }, { status: 400 });
    return NextResponse.json(await competitorRepository.createCompetitor({ name: body.name.trim(), websiteUrl: values[0], googleMapsUrl: values[1], instagramUrl: values[2], facebookUrl: values[3], tiktokUrl: values[4], location: typeof body.location === "string" ? body.location : null, bookingUrl: values[5], socialUrl: values[6], active: body.active === undefined ? true : body.active === true, notes: typeof body.notes === "string" ? body.notes : null }), { status: 201 });
  }
  if (body.type === "priceSnapshot") {
    const checkIn = date(body.checkIn); const checkOut = date(body.checkOut); const observedAt = date(body.observedAt);
    if (!uuid(body.competitorId) || (body.roomName != null && typeof body.roomName !== "string") || (body.packageName != null && typeof body.packageName !== "string") || (!body.roomName && !body.packageName) || typeof body.source !== "string" || !body.source.trim() || typeof body.price !== "number" || !Number.isFinite(body.price) || body.price < 0 || checkIn === undefined || checkOut === undefined || observedAt === undefined) return NextResponse.json({ error: "invalid price snapshot" }, { status: 400 });
    const sourceUrl = url(body.sourceUrl);
    if (sourceUrl === undefined || (body.originalPrice !== undefined && (typeof body.originalPrice !== "number" || !Number.isFinite(body.originalPrice) || body.originalPrice < 0)) || (body.discount !== undefined && (typeof body.discount !== "number" || !Number.isFinite(body.discount) || body.discount < 0 || body.discount > 100))) return NextResponse.json({ error: "invalid price snapshot" }, { status: 400 });
    return NextResponse.json(await competitorRepository.createPriceSnapshot({ competitorId: body.competitorId as string, roomName: body.roomName as string | null, packageName: body.packageName as string | null, price: body.price, originalPrice: body.originalPrice as number | null, discount: body.discount as number | null, checkIn, checkOut, source: body.source, sourceUrl, observedAt: observedAt as Date, currency: typeof body.currency === "string" ? body.currency : "IDR", guests: typeof body.guests === "number" ? body.guests : 2 }), { status: 201 });
  }
  if (body.type === "sanghyangPriceSnapshot") {
    const checkIn = date(body.checkIn); const checkOut = date(body.checkOut); const observedAt = date(body.observedAt);
    const sourceUrl = url(body.sourceUrl);
    if (typeof body.roomName !== "string" || !body.roomName.trim() || typeof body.source !== "string" || !body.source.trim() || typeof body.price !== "number" || !Number.isFinite(body.price) || body.price < 0 || checkIn == null || checkOut == null || observedAt == null || sourceUrl === undefined || (body.guests !== undefined && (typeof body.guests !== "number" || !Number.isInteger(body.guests) || body.guests < 1 || body.guests > 20))) return NextResponse.json({ error: "invalid Sanghyang price snapshot" }, { status: 400 });
    return NextResponse.json(await db.sanghyangPriceSnapshot.create({ data: { roomName: body.roomName.trim(), packageName: typeof body.packageName === "string" ? body.packageName : null, price: body.price, originalPrice: body.originalPrice as number | null, discount: body.discount as number | null, currency: typeof body.currency === "string" ? body.currency : "IDR", guests: typeof body.guests === "number" ? body.guests : 2, checkIn, checkOut, source: body.source.trim(), sourceUrl, observedAt } }), { status: 201 });
  }
  if (body.type === "promotion") {
    const startsAt = date(body.startsAt); const endsAt = date(body.endsAt); const capturedAt = date(body.capturedAt);
    const sourceUrl = url(body.sourceUrl); const imageUrl = url(body.imageUrl);
    const validNumber = (value: unknown) => value === undefined || value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
    if (!uuid(body.competitorId) || typeof body.title !== "string" || !body.title.trim() || typeof body.category !== "string" || !body.category.trim() || typeof body.source !== "string" || !body.source.trim() || startsAt == null || capturedAt == null || endsAt === undefined || sourceUrl === undefined || imageUrl === undefined || !validNumber(body.price) || !validNumber(body.originalPrice) || !validNumber(body.discount) || (typeof body.discount === "number" && body.discount > 100)) return NextResponse.json({ error: "invalid promotion" }, { status: 400 });
    const competitor = await competitorRepository.findCompetitor(body.competitorId as string);
    if (!competitor) return NextResponse.json({ error: "competitor not found" }, { status: 404 });
    return NextResponse.json(await competitorRepository.createPromotion({ competitorId: body.competitorId as string, title: body.title.trim(), category: body.category.trim(), description: typeof body.description === "string" ? body.description : null, startsAt: startsAt as Date, endsAt: endsAt as Date | null, price: body.price as number | null, originalPrice: body.originalPrice as number | null, discount: body.discount as number | null, source: body.source.trim(), sourceUrl, imageUrl, capturedAt: capturedAt as Date }), { status: 201 });
  }
  if (body.type === "review") {
    const reviewDate = date(body.reviewDate); const capturedAt = date(body.capturedAt); const sourceUrl = url(body.sourceUrl);
    const sentiments = ["positive", "neutral", "negative"];
    const themes = ["room", "food", "service", "beach", "cleanliness", "facilities", "family", "value"];
    const validThemes = Array.isArray(body.themes) && body.themes.length > 0 && body.themes.every((item) => typeof item === "string" && themes.includes(item));
    if (!uuid(body.competitorId) || typeof body.externalId !== "string" || !body.externalId.trim() || typeof body.source !== "string" || !body.source.trim() || sourceUrl === undefined || typeof body.rating !== "number" || !Number.isFinite(body.rating) || body.rating < 0 || body.rating > 5 || reviewDate == null || capturedAt == null || typeof body.text !== "string" || !body.text.trim() || typeof body.sentiment !== "string" || !sentiments.includes(body.sentiment) || !validThemes) return NextResponse.json({ error: "invalid review" }, { status: 400 });
    const competitor = await competitorRepository.findCompetitor(body.competitorId as string);
    if (!competitor) return NextResponse.json({ error: "competitor not found" }, { status: 404 });
    return NextResponse.json(await competitorRepository.createReview({ competitorId: body.competitorId as string, externalId: body.externalId.trim(), source: body.source.trim(), sourceUrl: sourceUrl as string, rating: body.rating, reviewDate: reviewDate as Date, title: typeof body.title === "string" ? body.title : null, text: body.text.trim(), sentiment: body.sentiment as "positive" | "neutral" | "negative", themes: body.themes as string[], capturedAt: capturedAt as Date }), { status: 201 });
  }
  return NextResponse.json({ error: "type must be competitor, priceSnapshot, or sanghyangPriceSnapshot" }, { status: 400 });
}

export async function PATCH(request: Request) {
  if (!auth(request)) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !uuid(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid json" }, { status: 400 });
  const data: Record<string, unknown> = {};
  for (const key of ["name", "location", "notes", "websiteUrl", "googleMapsUrl", "instagramUrl", "facebookUrl", "tiktokUrl", "bookingUrl", "socialUrl"]) if (key in body) { const value = key === "name" ? body[key] : url(body[key]); if (value === undefined || (key === "name" && (typeof value !== "string" || !value.trim()))) return NextResponse.json({ error: "invalid competitor" }, { status: 400 }); data[key] = key === "name" ? (value as string).trim() : value; }
  if ("active" in body) { if (typeof body.active !== "boolean") return NextResponse.json({ error: "invalid active" }, { status: 400 }); data.active = body.active; }
  return NextResponse.json(await competitorRepository.updateCompetitor(id, data));
}

export async function DELETE(request: Request) {
  if (!auth(request)) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !uuid(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  await competitorRepository.deleteCompetitor(id);
  return new NextResponse(null, { status: 204 });
}
