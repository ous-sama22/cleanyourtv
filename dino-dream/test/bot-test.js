// Plays the screensaver page in headless Chrome for three minutes (long enough to reach the
// game's top speed), checks the bot and the remote-key path, and saves two screenshots.
// Usage: node test/bot-test.js /abs/path/to/index.html
const { chromium } = require('playwright-core');

(async () => {
  // Same audio rule as the app's WebView (setMediaPlaybackRequiresUserGesture(false)).
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
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
    sounds: __dino.sounds,
  }));
  await page.screenshot({ path: 'test/late.png' });

  // Remote-key path: a key hands control to the viewer, pauses the bot and turns the sound
  // on. Press while the dino is on the ground so the jump (and its sound) happens.
  await page.waitForFunction(() => !Runner.instance_.tRex.jumping && !Runner.instance_.crashed);
  await page.evaluate(() => { dinoKey('jump', true); dinoKey('jump', false); });
  await page.waitForTimeout(500);
  const viewer = await page.evaluate(() => ({
    manual: __dino.manualUntil > Date.now(),
    sounds: __dino.sounds,
    audio: Runner.instance_.audioContext && Runner.instance_.audioContext.state,
  }));

  // Left/Right ('auto') hands control straight back to the bot, which keeps playing.
  await page.evaluate(() => { dinoKey('auto', true); dinoKey('auto', false); });
  const handBack = await page.evaluate(() => __dino.manualUntil <= Date.now());
  await page.waitForTimeout(10000);
  const after = await page.evaluate(() => ({ crashed: Runner.instance_.crashed, playing: Runner.instance_.playing }));

  console.log(JSON.stringify({ bot, viewer, handBack, after, errors }));
  await browser.close();
  // bot.sounds must be 0 (silent bot); the viewer's jump must have played a sound.
  if (errors.length || bot.best < 500 || bot.sounds !== 0 || !viewer.manual || viewer.sounds < 1
      || !handBack || !after.playing) {
    process.exit(1);
  }
})();
