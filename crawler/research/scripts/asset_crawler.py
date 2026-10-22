import asyncio
import hashlib
import json
import os
from pathlib import Path

import httpx
from bs4 import BeautifulSoup
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig

TARGETS = [
    {
        "outlet": "sanghyang_resort",
        "entity_id": "business",
        "platform": "instagram",
        "url": "https://www.instagram.com/sanghyangresort?igsh=MWg0N296cWo3eGJzbg%3D%3D",
        "clean_url": "https://www.instagram.com/sanghyangresort/",
    },
    {
        "outlet": "sunset_grill",
        "entity_id": "sunset-grill",
        "platform": "instagram",
        "url": "https://www.instagram.com/sunsetgrillsanghyang?igsh=YmY4dnozc21xM3o1",
        "clean_url": "https://www.instagram.com/sunsetgrillsanghyang/",
    },
    {
        "outlet": "dragon_beach_club",
        "entity_id": "dragon-beach-club",
        "platform": "instagram",
        "url": "https://www.instagram.com/dragonbeachclub?igsh=YXg1YzU3a3VobnJj",
        "clean_url": "https://www.instagram.com/dragonbeachclub/",
    },
    {
        "outlet": "dbistro",
        "entity_id": "dbistro",
        "platform": "instagram",
        "url": "https://www.instagram.com/dbistro.anyer?igsh=NHFsYWs3NzZzcmx5",
        "clean_url": "https://www.instagram.com/dbistro.anyer/",
    },
    {
        "outlet": "sanghyang_resort_tiktok",
        "entity_id": "business",
        "platform": "tiktok",
        "url": "https://www.tiktok.com/@sanghyangsparesort?_r=1&_t=ZS-97PcB8SiHye",
        "clean_url": "https://www.tiktok.com/@sanghyangsparesort",
    },
    {
        "outlet": "dragon_beach_club_tiktok",
        "entity_id": "dragon-beach-club",
        "platform": "tiktok",
        "url": "https://www.tiktok.com/@dragonbeachclub?_r=1&_t=ZS-97PcFZpupd7",
        "clean_url": "https://www.tiktok.com/@dragonbeachclub",
    },
]

TARGET_DIRS = [
    Path(r"D:\home\user\Documents\sanghyang\pipelines\asset_crawler\data\media"),
    Path(r"C:\home\user\Documents\sanghyang\pipelines\asset_crawler\data\media"),
    Path(r"d:\WORKSPACE\PROJECTS\CRAWLAIBWP\pipelines\asset_crawler\data\media"),
    Path(os.path.expanduser("~"))
    / "Documents"
    / "sanghyang"
    / "pipelines"
    / "asset_crawler"
    / "data"
    / "media",
]

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"


async def download_asset(client: httpx.AsyncClient, media_url: str) -> tuple[bytes, str] | None:
    try:
        res = await client.get(media_url, timeout=20.0)
        if res.status_code == 200 and len(res.content) > 500:
            content_type = res.headers.get("content-type", "")
            ext = ".jpg"
            if "png" in content_type:
                ext = ".png"
            elif "webp" in content_type:
                ext = ".webp"
            elif "mp4" in content_type or "video" in content_type:
                ext = ".mp4"
            return res.content, ext
    except Exception:
        pass
    return None


