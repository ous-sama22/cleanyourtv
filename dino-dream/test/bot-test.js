// Plays the screensaver page in headless Chrome for three minutes (long enough to reach the
// game's top speed), checks the bot and the remote-key path, and saves two screenshots.
// Usage: node test/bot-test.js /abs/path/to/index.html
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('file://' + process.argv[2]);
  await page.waitForTimeout(15000);
  if (errors.length) { console.log(JSON.stringify({ errors })); process.exit(1); }
  await page.screenshot({ path: 'test/early.png' });
  await page.waitForTimeout(165000);
  const bot = await page.evaluate(() => ({
    crashes: __dino.crashes, best: __dino.best, speed: Runner.instance_.currentSpeed,
  }));
  await page.screenshot({ path: 'test/late.png' });

  // Remote-key path: a key hands control to the viewer and pauses the bot.
  await page.evaluate(() => { dinoKey('jump', true); dinoKey('jump', false); });
  const manual = await page.evaluate(() => __dino.manualUntil > Date.now());

  console.log(JSON.stringify({ bot, manual, errors }));
  await browser.close();
  if (errors.length || !manual || bot.best < 500) process.exit(1);
})();
