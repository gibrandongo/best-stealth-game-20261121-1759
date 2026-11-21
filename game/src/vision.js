// Gloam Archive — vision: guard sight cones and the detection meter.
// A guard sees Wren only inside its cone, inside its range, with a clear
// line of sight. How fast the meter fills depends on distance, light,
// stance and cover — so patience and the dark are the player's tools.

const GloamVision = (function () {
  var C = GloamConfig;

  function angleDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  // Is the player inside this guard's vision cone right now?
  function inCone(guard, px, py) {
    var dx = px - guard.x;
    var dy = py - guard.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > C.CONE_RANGE) return { seen: false, dist: dist };
    if (dist < 26) return { seen: true, dist: dist }; // brushed past: felt
    var ang = Math.atan2(dy, dx);
    var diff = Math.abs(angleDiff(ang, guard.angle));
    if (diff > C.CONE_HALF_ANGLE) return { seen: false, dist: dist };
    if (!GloamLevel.lineOfSight(guard.x, guard.y, px, py)) {
      return { seen: false, dist: dist };
    }
    return { seen: true, dist: dist };
  }

  // How fast the meter fills while this guard sees the player.
  // Closer is worse; light is worse; sneaking and fern beds help a lot.
  function detectionRate(guard, player) {
    var check = inCone(guard, player.x, player.y);
    if (!check.seen) return 0;
    var closeness = 1 - (check.dist / C.CONE_RANGE) * 0.5;
    var rate = C.DETECT_BASE_RATE * closeness;
    if (GloamLevel.lightAt(player.x, player.y)) {
      rate *= C.LIGHT_FACTOR;
    } else {
      rate *= C.SHADOW_FACTOR;
    }
    if (player.sneaking) rate *= C.SNEAK_FACTOR;
    if (GloamLevel.inBush(player.x, player.y)) {
      rate *= player.sneaking ? C.BUSH_SNEAK_FACTOR : C.BUSH_WALK_FACTOR;
    }
    return rate;
  }

  return {
    angleDiff: angleDiff,
    inCone: inCone,
    detectionRate: detectionRate
  };
})();
