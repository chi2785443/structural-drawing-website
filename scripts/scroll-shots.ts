/** Dev-only: screenshots the page at several scroll depths for visual QA. */
import { chromium } from "playwright-core";

const EXEC =
  process.env.HOME +
  "/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell";

async function main() {
  const browser = await chromium.launch({ executablePath: EXEC });
  const page = await browser.newPage({ viewportSize: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3789", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const depths = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  for (const d of depths) {
    await page.evaluate((depth) => {
      const max = document.body.scrollHeight - window.innerHeight;
      window.scrollTo({ top: max * depth, behavior: "instant" as ScrollBehavior });
    }, d);
    await page.waitForTimeout(1200); // let scrub catch up + reveals fire
    await page.screenshot({ path: `/tmp/shot_${Math.round(d * 100)}.png` });
  }
  await browser.close();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
