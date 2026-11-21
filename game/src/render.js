// Gloam Archive — render: everything the player sees.
// Top-down canvas: plank floor, warm lantern pools, a darkness overlay
// with light punched through it (so the dark reads as safe and the lit
// floor reads as dangerous), vision cones glowing over the dark, wardens
// in their colours, Wren in teal, and a HUD that never hides the level.

const GloamRender = (function () {
  var C = GloamConfig;
  var TILE = C.TILE;
  var W = C.COLS * TILE;
  var H = C.ROWS * TILE;

  var darkCanvas = null;
  var darkCtx = null;

  function hash(tx, ty) {
    var h = (tx * 73856093) ^ (ty * 19349663);
    return ((h >>> 0) % 1000) / 1000;
  }

  function coneColor(guard) {
    if (guard.state === "chase") return "255,70,70";
    if (guard.state === "suspicious" || guard.state === "search") return "255,150,60";
    return "255,205,100";
  }

  function drawFloor(ctx, time) {
    for (var ty = 0; ty < C.ROWS; ty++) {
      for (var tx = 0; tx < C.COLS; tx++) {
        var ch = C.MAP[ty].charAt(tx);
        if (ch === "#") continue;
        var h = hash(tx, ty);
        var base = 40 + Math.floor(h * 10);
        ctx.fillStyle = "rgb(" + base + "," + Math.floor(base * 0.78) + "," + Math.floor(base * 0.55) + ")";
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        ctx.strokeStyle = "rgba(0,0,0,0.18)";
        ctx.lineWidth = 1;
        ctx.strokeRect(tx * TILE + 0.5, ty * TILE + 0.5, TILE - 1, TILE - 1);
        // Plank seams.
        ctx.strokeStyle = "rgba(0,0,0,0.10)";
        ctx.beginPath();
        ctx.moveTo(tx * TILE, ty * TILE + TILE / 2);
        ctx.lineTo(tx * TILE + TILE, ty * TILE + TILE / 2);
        ctx.stroke();
      }
    }
    // Warm pools under each lantern, painted on the floor.
    for (var i = 0; i < C.LANTERNS.length; i++) {
      var c = GloamLevel.tileCenter(C.LANTERNS[i].tx, C.LANTERNS[i].ty);
      var g = ctx.createRadialGradient(c.x, c.y, 8, c.x, c.y, 118);
      g.addColorStop(0, "rgba(255,196,100,0.30)");
      g.addColorStop(1, "rgba(255,196,100,0)");
      ctx.fillStyle = g;
      ctx.fillRect(c.x - 118, c.y - 118, 236, 236);
    }
  }

  function drawExitAndVault(ctx, game, time) {
    var pulse = 0.55 + 0.25 * Math.sin(time * 2.4);
    var e = GloamLevel.tileCenter(GloamLevel.exitTile.tx, GloamLevel.exitTile.ty);
    var eg = ctx.createRadialGradient(e.x, e.y, 6, e.x, e.y, 64);
    eg.addColorStop(0, "rgba(90,255,150," + pulse + ")");
    eg.addColorStop(1, "rgba(90,255,150,0)");
    ctx.fillStyle = eg;
    ctx.fillRect(e.x - 64, e.y - 64, 128, 128);
    ctx.fillStyle = "#12351f";
    ctx.fillRect(e.x - 15, e.y - 17, 30, 34);
    ctx.strokeStyle = "#5aff96";
    ctx.lineWidth = 2;
    ctx.strokeRect(e.x - 15, e.y - 17, 30, 34);
    ctx.fillStyle = "#5aff96";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("EXIT", e.x, e.y + 30);

    var v = GloamLevel.tileCenter(GloamLevel.vault.tx, GloamLevel.vault.ty);
    if (!game.player.hasLedger) {
      var vg = ctx.createRadialGradient(v.x, v.y, 4, v.x, v.y, 56);
      vg.addColorStop(0, "rgba(255,215,110," + pulse + ")");
      vg.addColorStop(1, "rgba(255,215,110,0)");
      ctx.fillStyle = vg;
      ctx.fillRect(v.x - 56, v.y - 56, 112, 112);
      ctx.fillStyle = "#6b4d16";
      ctx.beginPath();
      ctx.arc(v.x, v.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffd76a";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#f3e2ae";
      ctx.fillRect(v.x - 9, v.y - 6, 18, 12);
      ctx.fillStyle = "#a33327";
      ctx.fillRect(v.x - 2, v.y - 6, 4, 12);
      ctx.fillStyle = "#ffd76a";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("LEDGER", v.x, v.y + 30);
    }

    for (var i = 0; i < C.SEALS.length; i++) {
      if (game.player.sealsTaken[i]) continue;
      var s = GloamLevel.tileCenter(C.SEALS[i].tx, C.SEALS[i].ty);
      var bob = Math.sin(time * 3 + i * 2) * 2;
      ctx.fillStyle = "#ffd76a";
      ctx.beginPath();
      ctx.arc(s.x, s.y + bob, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8a6a1d";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#8a6a1d";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText("S", s.x, s.y + bob + 3);
    }
  }

  function drawCover(ctx) {
    var shelfColors = ["#7a4a3a", "#4a6b7a", "#6b7a4a", "#7a6b3a", "#5a4a7a"];
    for (var ty = 0; ty < C.ROWS; ty++) {
      for (var tx = 0; tx < C.COLS; tx++) {
        var ch = C.MAP[ty].charAt(tx);
        var x = tx * TILE;
        var y = ty * TILE;
        if (ch === "#") {
          ctx.fillStyle = "#3d4356";
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = "#4d5468";
          ctx.fillRect(x, y, TILE, 5);
          ctx.strokeStyle = "rgba(0,0,0,0.35)";
          ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        } else if (ch === "S") {
          ctx.fillStyle = "#5a3d24";
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          for (var r = 0; r < 3; r++) {
            var yy = y + 8 + r * 11;
            for (var b = 0; b < 4; b++) {
              ctx.fillStyle = shelfColors[Math.floor(hash(tx + b, ty + r) * 5)];
              ctx.fillRect(x + 5 + b * 8, yy, 6, 9);
            }
          }
          ctx.strokeStyle = "#3a2812";
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
        } else if (ch === "C") {
          ctx.fillStyle = "#7a5a30";
          ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
          ctx.strokeStyle = "#54401f";
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
          ctx.beginPath();
          ctx.moveTo(x + 3, y + 3);
          ctx.lineTo(x + TILE - 3, y + TILE - 3);
          ctx.moveTo(x + TILE - 3, y + 3);
          ctx.lineTo(x + 3, y + TILE - 3);
          ctx.stroke();
        } else if (ch === "B") {
          var cx = x + TILE / 2;
          var cy = y + TILE / 2;
          ctx.fillStyle = "#1d4a2a";
          for (var k = 0; k < 5; k++) {
            var a = (k / 5) * Math.PI * 2 + hash(tx, ty) * 2;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10, 10, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = "#2f6b3a";
          ctx.beginPath();
          ctx.arc(cx - 4, cy - 4, 7, 0, Math.PI * 2);
          ctx.arc(cx + 6, cy + 3, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawDarkness(ctx, game) {
    if (!darkCanvas) {
      darkCanvas = document.createElement("canvas");
      darkCanvas.width = W;
      darkCanvas.height = H;
      darkCtx = darkCanvas.getContext("2d");
    }
    darkCtx.clearRect(0, 0, W, H);
    darkCtx.globalCompositeOperation = "source-over";
    darkCtx.fillStyle = "rgba(4,6,18,0.58)";
    darkCtx.fillRect(0, 0, W, H);
    darkCtx.globalCompositeOperation = "destination-out";
    function hole(x, y, r, strength) {
      var g = darkCtx.createRadialGradient(x, y, 4, x, y, r);
      g.addColorStop(0, "rgba(0,0,0," + strength + ")");
      g.addColorStop(1, "rgba(0,0,0,0)");
      darkCtx.fillStyle = g;
      darkCtx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (var i = 0; i < C.LANTERNS.length; i++) {
      var c = GloamLevel.tileCenter(C.LANTERNS[i].tx, C.LANTERNS[i].ty);
      hole(c.x, c.y, 150, 0.95);
    }
    var e = GloamLevel.tileCenter(GloamLevel.exitTile.tx, GloamLevel.exitTile.ty);
    hole(e.x, e.y, 95, 0.8);
    if (!game.player.hasLedger) {
      var v = GloamLevel.tileCenter(GloamLevel.vault.tx, GloamLevel.vault.ty);
      hole(v.x, v.y, 80, 0.8);
    }
    for (var j = 0; j < game.guards.length; j++) {
      hole(game.guards[j].x, game.guards[j].y, 72, 0.55);
    }
    hole(game.player.x, game.player.y, 105, 0.9);
    ctx.drawImage(darkCanvas, 0, 0);
  }

  // A vision cone clipped by walls, shelves, crates and fern beds: rays
  // march out from the guard and stop at the first sight-blocking tile,
  // so the cone never paints through a wall.
  function conePolygon(guard) {
    var pts = [{ x: guard.x, y: guard.y }];
    var rays = 26;
    for (var i = 0; i <= rays; i++) {
      var a = guard.angle - C.CONE_HALF_ANGLE +
        (2 * C.CONE_HALF_ANGLE * i) / rays;
      var r = C.CONE_RANGE;
      for (var d = 10; d <= C.CONE_RANGE; d += 6) {
        var px = guard.x + Math.cos(a) * d;
        var py = guard.y + Math.sin(a) * d;
        if (GloamLevel.isSightTile(Math.floor(px / TILE), Math.floor(py / TILE))) {
          r = d;
          break;
        }
      }
      pts.push({ x: guard.x + Math.cos(a) * r, y: guard.y + Math.sin(a) * r });
    }
    return pts;
  }

  function drawCone(ctx, guard) {
    var rgb = coneColor(guard);
    var g = ctx.createRadialGradient(
      guard.x, guard.y, 8, guard.x, guard.y, C.CONE_RANGE
    );
    var alpha = guard.state === "chase" ? 0.42 : 0.30;
    g.addColorStop(0, "rgba(" + rgb + "," + alpha + ")");
    g.addColorStop(1, "rgba(" + rgb + ",0.05)");
    ctx.fillStyle = g;
    var pts = conePolygon(guard);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(" + rgb + ",0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawGuard(ctx, guard, time) {
    var bob = Math.sin(time * 6 + guard.bobPhase) * 1.2;
    ctx.fillStyle = "#232c42";
    ctx.beginPath();
    ctx.arc(guard.x, guard.y + bob * 0.4, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = guard.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Lantern dot at the front, facing tick.
    var fx = guard.x + Math.cos(guard.angle) * 10;
    var fy = guard.y + Math.sin(guard.angle) * 10;
    ctx.fillStyle = "#ffd76a";
    ctx.beginPath();
    ctx.arc(fx, fy + bob * 0.4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Helmet crest.
    ctx.fillStyle = guard.color;
    ctx.fillRect(guard.x - 2, guard.y - 16 + bob * 0.4, 4, 6);
    // Detection arc over the head.
    if (guard.detection > 1) {
      ctx.strokeStyle = guard.detection >= C.ALARM_AT ? "#ff4d4d" : "#ffb347";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y - 20 + bob * 0.4, 8,
        -Math.PI / 2, -Math.PI / 2 + (guard.detection / 100) * Math.PI * 2);
      ctx.stroke();
    }
    if (guard.state === "suspicious" || guard.state === "search") {
      drawMark(ctx, guard.x, guard.y - 30 + bob * 0.4, "?", "#ffb347");
    } else if (guard.state === "chase") {
      drawMark(ctx, guard.x, guard.y - 30 + bob * 0.4, "!", "#ff4d4d");
    }
  }

  function drawMark(ctx, x, y, text, color) {
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function drawPlayer(ctx, player, time) {
    if (player.noiseRadius > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.noiseRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    var r = player.sneaking ? 10 : 12;
    var bob = player.moving ? Math.sin(time * 10) * 1 : 0;
    ctx.fillStyle = "#1f6f66";
    ctx.beginPath();
    ctx.arc(player.x, player.y + bob * 0.3, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7fe0d4";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Hood point in the facing direction.
    var hx = player.x + Math.cos(player.angle) * (r + 2);
    var hy = player.y + Math.sin(player.angle) * (r + 2);
    ctx.fillStyle = "#2e8f82";
    ctx.beginPath();
    ctx.arc(hx, hy + bob * 0.3, 4, 0, Math.PI * 2);
    ctx.fill();
    if (player.sneaking) {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SNEAK", player.x, player.y - r - 6);
    }
  }

  function drawHUD(ctx, game) {
    var maxDetection = 0;
    for (var i = 0; i < game.guards.length; i++) {
      maxDetection = Math.max(maxDetection, game.guards[i].detection);
    }
    // The word describes the meter itself: how close the wardens are to
    // raising the alarm, not the rate at this instant.
    var word = maxDetection <= 0 ? "HIDDEN"
      : maxDetection < 25 ? "GLIMPSED"
      : maxDetection < C.SUSPICIOUS_AT ? "SPOTTED"
      : maxDetection < 100 ? "SEEN!" : "ALARM!";

    ctx.fillStyle = "rgba(6,8,16,0.72)";
    ctx.fillRect(0, 0, W, 34);
    ctx.fillStyle = "#d8cfae";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    var objective = game.player.hasLedger
      ? "Ledger taken — reach the garden gate!"
      : "Steal the Gloam Ledger from the vault";
    ctx.fillText(objective, 12, 22);

    // Detection meter, centred.
    var mw = 240;
    var mx = (W - mw) / 2;
    ctx.fillStyle = "#10131f";
    ctx.fillRect(mx - 2, 9, mw + 4, 16);
    var frac = maxDetection / 100;
    var col = frac < 0.55 ? "#e8b04b" : (frac < 1 ? "#ff7a3c" : "#ff3b3b");
    ctx.fillStyle = col;
    ctx.fillRect(mx, 11, mw * frac, 12);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(mx - 2, 9, mw + 4, 16);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DETECTION  " + word, W / 2, 20);

    // Right: timer, seals, mute.
    var mins = Math.floor(game.time / 60);
    var secs = Math.floor(game.time % 60);
    var clock = (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs;
    ctx.fillStyle = "#d8cfae";
    ctx.textAlign = "right";
    ctx.fillText("✦ " + game.player.seals + "/3    " + clock +
      (GloamAudio.isMuted() ? "    MUTED (M)" : ""), W - 12, 22);

    // Bottom hint.
    ctx.fillStyle = "rgba(6,8,16,0.6)";
    ctx.fillRect(0, H - 26, W, 26);
    ctx.fillStyle = "#9a937a";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("WASD / arrows move   •   hold Shift to sneak   •   click to walk there   •   R restart   •   M mute",
      12, H - 9);

    // Banners.
    if (game.shared.alarm) {
      ctx.fillStyle = "#ff3b3b";
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ALARM — BREAK LINE OF SIGHT!", W / 2, 66);
    } else if (maxDetection >= C.SUSPICIOUS_AT) {
      ctx.fillStyle = "#ffb347";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("A warden is coming to look…", W / 2, 62);
    } else if (game.player.sneaking && GloamLevel.inBush(game.player.x, game.player.y)) {
      ctx.fillStyle = "#7fe0a8";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Hidden in the ferns — the wardens cannot see you here", W / 2, 60);
    }
  }

  function drawOverlay(ctx, game) {
    ctx.fillStyle = "rgba(4,6,16,0.82)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    if (game.state === "menu") {
      ctx.fillStyle = "#ffd76a";
      ctx.font = "bold 64px Georgia, serif";
      ctx.fillText("GLOAM ARCHIVE", W / 2, 220);
      ctx.fillStyle = "#d8cfae";
      ctx.font = "20px Georgia, serif";
      ctx.fillText("a quiet heist in the Marlowe Archive", W / 2, 258);
      ctx.fillStyle = "#b9b29a";
      ctx.font = "16px sans-serif";
      ctx.fillText("Five lantern wardens walk the halls. Their cones are their eyes.", W / 2, 320);
      ctx.fillText("Sneak in the dark, hide in the ferns, lift the Gloam Ledger,", W / 2, 346);
      ctx.fillText("and slip out through the garden gate — unseen.", W / 2, 372);
      ctx.fillStyle = "#7fe0d4";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("WASD / arrows to move  •  hold Shift to sneak  •  click to walk", W / 2, 430);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px sans-serif";
      var blink = 0.6 + 0.4 * Math.sin(game.time * 3);
      ctx.globalAlpha = blink;
      ctx.fillText("Click or press Enter to begin", W / 2, 490);
      ctx.globalAlpha = 1;
    } else if (game.state === "won") {
      ctx.fillStyle = "#7fe0a8";
      ctx.font = "bold 52px Georgia, serif";
      ctx.fillText("YOU SLIPPED AWAY", W / 2, 240);
      ctx.fillStyle = "#d8cfae";
      ctx.font = "20px sans-serif";
      var rating = game.peakDetection < C.SUSPICIOUS_AT ? "GHOST — never even glimpsed"
        : (game.everAlarmed ? "SEEN — but gone before they caught you" : "SHADOW — spotted, never caught");
      ctx.fillText(rating, W / 2, 290);
      ctx.fillText("Time " + game.winTime + "   •   Seals " + game.player.seals + "/3", W / 2, 330);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("Press R to steal it again", W / 2, 400);
    } else if (game.state === "lost") {
      ctx.fillStyle = "#ff5a5a";
      ctx.font = "bold 52px Georgia, serif";
      ctx.fillText("CAUGHT!", W / 2, 240);
      ctx.fillStyle = "#d8cfae";
      ctx.font = "20px sans-serif";
      ctx.fillText((game.caughtBy || "A warden") + " caught Wren in the lamplight.", W / 2, 290);
      ctx.fillText("The ledger stays in the vault… this time.", W / 2, 322);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("Press R to try again", W / 2, 390);
    }
  }

  function draw(ctx, game, time) {
    drawFloor(ctx, time);
    drawExitAndVault(ctx, game, time);
    drawCover(ctx);
    drawDarkness(ctx, game);
    for (var i = 0; i < game.guards.length; i++) {
      drawCone(ctx, game.guards[i]);
    }
    for (var j = 0; j < game.guards.length; j++) {
      drawGuard(ctx, game.guards[j], time);
    }
    drawPlayer(ctx, game.player, time);
    drawHUD(ctx, game);
    if (game.state !== "playing") drawOverlay(ctx, game);
  }

  return {
    draw: draw,
    width: W,
    height: H
  };
})();
