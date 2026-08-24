const { chromium } = require("playwright");

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  console.log("Navigating to game-lab...");
  await page.goto("http://localhost:3000/game-lab", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  // 1. Overview
  await page.screenshot({ path: "scratch/01_game_lab_overview.png" });
  console.log("Captured 01_game_lab_overview.png");

  // 2. Open Dragon Game
  const dragonBtn = page.locator("button:has-text('Зимний Дракон')");
  await dragonBtn.first().click({ force: true });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "scratch/02_dragon_ready.png" });

  const playDragonBtn = page.locator("button:has-text('В путь!')");
  if (await playDragonBtn.count()) {
    await playDragonBtn.first().click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "scratch/03_dragon_playing.png" });
  }

  // Close Dragon Game
  const closeBtn = page.locator("button[aria-label='Выйти'], button[aria-label='Закрыть']");
  if (await closeBtn.count()) {
    await closeBtn.first().click({ force: true });
    await page.waitForTimeout(800);
  }

  // 3. Open Car Highway Game
  const carBtn = page.locator("button:has-text('Турбо Драйв')");
  await carBtn.first().click({ force: true });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "scratch/04_car_garage.png" });

  const playCarBtn = page.locator("button:has-text('Погнали на трассу!')");
  if (await playCarBtn.count()) {
    await playCarBtn.first().click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "scratch/05_car_playing.png" });
  }

  await browser.close();
  console.log("All screenshots captured!");
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});
