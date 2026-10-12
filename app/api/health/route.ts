import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { model } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isReadiness = searchParams.has("ready");

  // Shallow Liveness Probe (Instant in-memory 200, 0 external network dependencies)
  if (!isReadiness) {
    return NextResponse.json(
      {
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  }

  // Deep Readiness Probe (Verifies PostgreSQL DB connectivity & Gemini Model config <= 2s)
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const dbPromise = db.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error("Database readiness timeout")), 2000);
    });

    await Promise.race([dbPromise, timeoutPromise]);

    const activeModel = model();
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY?.trim());

    return NextResponse.json(
      {
        status: "ready",
        database: "connected",
        gemini: {
          configured: hasGeminiKey,
          model: activeModel,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        database: "disconnected",
        error: "Readiness check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

