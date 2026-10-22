import { NextResponse } from "next/server";
import { generateSocialContentDrafts, type ContentDraftInput } from "@/lib/market/ai-content-generator";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
    }

    const payload = body as Partial<ContentDraftInput>;

    if (!payload.competitorName || !payload.promoTitle || !payload.counterStrategy) {
      return NextResponse.json(
        { error: "competitorName, promoTitle, dan counterStrategy wajib diisi" },
        { status: 400 }
      );
    }

    const input: ContentDraftInput = {
      competitorName: String(payload.competitorName).slice(0, 150),
      promoTitle: String(payload.promoTitle).slice(0, 200),
      promoCategory: String(payload.promoCategory || "Umum").slice(0, 80),
      counterStrategy: String(payload.counterStrategy).slice(0, 500),
      outletName: payload.outletName ? String(payload.outletName).slice(0, 100) : undefined,
    };

    const bundle = await generateSocialContentDrafts(input);

    return NextResponse.json({ success: true, data: bundle });
  } catch (error) {
    console.error("[generate-content] Error:", error);
    return NextResponse.json(
      { error: "Gagal membuat draf konten AI", details: (error as Error)?.message },
      { status: 500 }
    );
  }
}

