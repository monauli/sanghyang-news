import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { NAMA_COOKIE, tokenSah } from "@/lib/sandi";
import { classifyArticle } from "@/lib/market/classifier";
import { marketItemRepository } from "@/lib/market/market-item-repository";
const uuid = /^[0-9a-f-]{36}$/i;
export async function POST(request: Request) {
  const password = process.env.APP_PASSWORD;
  const token = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${NAMA_COOKIE}=([^;]+)`))?.[1];
  if (!password) return NextResponse.json({ error: "Aplikasi terkunci." }, { status: 503 });
  if (!tokenSah(token, password)) return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  const body = await request.json().catch(() => null) as { articleId?: unknown } | null;
  if (!body || typeof body.articleId !== "string" || !uuid.test(body.articleId)) return NextResponse.json({ error: "articleId is required" }, { status: 400 });
  const article = await db.article.findUnique({ where: { id: body.articleId }, select: { id: true, title: true, content: true, description: true } });
  if (!article) return NextResponse.json({ error: "articleId not found" }, { status: 404 });
  const result = await classifyArticle({ title: article.title, text: article.content || article.description || "" });
  return NextResponse.json(await marketItemRepository.save({ articleId: article.id, ...result }), { status: 201 });
}
