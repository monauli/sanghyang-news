import { runNewsNow, NewsRunInProgressError } from "@/lib/market/run-news";
import { sandiCocok } from "@/lib/sandi";

type RunNews = () => Promise<{ runId: string; status: string }>;

function authorized(request: Request, secret = process.env.CRON_SECRET): boolean {
  const value = request.headers.get("authorization");
  return Boolean(secret && value?.startsWith("Bearer ") && sandiCocok(value.slice(7), secret));
}

export function createCronScrapeHandler(run: RunNews = runNewsNow, secret = process.env.CRON_SECRET) {
  return async function GET(request: Request) {
    if (!authorized(request, secret)) return Response.json({ error: "Unauthorized." }, { status: 401 });
    try {
      const result = await run();
      return Response.json({ ok: true, ...result }, { status: 200 });
    } catch (error) {
      if (error instanceof NewsRunInProgressError) return Response.json({ ok: false, status: "running" }, { status: 409 });
      return Response.json({ ok: false, status: "failed" }, { status: 500 });
    }
  };
}

export const GET = createCronScrapeHandler();
