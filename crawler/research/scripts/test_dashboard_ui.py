import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright

if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

SCREENSHOT_DIR = Path("C:/Users/simon/.gemini/antigravity/brain/729740bc-af4e-45fa-b18e-4f62a735077f")


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        print("Navigating to http://127.0.0.1:8000/ ...")
        await page.goto("http://127.0.0.1:8000/", wait_until="networkidle")
        await asyncio.sleep(2)

        # 1. Screenshot Dashboard Matriks Kartu (Grid)
        grid_shot = SCREENSHOT_DIR / "dashboard_grid_separated.png"
        await page.screenshot(path=str(grid_shot), full_page=False)
        print(f"Captured grid view: {grid_shot}")

        # Verify Unit Bisnis Kita & Benchmark Kompetitor exist
        unit_cards = await page.locator("#unit-grid .unit-card").count()
        comp_cards = await page.locator("#competitor-grid .unit-card").count()
        print(
            f"Verified: {unit_cards} Unit Bisnis Kita cards and {comp_cards} Benchmark Kompetitor cards rendered!"
        )
        assert unit_cards >= 6, f"Expected at least 6 internal unit cards, found {unit_cards}"
        assert comp_cards >= 8, f"Expected at least 8 competitor cards, found {comp_cards}"

        # 2. Klik Tab Feed Komentar & Ulasan
        feed_btn = page.locator("#btnFeed")
        await feed_btn.click()
        await asyncio.sleep(1)

        # Test Segmented Nav Button [⚔️ Benchmark Kompetitor]
        comp_segment_btn = page.locator("#btnFeedCompetitors")
        await comp_segment_btn.click()
        await asyncio.sleep(1)
        comp_shot = SCREENSHOT_DIR / "dashboard_feed_all_competitors.png"
        await page.screenshot(path=str(comp_shot), full_page=False)
        print(f"Captured all competitors feed view via segmented pill: {comp_shot}")

        # Test Segmented Nav Button [👑 Unit Bisnis Kita]
        internal_segment_btn = page.locator("#btnFeedInternal")
        await internal_segment_btn.click()
        await asyncio.sleep(1)
        feed_shot = SCREENSHOT_DIR / "dashboard_comment_feed.png"
        await page.screenshot(path=str(feed_shot), full_page=False)
        print(f"Captured comment feed view: {feed_shot}")

        # 3. Test Filter Kategori di Feed Ulasan (Pilih Dragon Beach Club)
        feed_cat = page.locator("#feed-filter-category")
        await feed_cat.select_option("dragon-beach-club")
        await asyncio.sleep(1)

        dragon_shot = SCREENSHOT_DIR / "dashboard_feed_dragon_beach_club.png"
        await page.screenshot(path=str(dragon_shot), full_page=False)
        print(f"Captured Dragon Beach Club feed view: {dragon_shot}")

        # 4. Test Filter Platform Facebook
        feed_platform = page.locator("#feed-filter-platform")
        await feed_platform.select_option("Facebook")
        await feed_cat.select_option(index=0)
        await asyncio.sleep(1)
        fb_shot = SCREENSHOT_DIR / "dashboard_feed_facebook.png"
        await page.screenshot(path=str(fb_shot), full_page=False)
        print(f"Captured Facebook feed view: {fb_shot}")

        # 5. Test Filter Platform YouTube
        await feed_platform.select_option("YouTube")
        await asyncio.sleep(1)
        yt_shot = SCREENSHOT_DIR / "dashboard_feed_youtube.png"
        await page.screenshot(path=str(yt_shot), full_page=False)
        print(f"Captured YouTube feed view: {yt_shot}")

        # 6. Test Filter Lighthouse Bar Mambruk
        await feed_platform.select_option("")
        await feed_cat.select_option("competitor-lighthouse")
        await asyncio.sleep(1)
        lh_shot = SCREENSHOT_DIR / "dashboard_feed_lighthouse.png"
        await page.screenshot(path=str(lh_shot), full_page=False)
        print(f"Captured Lighthouse Bar feed view: {lh_shot}")

        # 7. Test Tab Dasbor Analitik (Split Tables)
        analytics_btn = page.locator("#btnAnalytics")
        await analytics_btn.click()
        await asyncio.sleep(1)
        summary_rows = await page.locator("#summary-rows tr").count()
        comp_summary_rows = await page.locator("#competitor-summary-rows tr").count()
        print(
            f"Verified analytics: {summary_rows} rows in Unit Kita table, {comp_summary_rows} rows in Kompetitor table"
        )
        assert summary_rows >= 6, "Expected at least 6 rows in Unit Kita summary table"
        assert comp_summary_rows >= 8, "Expected at least 8 rows in Kompetitor summary table"
        analytics_shot = SCREENSHOT_DIR / "dashboard_analytics_split.png"
        await page.screenshot(path=str(analytics_shot), full_page=False)
        print(f"Captured analytics split tables view: {analytics_shot}")

        # 8. Test Klik Unit Bisnis Dragon Beach Club & Periksa Perbandingan Lighthouse
        grid_btn = page.locator("#btnGrid")
        await grid_btn.click()
        await asyncio.sleep(1)
        dragon_card = page.locator(".unit-card[data-select-unit='dragon-beach-club']")
        await dragon_card.click()
        await asyncio.sleep(1)
        await page.locator("#unit-comparisons").scroll_into_view_if_needed()
        await asyncio.sleep(1)
        dragon_detail_shot = SCREENSHOT_DIR / "dashboard_dragon_detail_comparisons.png"
        await page.screenshot(path=str(dragon_detail_shot), full_page=False)
        print(f"Captured Dragon detail & comparisons view: {dragon_detail_shot}")

        # 8b. Verify comparison-competitor dropdown is removed and all direct competitors are displayed
        comp_select_count = await page.locator("#comparison-competitor").count()
        assert comp_select_count == 0, "#comparison-competitor dropdown should be removed"
        print("Verified: Comparison dropdown is removed, competitors are displayed directly!")

        # Verify both competitors are rendered directly
        assert (
            await page.locator("#unit-comparisons").get_by_text("Lighthouse Bar & Lounge Mambruk").count()
            >= 1
        )
        # Verify competitor weakness title uses 'Kekurangan (Negatif)'
        assert (
            await page.locator(".competitor-col .weakness-side .negative-title")
            .get_by_text("Kekurangan (Negatif)")
            .count()
            >= 1
        )
        print("Verified: Competitor weakness card title displays 'Kekurangan (Negatif)'!")

        direct_comp_shot = SCREENSHOT_DIR / "dashboard_dragon_direct_comparisons.png"
        await page.screenshot(path=str(direct_comp_shot), full_page=False)
        print(f"Captured Dragon direct comparisons view: {direct_comp_shot}")

        # 8c. Test Analytics View when Dragon Beach Club is filtered
        await analytics_btn.click()
        await asyncio.sleep(1)
        dragon_summary_rows = await page.locator("#summary-rows tr").count()
        dragon_comp_rows = await page.locator("#competitor-summary-rows tr").count()
        print(
            f"Verified filtered analytics for Dragon: {dragon_summary_rows} row in Unit Kita, {dragon_comp_rows} rows in Kompetitor"
        )
        assert dragon_summary_rows == 1, (
            f"Expected exactly 1 row for Dragon Beach Club in Unit Kita, got {dragon_summary_rows}"
        )
        assert dragon_comp_rows == 2, (
            f"Expected exactly 2 relevant competitors for Dragon Beach Club, got {dragon_comp_rows}"
        )
        assert (
            await page.locator("#competitor-summary-rows")
            .get_by_text("Lighthouse Bar & Lounge Mambruk")
            .count()
            == 1
        )
        assert (
            await page.locator("#competitor-summary-rows").get_by_text("The Upper Circle Novus Jiva").count()
            == 1
        )
        assert await page.locator("#competitor-summary-rows").get_by_text("Patra Anyer Hotel").count() == 0
        await page.locator("#summary-table").scroll_into_view_if_needed()
        await asyncio.sleep(1)
        filtered_analytics_shot = SCREENSHOT_DIR / "dashboard_analytics_filtered_dragon.png"
        await page.screenshot(path=str(filtered_analytics_shot), full_page=False)
        print(f"Captured filtered analytics view for Dragon: {filtered_analytics_shot}")

        # 9. Verify btnEvidence removed & citation links directly ground to public URL
        btn_evidence_count = await page.locator("#btnEvidence").count()
        assert btn_evidence_count == 0, "btnEvidence tab should be completely removed"
        print("Verified: Audit Bukti & Sumber tab button is successfully removed from header!")

        # Verify citation link in feed
        await feed_btn.click()
        await asyncio.sleep(1)
        citation_link = page.locator(".comment-card .citation").first
        citation_href = await citation_link.get_attribute("href")
        assert citation_href and citation_href.startswith("http"), (
            f"Citation link should have public URL, got {citation_href}"
        )
        citation_target = await citation_link.get_attribute("target")
        assert citation_target == "_blank", "Citation link should open in new tab"
        print(f"Verified: Citation link directly grounds to: {citation_href} (target={citation_target})")

        grounding_shot = SCREENSHOT_DIR / "dashboard_feed_citation_grounding.png"
        await page.screenshot(path=str(grounding_shot), full_page=False)
        print(f"Captured citation grounding view: {grounding_shot}")

        # 10. Verify #unit-quotes is removed and Export Report workflow works
        await grid_btn.click()
        await asyncio.sleep(1)
        quotes_count = await page.locator("#unit-quotes").count()
        assert quotes_count == 0, "#unit-quotes card should be completely removed"
        print("Verified: Card 'Contoh opini terbaru' (#unit-quotes) is completely removed!")

        # Open Export Menu
        await page.locator("#btnExportMenu").click()
        await asyncio.sleep(1)
        assert await page.locator("#exportsMenu").is_visible(), "Export menu should be visible"

        # Test Unit Selection in Export Menu
        await page.locator("#export-unit-select").select_option("dragon-beach-club")
        await asyncio.sleep(0.5)

        view_html_href = await page.locator("#export-view-html").get_attribute("href")
        print(f"Verified Export View Report URL: {view_html_href}")
        assert "entity_id=dragon-beach-club" in view_html_href
        assert "format=html" in view_html_href
        assert await page.locator("#export-view-html").get_attribute("target") == "_blank"

        export_menu_shot = SCREENSHOT_DIR / "dashboard_export_menu_picker.png"
        await page.screenshot(path=str(export_menu_shot), full_page=False)
        print(f"Captured Export Menu Picker view: {export_menu_shot}")

        # Navigate to the HTML report page directly to capture its rendered report UI
        report_page = await context.new_page()
        await report_page.goto(f"http://127.0.0.1:8000{view_html_href}", wait_until="networkidle")
        await asyncio.sleep(1)

        # Assertions on HTML Report
        report_content = await report_page.content()
        assert "Keterbatasan" not in report_content, (
            "Report should NOT contain any 'Keterbatasan' section or mention"
        )
        assert "Kekurangan" in report_content, "Report should contain 'Kekurangan' for competitor weakness"
        assert (
            "Ulasan &amp; Komentar Positif Pelanggan" in report_content
            or "Ulasan & Komentar Positif Pelanggan" in report_content
        ), "Report should have positive comments section"
        assert (
            "Ulasan &amp; Komentar Negatif Pelanggan" in report_content
            or "Ulasan & Komentar Negatif Pelanggan" in report_content
        ), "Report should have negative comments section"
        print(
            "Verified: Report has no 'Keterbatasan', uses 'Kekurangan' for competitor, and separates positive & negative reviews!"
        )

        report_shot = SCREENSHOT_DIR / "dashboard_executive_report_preview.png"
        await report_page.screenshot(path=str(report_shot), full_page=False)
        print(f"Captured Executive Report Preview: {report_shot}")

        # Scroll to perbandingan kompetitor in HTML report
        await (
            report_page.locator("h2.section-title")
            .filter(has_text="Perbandingan")
            .scroll_into_view_if_needed()
        )
        await asyncio.sleep(1)
        comp_report_shot = SCREENSHOT_DIR / "dashboard_report_competitor_comparison.png"
        await report_page.screenshot(path=str(comp_report_shot), full_page=False)
        print(f"Captured Report Competitor Comparison Preview: {comp_report_shot}")

        # Scroll down to reviews section heading and take a screenshot of separated reviews
        await report_page.locator("h2.section-title").filter(has_text="Komentar").scroll_into_view_if_needed()
        await asyncio.sleep(1)
        reviews_shot = SCREENSHOT_DIR / "dashboard_report_separated_reviews.png"
        await report_page.screenshot(path=str(reviews_shot), full_page=False)
        print(f"Captured Report Separated Reviews Preview: {reviews_shot}")

        await report_page.close()

        # 11. Check Console Errors
        if console_errors:
            print(f"WARNING: Found {len(console_errors)} console errors:")
            for err in console_errors:
                print("  ", err)
        else:
            print("SUCCESS: 0 console errors or CSP violations!")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
