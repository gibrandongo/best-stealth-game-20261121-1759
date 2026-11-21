// Gloam Archive — player: Wren, the quiet courier.
// WASD or arrows to move, hold Shift to sneak (slow, quiet, hard to
// spot), click the floor to walk there. Sneaking through a fern bed is
// the safest way past a warden; running in the light is the fastest way
// to be caught.

const GloamPlayer = (function () {
  var C = GloamConfig;

  function createPlayer() {
    var start = GloamLevel.tileCenter(
      GloamLevel.playerStart.tx, GloamLevel.playerStart.ty
    );
    return {
      x: start.x,
      y: start.y,
      angle: 0, // facing right, toward the hall
      radius: 12,
      sneaking: false,
      moving: false,
      stepPhase: 0,
      stepAccum: 0,
      clickTarget: null, // {x, y} from a mouse click, or null
      hasLedger: false,
      seals: 0,
      sealsTaken: {},
      noiseRadius: 0
    };
  }

  function updatePlayer(player, dt, input) {
    var ix = 0;
    var iy = 0;
    if (input.left) ix -= 1;
    if (input.right) ix += 1;
    if (input.up) iy -= 1;
    if (input.down) iy += 1;

    var keyboardMoving = ix !== 0 || iy !== 0;
    if (keyboardMoving) player.clickTarget = null;

    player.sneaking = !!input.sneak;
    var speed = player.sneaking ? C.SNEAK_SPEED : C.WALK_SPEED;

    var mx = 0;
    var my = 0;
    if (keyboardMoving) {
      var len = Math.sqrt(ix * ix + iy * iy);
      mx = (ix / len) * speed * dt;
      my = (iy / len) * speed * dt;
      player.angle = Math.atan2(iy, ix);
    } else if (player.clickTarget) {
      // A click into a wall or a crate is not a destination: drop it so
      // Wren never walks into a wall forever.
      var targetTx = Math.floor(player.clickTarget.x / C.TILE);
      var targetTy = Math.floor(player.clickTarget.y / C.TILE);
      if (GloamLevel.isSolidTile(targetTx, targetTy)) {
        player.clickTarget = null;
      } else {
        var dx = player.clickTarget.x - player.x;
        var dy = player.clickTarget.y - player.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 6) {
          player.clickTarget = null;
        } else {
          var step = Math.min(dist, speed * dt);
          mx = (dx / dist) * step;
          my = (dy / dist) * step;
          player.angle = Math.atan2(dy, dx);
        }
      }
    }

    player.moving = mx !== 0 || my !== 0;
    if (player.moving) {
      var moved = GloamLevel.moveCircle(
        player.x, player.y, mx, my, player.radius
      );
      player.x = moved.x;
      player.y = moved.y;
      player.stepAccum += Math.sqrt(mx * mx + my * my);
    }
    player.noiseRadius = player.moving
      ? (player.sneaking ? C.NOISE_SNEAK : C.NOISE_WALK)
      : 0;

    // Pick up the ledger.
    if (!player.hasLedger && GloamLevel.nearVault(player.x, player.y)) {
      player.hasLedger = true;
      return { pickedLedger: true };
    }
    // Optional seals, hidden along the risky routes.
    for (var i = 0; i < C.SEALS.length; i++) {
      if (player.sealsTaken[i]) continue;
      var c = GloamLevel.tileCenter(C.SEALS[i].tx, C.SEALS[i].ty);
      var sdx = player.x - c.x;
      var sdy = player.y - c.y;
      if (sdx * sdx + sdy * sdy < 30 * 30) {
        player.sealsTaken[i] = true;
        player.seals += 1;
        return { pickedSeal: true, sealIndex: i };
      }
    }
    return null;
  }

  return {
    createPlayer: createPlayer,
    updatePlayer: updatePlayer
  };
})();
