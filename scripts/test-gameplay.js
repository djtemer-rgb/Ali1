const { chromium } = require("playwright");

async function testGameplay() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  console.log("Navigating to game-lab...");
  await page.goto("http://localhost:3000/game-lab", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  // 1. Dragon Gameplay Test
  const dragonBtn = page.locator("button:has-text('Зимний Дракон')");
  await dragonBtn.first().click({ force: true });
  await page.waitForTimeout(800);

  const playDragonBtn = page.locator("button:has-text('В путь!')");
  if (await playDragonBtn.count()) {
    await playDragonBtn.first().click({ force: true });
    await page.waitForTimeout(1000);

    // Steer dragon left
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(500);
    await page.screenshot({ path: "scratch/dragon_steer_left.png" });

    // Steer dragon right
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(500);
    await page.screenshot({ path: "scratch/dragon_steer_right.png" });
  }

  // Close Dragon Game
  const closeBtn = page.locator("button[aria-label='Выйти'], button[aria-label='Закрыть']");
  if (await closeBtn.count()) {
    await closeBtn.first().click({ force: true });
    await page.waitForTimeout(800);
  }

  // 2. Car Highway Gameplay Test
  const carBtn = page.locator("button:has-text('Турбо Драйв')");
  await carBtn.first().click({ force: true });
  await page.waitForTimeout(800);

  // Switch to Lambo in Garage
  const lamboBtn = page.locator("button:has-text('Lamborghini Revuelto')");
  if (await lamboBtn.count()) {
    await lamboBtn.first().click({ force: true });
    await page.waitForTimeout(600);
    await page.screenshot({ path: "scratch/car_lambo_garage.png" });
  }

  const playCarBtn = page.locator("button:has-text('Погнали на трассу!')");
  if (await playCarBtn.count()) {
    await playCarBtn.first().click({ force: true });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: "scratch/car_lambo_playing.png" });

    // Steer Lambo left and right
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(500);
    await page.screenshot({ path: "scratch/car_lambo_steer_left.png" });
  }

  await browser.close();
  console.log("Gameplay test completed successfully!");
}

testGameplay().catch((e) => {
  console.error(e);
  process.exit(1);
});
