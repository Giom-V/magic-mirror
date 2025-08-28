from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:3000")
    page.wait_for_selector(".input-area")
    page.fill(".input-area", "transform me into an ogre")
    page.click(".send-button")
    page.wait_for_selector("img[alt='edited image']", timeout=60000)
    page.screenshot(path="jules-scratch/verification/verification.png")
    browser.close()
