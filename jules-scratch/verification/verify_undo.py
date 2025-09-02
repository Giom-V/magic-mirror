import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            await page.goto("http://localhost:3000", timeout=60000)

            # 1. Connect and start webcam
            connect_button = page.get_by_role("button", name="play_arrow")
            await expect(connect_button).to_be_visible(timeout=30000)
            await connect_button.click()

            # Now that we're connected, the "Streaming" text should be visible
            await expect(page.get_by_text("Streaming")).to_be_visible(timeout=10000)

            webcam_button = page.get_by_role("button", name="videocam")
            await expect(webcam_button).to_be_visible()
            await webcam_button.click()

            # Wait for the video stream to be active
            video_element = page.locator("video.stream")
            await expect(video_element).to_be_visible(timeout=10000)
            await page.wait_for_timeout(2000)

            # 2. Apply disguise
            await page.keyboard.press("i")

            # Wait for the disguised image to appear
            disguised_image_element = page.locator(".magic-effect img")
            await expect(disguised_image_element).to_be_visible(timeout=60000)
            await page.wait_for_timeout(2000)
            await page.screenshot(path="jules-scratch/verification/before_undo.png")
            print("Screenshot 'before_undo.png' taken.")

            # 3. Click Undo button
            undo_button = page.get_by_role("button", name="Annuler")
            await expect(undo_button).to_be_enabled()
            await undo_button.click()
            print("Clicked 'Annuler' button.")

            # 4. Verify and take final screenshot
            await page.wait_for_timeout(2000)
            await page.screenshot(path="jules-scratch/verification/after_undo.png")
            print("Screenshot 'after_undo.png' taken.")

        except Exception as e:
            print(f"An error occurred during verification: {e}")
            await page.screenshot(path="jules-scratch/verification/error.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
