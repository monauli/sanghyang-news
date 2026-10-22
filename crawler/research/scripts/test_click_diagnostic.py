import asyncio

from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        page.on(
            "console",
            lambda m: errors.append(f"[{m.type}] {m.text}") if m.type in ["error", "warning"] else None,
        )
        page.on("pageerror", lambda e: errors.append(f"[UNCAUGHT] {e}"))

        print("Navigating to http://127.0.0.1:8000/...")
        await page.goto("http://127.0.0.1:8000/", wait_until="networkidle")
        await asyncio.sleep(1)

        print("Errors on load:", errors)

        # 1. Test clicking on a unit card in Grid
        dragon = page.locator(".unit-card[data-select-unit='dragon-beach-club']")
        print("Dragon card count:", await dragon.count())
        await dragon.click()
        await asyncio.sleep(0.5)
        entity_detail_visible = await page.locator("#entity-detail").is_visible()
        print("Entity detail (#entity-detail) visible after clicking dragon?", entity_detail_visible)
        assert entity_detail_visible, "Clicking Dragon card should show detail"

        # 2. Test Back button
        back = page.locator("#back-to-portfolio")
        await back.click()
        await asyncio.sleep(0.5)
        print("After back, entity-detail hidden?", not await page.locator("#entity-detail").is_visible())
        assert not await page.locator("#entity-detail").is_visible(), "Back button should hide detail"

        # 3. Test clicking on a Competitor card in Grid
        comp_card = page.locator(".competitor-card").first
        print("Clicking first competitor card...")
        await comp_card.click()
        await asyncio.sleep(0.5)
        print(
            "Feed view visible after clicking competitor card?", await page.locator("#view-feed").is_visible()
        )
        assert await page.locator("#view-feed").is_visible(), "Clicking competitor card should open feed"

        # 4. Test clicking Analytics tab and clicking a table row
        await page.locator("#btnAnalytics").click()
        await asyncio.sleep(0.5)
        print("Analytics view visible?", await page.locator("#view-analytics").is_visible())

        # Click row in internal summary table
        first_unit_row = page.locator("#summary-rows tr.clickable-row").first
        print("Clicking first internal unit row in analytics table...")
        await first_unit_row.click()
        await asyncio.sleep(0.5)
        print(
            "After clicking unit row, is grid view & detail visible?",
            await page.locator("#view-grid").is_visible()
            and await page.locator("#entity-detail").is_visible(),
        )
        assert await page.locator("#view-grid").is_visible(), "Clicking unit row should navigate to grid view"
        assert await page.locator("#entity-detail").is_visible(), (
            "Clicking unit row should show entity detail"
        )

        # 5. Test Export button click toggle
        export_btn = page.locator("#btnExportMenu")
        print("Testing Export menu click toggle...")
        await export_btn.click()
        await asyncio.sleep(0.3)
        print(
            "Export menu has class 'show' after click?",
            "show" in (await page.locator("#exportsMenu").get_attribute("class") or ""),
        )
        assert "show" in (await page.locator("#exportsMenu").get_attribute("class") or ""), (
            "Export menu should have show class"
        )

        # Click outside to close
        await page.locator("header h1").click()
        await asyncio.sleep(0.3)
        print(
            "Export menu 'show' removed after outside click?",
            "show" not in (await page.locator("#exportsMenu").get_attribute("class") or ""),
        )
        assert "show" not in (await page.locator("#exportsMenu").get_attribute("class") or ""), (
            "Outside click should close export menu"
        )
        print("Final errors:", errors)
        assert len(errors) == 0, f"Expected 0 console errors, got {errors}"
        print("ALL INTERACTIVE CLICKS PASSED SUCCESSFULLY!")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
