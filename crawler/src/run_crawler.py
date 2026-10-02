import argparse
import asyncio
import json
import sys
from pathlib import Path

from src.config import settings
from src.scraper import crawl_batch, crawl_url


async def run_single(url: str, output: str | None = None):
    print(f"🕷️ Crawling URL: {url} ...")
    res = await crawl_url(url)
    res_dict = res.model_dump()

    if output:
        out_path = Path(output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(res_dict, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"✅ Saved result to {output}")
    else:
        print(json.dumps(res_dict, indent=2, ensure_ascii=False))


async def run_batch(file_path: str, output: str | None = None):
    p = Path(file_path)
    if not p.exists():
        print(f"❌ File not found: {file_path}", file=sys.stderr)
        sys.exit(1)

    urls = [line.strip() for line in p.read_text(encoding="utf-8").splitlines() if line.strip() and not line.startswith("#")]
    print(f"🕷️ Batch crawling {len(urls)} URLs from {file_path} ...")
    results = await crawl_batch(urls)
    results_list = [r.model_dump() for r in results]

    if output:
        out_path = Path(output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(results_list, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"✅ Saved {len(results_list)} results to {output}")
    else:
        print(json.dumps(results_list, indent=2, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description="Sanghyang Crawl4AI News Crawler CLI & Harvester")
    parser.add_argument("--url", type=str, help="Single URL to crawl")
    parser.add_argument("--urls-file", type=str, help="Path to file containing URLs (one per line)")
    parser.add_argument("--output", "-o", type=str, help="Path to output JSON file")
    parser.add_argument("--serve", action="store_true", help="Start the FastAPI crawler HTTP service")
    parser.add_argument("--host", type=str, default=settings.host, help="Host to bind HTTP server")
    parser.add_argument("--port", type=int, default=settings.port, help="Port to bind HTTP server")

    args = parser.parse_args()

    if args.serve:
        import uvicorn
        from src.server import app

        print(f"🚀 Starting Sanghyang Crawl4AI Service on {args.host}:{args.port} ...")
        uvicorn.run(app, host=args.host, port=args.port)
        return

    if args.url:
        asyncio.run(run_single(args.url, args.output))
    elif args.urls_file:
        asyncio.run(run_batch(args.urls_file, args.output))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
