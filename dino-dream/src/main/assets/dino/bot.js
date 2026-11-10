// Auto-play for Chromium's T-Rex runner, used as a TV screensaver.
// Silent: the game's sounds are never loaded. A remote key hands control to the
// viewer; the bot takes over again after 20 seconds without a key.
(function () {
  'use strict';
  var MANUAL_MS = 20000;   // viewer keeps control this long after their last key
  var RESTART_MS = 2500;   // pause on the game-over screen before the bot restarts

  Runner.prototype.playSound = function () {};
  Runner.prototype.loadSounds = function () {};

  var stats = window.__dino = { crashes: 0, best: 0, manualUntil: 0 };
  var crashedAt = 0;
  var ducking = false;

  var gameOver = Runner.prototype.gameOver;
  Runner.prototype.gameOver = function () {
    stats.crashes++;
    crashedAt = Date.now();
    ducking = false;
    return gameOver.apply(this, arguments);
  };

  function ev(type, keyCode) {
    return { type: type, keyCode: keyCode, target: document.body,
             currentTarget: document.body, preventDefault: function () {} };
  }
  function down(r, code) { r.onKeyDown(ev('keydown', code)); }
  function up(r, code) { r.onKeyUp(ev('keyup', code)); }

  // Called from DinoDream.java for OK/Up ('jump') and Down ('duck').
  window.dinoKey = function (name, isDown) {
    var r = Runner.instance_;
    if (!r) return;
    stats.manualUntil = Date.now() + MANUAL_MS;
    if (ducking) { up(r, 40); ducking = false; }
    var code = name === 'duck' ? 40 : 38;
    if (isDown) down(r, code); else up(r, code);
  };

  function nextObstacle(r) {
    var t = r.tRex, obs = r.horizon.obstacles;
    for (var i = 0; i < obs.length; i++) {
      if (obs[i].xPos + obs[i].width > t.xPos) return obs[i];
    }
    return null;
  }

  function tick() {
    requestAnimationFrame(tick);
    var r = Runner.instance_;
    if (!r || !r.tRex) return;

    var d = r.distanceMeter.getActualDistance(Math.ceil(r.distanceRan));
    if (d > stats.best) stats.best = d;
    if (Date.now() < stats.manualUntil) return;

    if (r.crashed) {
      if (Date.now() - crashedAt > RESTART_MS) r.restart();
      return;
    }
    if (!r.playing) {
      if (r.paused) { r.tRex.reset(); r.play(); }
      else { down(r, 38); up(r, 38); }      // first jump starts the game
      return;
    }

    var t = r.tRex, o = nextObstacle(r);
    if (!o) {
      if (ducking) { up(r, 40); ducking = false; }
      return;
    }
    var gap = o.xPos - (t.xPos + t.config.WIDTH);
    var reach = r.currentSpeed * 12 + 10;   // jump when the obstacle is ~12 frames away
    var bird = o.typeConfig.type === 'PTERODACTYL';

    if (bird && o.yPos < 60) return;         // flies over the dino's head
    if (bird && o.yPos < 90) {               // head height: duck under it
      if (!ducking && !t.jumping && gap < reach) { down(r, 40); ducking = true; }
      return;
    }
    if (ducking) { up(r, 40); ducking = false; }
    if (!t.jumping && gap > 0 && gap < reach) { down(r, 38); up(r, 38); }
  }
  requestAnimationFrame(tick);
})();
