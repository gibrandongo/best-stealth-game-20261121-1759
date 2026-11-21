// Gloam Archive — main: game state, loop, input, screenshot scenes.
// States: menu -> playing -> won | lost. The loop runs on
// requestAnimationFrame with a clamped delta so the game plays the same
// on any machine. `?scene=cover|patrol|alert` poses the game for a
// screenshot: it starts playing immediately and freezes the wardens in
// a readable moment of the heist.

(function () {
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  canvas.width = GloamRender.width;
  canvas.height = GloamRender.height;

  var params = new URLSearchParams(window.location.search);
  var scene = params.get("scene") || "";

  var game = {
    state: "menu", // menu | playing | won | lost
    player: GloamPlayer.createPlayer(),
    guards: GloamPatrol.createGuards(),
    shared: { alarm: false, alarmTimer: 0 },
    time: 0,
    peakDetection: 0,
    everAlarmed: false,
    winTime: "",
    caughtBy: "",
    posed: false // frozen for a screenshot
  };

  var input = {
    left: false, right: false, up: false, down: false, sneak: false
  };

  var keys = {
    ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right",
    ArrowUp: "up", KeyW: "up",
    ArrowDown: "down", KeyS: "down",
    ShiftLeft: "sneak", ShiftRight: "sneak"
  };

  function resetGame() {
    game.player = GloamPlayer.createPlayer();
    game.guards = GloamPatrol.createGuards();
    game.shared = { alarm: false, alarmTimer: 0 };
    game.time = 0;
    game.peakDetection = 0;
    game.everAlarmed = false;
    game.winTime = "";
    game.caughtBy = "";
    game.state = "playing";
  }

  function fmtTime(t) {
    var mins = Math.floor(t / 60);
    var secs = Math.floor(t % 60);
    return (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs;
  }

  function startGame() {
    GloamAudio.ensure();
    resetGame();
  }

  function poseScene(name) {
    // Every scene starts playing, then freezes the wardens so the shot
    // is stable. The cones, the cover and the exit are all on screen.
    startGame();
    game.posed = true;
    if (name === "cover") {
      // Opening moment: Wren at the service door, wardens mid-route.
      game.guards[0].x = 560; game.guards[0].y = 330;
      game.guards[0].angle = 0.4;
      game.guards[1].x = 420; game.guards[1].y = 120;
      game.guards[1].angle = Math.PI;
      game.guards[2].x = 300; game.guards[2].y = 540;
      game.guards[2].angle = 0;
      game.guards[3].x = 1020; game.guards[3].y = 140;
      game.guards[3].angle = Math.PI / 2;
      game.guards[4].x = 130; game.guards[4].y = 120;
      game.guards[4].angle = -Math.PI / 2;
    } else if (name === "patrol") {
      // Mid-sneak: Wren crouched in the ferns as Ash's cone sweeps past.
      var fern = GloamLevel.tileCenter(8, 7);
      game.player.x = fern.x;
      game.player.y = fern.y;
      game.player.sneaking = true;
      game.player.angle = Math.PI;
      game.guards[0].x = 560; game.guards[0].y = 300;
      game.guards[0].angle = Math.PI / 2;
      game.guards[0].detection = 34;
      game.guards[0].state = "suspicious";
      game.guards[0].lastSeenX = game.player.x;
      game.guards[0].lastSeenY = game.player.y;
      game.guards[1].x = 460; game.guards[1].y = 140;
      game.guards[1].angle = 0;
      game.guards[2].x = 700; game.guards[2].y = 540;
      game.guards[2].angle = Math.PI;
      game.guards[3].x = 1020; game.guards[3].y = 140;
      game.guards[3].angle = Math.PI / 2;
      game.guards[4].x = 130; game.guards[4].y = 140;
      game.guards[4].angle = 0;
    } else if (name === "alert") {
      // The near miss: the alarm is up, Dov is chasing, Wren runs for
      // the garden gate with the ledger in hand.
      game.player.hasLedger = true;
      var gate = GloamLevel.tileCenter(27, 15);
      game.player.x = gate.x;
      game.player.y = gate.y;
      game.player.angle = 0;
      game.player.sneaking = false;
      game.shared.alarm = true;
      game.everAlarmed = true;
      game.guards[3].x = 1080; game.guards[3].y = 480;
      game.guards[3].angle = Math.PI / 4;
      game.guards[3].state = "chase";
      game.guards[3].detection = 100;
      game.guards[3].lastSeenX = game.player.x;
      game.guards[3].lastSeenY = game.player.y;
      game.guards[0].x = 620; game.guards[0].y = 420;
      game.guards[0].angle = 0.5;
      game.guards[0].state = "chase";
      game.guards[0].detection = 100;
      game.guards[0].lastSeenX = game.player.x;
      game.guards[0].lastSeenY = game.player.y;
      game.guards[1].x = 500; game.guards[1].y = 140;
      game.guards[1].angle = Math.PI / 2;
      game.guards[1].state = "chase";
      game.guards[1].detection = 88;
      game.guards[2].x = 420; game.guards[2].y = 560;
      game.guards[2].angle = 0;
      game.guards[2].state = "chase";
      game.guards[2].detection = 76;
      game.guards[4].x = 150; game.guards[4].y = 140;
      game.guards[4].angle = Math.PI;
    }
  }

  window.addEventListener("keydown", function (e) {
    if (e.code === "Enter" && game.state === "menu") {
      startGame();
      return;
    }
    if (e.code === "KeyR" && (game.state === "won" || game.state === "lost")) {
      startGame();
      return;
    }
    if (e.code === "KeyM") {
      GloamAudio.ensure();
      GloamAudio.setMuted(!GloamAudio.isMuted());
      return;
    }
    if (keys[e.code]) {
      input[keys[e.code]] = true;
      if (e.code.indexOf("Arrow") === 0) e.preventDefault();
    }
  });

  window.addEventListener("keyup", function (e) {
    if (keys[e.code]) input[keys[e.code]] = false;
  });

  canvas.addEventListener("mousedown", function (e) {
    GloamAudio.ensure();
    if (game.state === "menu") {
      startGame();
      return;
    }
    if (game.state !== "playing") return;
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    game.player.clickTarget = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  });

  // Footsteps: the player's own ticks, and the wardens' boots, panned by
  // where they are relative to Wren and quieter with distance.
  var lastGuardStep = {};
  function playSteps(dt) {
    var p = game.player;
    if (p.moving) {
      var stride = p.sneaking ? 26 : 34;
      if (p.stepAccum > stride) {
        p.stepAccum = 0;
        GloamAudio.footstep(p.sneaking, 0, p.sneaking ? 0.5 : 1);
      }
    }
    for (var i = 0; i < game.guards.length; i++) {
      var g = game.guards[i];
      var dx = g.x - p.x;
      var dy = g.y - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 380) continue;
      var vol = 1 - dist / 380;
      var pan = Math.max(-1, Math.min(1, dx / 260));
      var stepLen = 44;
      if (g.stepPhase - (lastGuardStep[i] || 0) > stepLen) {
        lastGuardStep[i] = g.stepPhase;
        GloamAudio.guardStep(pan, vol);
      }
    }
  }

  function handleEvents(events) {
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (ev.type === "alarm") {
        GloamAudio.alarmSting();
        game.everAlarmed = true;
      } else if (ev.type === "suspicious" || ev.type === "heard") {
        GloamAudio.suspiciousBlip();
      } else if (ev.type === "calm") {
        GloamAudio.calmDown();
      } else if (ev.type === "caught") {
        game.state = "lost";
        game.caughtBy = ev.guard.name;
        GloamAudio.loseJingle();
      }
    }
  }

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.time += dt;

    if (game.state === "playing" && !game.posed) {
      var pickup = GloamPlayer.updatePlayer(game.player, dt, input);
      if (pickup && pickup.pickedLedger) GloamAudio.pickupChime();
      if (pickup && pickup.pickedSeal) GloamAudio.sealChime();

      var events = [];
      GloamPatrol.updateGuards(game.guards, dt, game.player, game.shared, events);
      handleEvents(events);
      playSteps(dt);

      var maxDetection = 0;
      for (var i = 0; i < game.guards.length; i++) {
        maxDetection = Math.max(maxDetection, game.guards[i].detection);
      }
      game.peakDetection = Math.max(game.peakDetection, maxDetection);

      if (game.player.hasLedger && GloamLevel.nearExit(game.player.x, game.player.y)) {
        game.state = "won";
        game.winTime = fmtTime(game.time);
        GloamAudio.winJingle();
      }
    } else if (game.state === "playing" && game.posed) {
      // Frozen for the screenshot: still play the footstep ambience of
      // the moment, but nothing moves.
      var maxD = 0;
      for (var j = 0; j < game.guards.length; j++) {
        maxD = Math.max(maxD, game.guards[j].detection);
      }
      game.peakDetection = Math.max(game.peakDetection, maxD);
    }

    GloamRender.draw(ctx, game, game.time);
    requestAnimationFrame(frame);
  }

  if (scene === "cover" || scene === "patrol" || scene === "alert") {
    poseScene(scene);
  }
  requestAnimationFrame(frame);
})();
