const { chromium } = require("playwright");

async function captureMobile() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 portrait
    isMobile: true,
  });
  const page = await context.newPage();

  await page.goto("http://localhost:3000/game-lab", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  // 1. Dragon Mobile
  const dragonBtn = page.locator("button:has-text('Зимний Дракон')");
  await dragonBtn.first().click({ force: true });
  await page.waitForTimeout(1000);

  const playDragonBtn = page.locator("button:has-text('В путь!')");
  if (await playDragonBtn.count()) {
    await playDragonBtn.first().click({ force: true });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "scratch/mobile_dragon_playing.png" });
  }

  const closeBtn = page.locator("button[aria-label='Выйти'], button[aria-label='Закрыть']");
  if (await closeBtn.count()) {
    await closeBtn.first().click({ force: true });
    await page.waitForTimeout(800);
  }

  // 2. Car Mobile
  const carBtn = page.locator("button:has-text('Турбо Драйв')");
  await carBtn.first().click({ force: true });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "scratch/mobile_car_garage.png" });

  const playCarBtn = page.locator("button:has-text('Погнали на трассу!')");
  if (await playCarBtn.count()) {
    await playCarBtn.first().click({ force: true });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "scratch/mobile_car_playing.png" });
  }

  await browser.close();
  console.log("Mobile screenshots captured!");
}

captureMobile().catch((e) => {
  console.error(e);
  process.exit(1);
});
