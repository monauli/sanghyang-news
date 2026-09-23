import { NextResponse } from "next/server";
import { competitorRepository } from "@/lib/market/competitor-repository";
import { NAMA_COOKIE, tokenSah } from "@/lib/sandi";

const auth = (request: Request) => {
  const password = process.env.APP_PASSWORD;
  const token = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${NAMA_COOKIE}=([^;]+)`))?.[1];
  return Boolean(password && tokenSah(token, password));
};
const url = (value: unknown) => value == null ? null : typeof value === "string" && URL.canParse(value) ? value : undefined;
const date = (value: unknown) => value == null ? null : typeof value === "string" && !Number.isNaN(Date.parse(value)) ? new Date(value) : undefined;

export async function GET(request: Request) {
  if (!auth(request)) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("competitorId");
  return NextResponse.json(id ? await competitorRepository.listPriceSnapshots(id) : await competitorRepository.listCompetitors());
}

export async function POST(request: Request) {
  if (!auth(request)) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  if (body.type === "competitor") {
    if (typeof body.name !== "string" || !body.name.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
    const values = [body.websiteUrl, body.bookingUrl, body.socialUrl].map(url);
    if (values.some((value) => value === undefined)) return NextResponse.json({ error: "invalid URL" }, { status: 400 });
    return NextResponse.json(await competitorRepository.createCompetitor({ name: body.name.trim(), websiteUrl: values[0], location: typeof body.location === "string" ? body.location : null, bookingUrl: values[1], socialUrl: values[2], active: body.active === undefined ? true : body.active === true, notes: typeof body.notes === "string" ? body.notes : null }), { status: 201 });
  }
  if (body.type === "priceSnapshot") {
    const checkIn = date(body.checkIn); const checkOut = date(body.checkOut); const observedAt = date(body.observedAt);
    if (typeof body.competitorId !== "string" || typeof body.roomPackage !== "string" || typeof body.source !== "string" || typeof body.price !== "number" || body.price < 0 || checkIn === undefined || checkOut === undefined || observedAt === undefined) return NextResponse.json({ error: "invalid price snapshot" }, { status: 400 });
    const sourceUrl = url(body.sourceUrl);
    if (sourceUrl === undefined || (body.originalPrice !== undefined && (typeof body.originalPrice !== "number" || body.originalPrice < 0)) || (body.discount !== undefined && (typeof body.discount !== "number" || body.discount < 0 || body.discount > 100))) return NextResponse.json({ error: "invalid price snapshot" }, { status: 400 });
    return NextResponse.json(await competitorRepository.createPriceSnapshot({ competitorId: body.competitorId, roomPackage: body.roomPackage, price: body.price, originalPrice: body.originalPrice as number | null, discount: body.discount as number | null, checkIn, checkOut, source: body.source, sourceUrl, observedAt: observedAt ?? undefined }), { status: 201 });
  }
  return NextResponse.json({ error: "type must be competitor or priceSnapshot" }, { status: 400 });
}