async def crawl_and_collect_assets():
    for target_dir in TARGET_DIRS:
        try:
            target_dir.mkdir(parents=True, exist_ok=True)
        except Exception:
            pass

    primary_dir = TARGET_DIRS[0]
    primary_dir.mkdir(parents=True, exist_ok=True)
    print(f"Primary output directory: {primary_dir}")

    browser_cfg = BrowserConfig(
        headless=True,
        verbose=False,
        user_agent=USER_AGENT,
    )
    run_cfg = CrawlerRunConfig(
        wait_for="body",
        delay_before_return_html=3.5,
    )

    seen_hashes: dict[str, str] = {}
    collected_manifest: list[dict] = []
    outlet_reviews: list[dict] = []

    http_headers = {
        "User-Agent": USER_AGENT,
        "Accept": "*/*",
        "Referer": "https://www.instagram.com/",
    }

    async with httpx.AsyncClient(headers=http_headers, follow_redirects=True) as http_client:
        async with AsyncWebCrawler(config=browser_cfg) as crawler:
            for item in TARGETS:
                outlet = item["outlet"]
                target_url = item["clean_url"]
                platform = item["platform"]
                print("\n=======================================================")
                print(f"Crawling {outlet} on {platform} via Crawl4AI...")
                print(f"URL: {target_url}")

                res = await crawler.arun(url=target_url, config=run_cfg)
                if not res.success:
                    print(f"Warning: crawl failed for {target_url}, error: {res.error_message}")
                    continue

                html = res.html or ""
                soup = BeautifulSoup(html, "html.parser")

                media_candidates = []

                # 1. Images from Crawl4AI media extraction
                for img in res.media.get("images", []):
                    u = img.get("src") or img.get("url")
                    if (
                        u
                        and u.startswith("http")
                        and not any(skip in u for skip in ["static.cdninstagram", "rsrc.php", "emoji"])
                    ):
                        media_candidates.append(("image", u, img.get("alt") or ""))

                # 2. Videos from Crawl4AI media extraction
                for vid in res.media.get("videos", []):
                    u = vid.get("src") or vid.get("url")
                    if u and u.startswith("http"):
                        media_candidates.append(("video", u, ""))

                # 3. OpenGraph tags
                og_img = soup.find("meta", property="og:image")
                if og_img and og_img.get("content"):
                    media_candidates.append(("image", og_img["content"], "OpenGraph Image"))

                # 4. TikTok Specific State
                if platform == "tiktok":
                    tiktok_state = soup.find("script", id="__UNIVERSAL_DATA_FOR_REHYDRATION__")
                    if tiktok_state and tiktok_state.string:
                        try:
                            data = json.loads(tiktok_state.string)
                            user_detail = data.get("__DEFAULT_SCOPE__", {}).get("webapp.user-detail", {})
                            user = user_detail.get("userInfo", {}).get("user", {})
                            stats = user_detail.get("userInfo", {}).get("stats", {})
                            nickname = user.get("nickname", "")
                            signature = user.get("signature", "")
                            avatar = user.get("avatarLarger") or user.get("avatarMedium")
                            if avatar:
                                media_candidates.append(("image", avatar, f"Avatar {nickname}"))

                            outlet_reviews.append(
                                {
                                    "outlet": outlet,
                                    "entity_id": item["entity_id"],
                                    "platform": "tiktok",
                                    "user": nickname,
                                    "signature": signature,
                                    "stats": stats,
                                    "text": f"Profil resmi TikTok {nickname}: {signature}. Pengikut: {stats.get('followerCount')}, Disukai: {stats.get('heartCount')}.",
                                }
                            )
                        except Exception as e:
                            print(f"Error parsing TikTok data: {e}")

                # 5. Extract review texts / descriptions from Instagram meta
                og_desc = soup.find("meta", property="og:description")
                if og_desc and og_desc.get("content"):
                    outlet_reviews.append(
                        {
                            "outlet": outlet,
                            "entity_id": item["entity_id"],
                            "platform": platform,
                            "text": og_desc["content"],
                        }
                    )

                # Deduplicate URL candidates locally for this outlet
                unique_urls = []
                seen_urls = set()
                for m_type, m_url, m_alt in media_candidates:
                    if m_url not in seen_urls:
                        seen_urls.add(m_url)
                        unique_urls.append((m_type, m_url, m_alt))

                print(f"Found {len(unique_urls)} unique media URL candidates for {outlet}.")

                downloaded_for_outlet = 0
                for _idx, (m_type, m_url, m_alt) in enumerate(unique_urls, 1):
                    download_res = await download_asset(http_client, m_url)
                    if not download_res:
                        continue
                    content, ext = download_res

                    # Deduplication by content hash
                    chash = hashlib.sha256(content).hexdigest()
                    if chash in seen_hashes:
                        print(
                            f"  [DUP DETECTED] Duplicate content with {seen_hashes[chash]} - Skipping to keep assets unique!"
                        )
                        continue

                    filename = f"{outlet}_{downloaded_for_outlet + 1:03d}_{chash[:8]}{ext}"
                    seen_hashes[chash] = filename

                    # Save to all target directories
                    for tdir in TARGET_DIRS:
                        try:
                            tdir.mkdir(parents=True, exist_ok=True)
                            fpath = tdir / filename
                            fpath.write_bytes(content)
                        except Exception:
                            pass

                    downloaded_for_outlet += 1
                    file_size = len(content)

                    collected_manifest.append(
                        {
                            "filename": filename,
                            "outlet": outlet,
                            "entity_id": item["entity_id"],
                            "platform": platform,
                            "media_type": m_type,
                            "source_url": target_url,
                            "cdn_url": m_url,
                            "content_hash": chash,
                            "file_size_bytes": file_size,
                            "description": m_alt,
                        }
                    )

                print(f"Successfully downloaded {downloaded_for_outlet} UNIQUE media assets for {outlet}.")

    # Save manifest.json
    manifest_payload = {
        "total_unique_assets": len(collected_manifest),
        "target_directories": [str(p) for p in TARGET_DIRS],
        "assets": collected_manifest,
        "reviews_and_descriptions": outlet_reviews,
    }

    for tdir in TARGET_DIRS:
        try:
            m_path = tdir / "manifest.json"
            m_path.write_text(json.dumps(manifest_payload, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass

    print("\n=======================================================")
    print(f"TOTAL UNIQUE ASSETS SAVED: {len(collected_manifest)}")
    print("Assets saved across all target directories including:")
    print(f"- {primary_dir}")
    print(f"- {TARGET_DIRS[2]}")
    return manifest_payload


if __name__ == "__main__":
    asyncio.run(crawl_and_collect_assets())
