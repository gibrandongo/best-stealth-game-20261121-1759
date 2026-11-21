// Gloam Archive — patrol: the lantern wardens' behaviour.
// Each guard walks its route, pauses at every waypoint to look around,
// and reacts to what it sees and hears:
//   patrol -> suspicious (meter over the line, or a noise heard)
//   suspicious -> chase (meter full: the alarm sounds, all guards come)
//   chase -> search (lost sight: comb the last-seen spot)
//   search -> patrol (nothing found: back to the route, meter draining)
// A guard that spots Wren mid-chase catches them on contact.

const GloamPatrol = (function () {
  var C = GloamConfig;

  function createGuard(def, index) {
    var start = GloamLevel.tileCenter(def.waypoints[0][0], def.waypoints[0][1]);
    return {
      index: index,
      name: def.name,
      color: def.color,
      waypoints: def.waypoints,
      speed: def.speed,
      x: start.x,
      y: start.y,
      angle: Math.PI / 2, // facing down the hall to start
      state: "patrol", // patrol | suspicious | chase | search | return
      waypointIndex: 1,
      waitTimer: 0,
      lookTimer: 0,
      lookTarget: 0, // where the guard is looking while it waits
      detection: 0, // this guard's own meter, 0..100
      lastSeenX: 0,
      lastSeenY: 0,
      lostSightTimer: 0,
      searchTimer: 0,
      heardX: 0,
      heardY: 0,
      stepPhase: 0,
      bobPhase: Math.random() * Math.PI * 2
    };
  }

  function createGuards() {
    var guards = [];
    for (var i = 0; i < C.GUARDS.length; i++) {
      guards.push(createGuard(C.GUARDS[i], i));
    }
    return guards;
  }

  function turnToward(guard, targetAngle, dt, turnSpeed) {
    var diff = GloamVision.angleDiff(targetAngle, guard.angle);
    var step = turnSpeed * dt;
    if (Math.abs(diff) <= step) {
      guard.angle = targetAngle;
    } else {
      guard.angle += diff > 0 ? step : -step;
    }
  }

  function walkToward(guard, tx, ty, speed, dt) {
    var dx = tx - guard.x;
    var dy = ty - guard.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return true;
    var want = Math.atan2(dy, dx);
    turnToward(guard, want, dt, 5.5);
    // Only walk once roughly facing the target, so turns read clearly.
    var facing = Math.abs(GloamVision.angleDiff(want, guard.angle));
    if (facing > 0.9) return false;
    var step = Math.min(dist, speed * dt);
    var moved = GloamLevel.moveCircle(
      guard.x, guard.y,
      Math.cos(guard.angle) * step, Math.sin(guard.angle) * step, 13
    );
    guard.x = moved.x;
    guard.y = moved.y;
    guard.stepPhase += step;
    return dist - step < 3;
  }

  // One guard's tick. `events` collects sounds and state changes for the
  // audio layer and the HUD; `shared` is the alarm state all guards read.
  function updateGuard(guard, dt, player, shared, events) {
    var seen = GloamVision.inCone(guard, player.x, player.y);
    var rate = GloamVision.detectionRate(guard, player);

    if (seen.seen) {
      guard.lastSeenX = player.x;
      guard.lastSeenY = player.y;
      guard.lostSightTimer = 0;
      guard.detection = Math.min(100, guard.detection + rate * dt);
    } else {
      guard.lostSightTimer += dt;
      guard.detection = Math.max(0, guard.detection - C.DETECT_DECAY_RATE * dt);
    }

    // Hearing: footsteps inside the noise ring turn a patrolling guard.
    if (guard.state === "patrol" && player.moving && !player.sneaking) {
      var ndx = player.x - guard.x;
      var ndy = player.y - guard.y;
      var ndist = Math.sqrt(ndx * ndx + ndy * ndy);
      if (ndist < C.NOISE_WALK) {
        guard.state = "suspicious";
        guard.heardX = player.x;
        guard.heardY = player.y;
        guard.lookTimer = 0;
        events.push({ type: "heard", guard: guard });
      }
    }

    if (guard.detection >= C.SUSPICIOUS_AT && guard.state === "patrol") {
      guard.state = "suspicious";
      guard.lookTimer = 0;
      events.push({ type: "suspicious", guard: guard });
    }

    if (guard.detection >= C.ALARM_AT && guard.state !== "chase") {
      guard.state = "chase";
      shared.alarm = true;
      shared.alarmTimer = 0;
      events.push({ type: "alarm", guard: guard });
    }

    if (shared.alarm && guard.state !== "chase") {
      // The alarm pulls every guard into the hunt.
      guard.state = "chase";
      guard.lostSightTimer = 0;
    }

    switch (guard.state) {
      case "patrol": {
        if (guard.waitTimer > 0) {
          guard.waitTimer -= dt;
          // Look around while waiting at a waypoint: pick a new facing
          // about once a second and turn to it, instead of drifting.
          guard.lookTimer += dt;
          if (guard.lookTimer > 1.1) {
            guard.lookTimer = 0;
            guard.lookTarget = guard.angle + (Math.random() - 0.5) * Math.PI * 1.6;
          }
          turnToward(guard, guard.lookTarget, dt, 1.2);
          break;
        }
        var wp = guard.waypoints[guard.waypointIndex];
        var target = GloamLevel.tileCenter(wp[0], wp[1]);
        var arrived = walkToward(guard, target.x, target.y, guard.speed, dt);
        if (arrived) {
          guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
          guard.waitTimer = 0.9 + Math.random() * 0.9;
          guard.lookTimer = 0;
        }
        break;
      }
      case "suspicious": {
        // Turn to face the glimpse (or the noise), then walk over to check.
        var sx = guard.detection > 0 ? guard.lastSeenX : guard.heardX;
        var sy = guard.detection > 0 ? guard.lastSeenY : guard.heardY;
        var wantAngle = Math.atan2(sy - guard.y, sx - guard.x);
        turnToward(guard, wantAngle, dt, 3.2);
        guard.lookTimer += dt;
        if (guard.lookTimer > 0.9) {
          var arrived2 = walkToward(guard, sx, sy, guard.speed * 1.25, dt);
          if (arrived2 || guard.lookTimer > 3.5) {
            guard.state = "search";
            guard.searchTimer = 0;
          }
        }
        if (guard.detection <= 0 && guard.lookTimer > 2.2) {
          guard.state = "return";
        }
        break;
      }
      case "chase": {
        // Hunt the player's live position while seen; the last-seen spot
        // once sight is lost. Caught on contact.
        var cx = seen.seen ? player.x : guard.lastSeenX;
        var cy = seen.seen ? player.y : guard.lastSeenY;
        walkToward(guard, cx, cy, C.GUARD_CHASE_SPEED, dt);
        var cdx = player.x - guard.x;
        var cdy = player.y - guard.y;
        if (cdx * cdx + cdy * cdy < C.CATCH_RADIUS * C.CATCH_RADIUS) {
          events.push({ type: "caught", guard: guard });
        }
        if (!seen.seen && guard.lostSightTimer > C.LOSE_SIGHT_SECONDS) {
          guard.state = "search";
          guard.searchTimer = 0;
          events.push({ type: "lost", guard: guard });
        }
        break;
      }
      case "search": {
        // Comb the last-seen spot: walk there, look around, give up.
        var arrived3 = walkToward(
          guard, guard.lastSeenX, guard.lastSeenY, guard.speed * 1.1, dt
        );
        if (arrived3) {
          guard.searchTimer += dt;
          guard.lookTimer += dt;
          if (guard.lookTimer > 0.8) {
            guard.lookTimer = 0;
            guard.angle += (Math.random() - 0.5) * Math.PI;
          }
          if (guard.searchTimer > C.SEARCH_SECONDS) {
            guard.state = "return";
          }
        }
        break;
      }
      case "return": {
        // Walk back to the nearest waypoint, then resume the route.
        var best = 0;
        var bestDist = Infinity;
        for (var i = 0; i < guard.waypoints.length; i++) {
          var c = GloamLevel.tileCenter(guard.waypoints[i][0], guard.waypoints[i][1]);
          var ddx = c.x - guard.x;
          var ddy = c.y - guard.y;
          var d = ddx * ddx + ddy * ddy;
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        }
        var back = GloamLevel.tileCenter(
          guard.waypoints[best][0], guard.waypoints[best][1]
        );
        var done = walkToward(guard, back.x, back.y, guard.speed, dt);
        if (done) {
          guard.waypointIndex = (best + 1) % guard.waypoints.length;
          guard.state = "patrol";
          guard.waitTimer = 0.5;
        }
        break;
      }
    }
  }

  function updateGuards(guards, dt, player, shared, events) {
    for (var i = 0; i < guards.length; i++) {
      updateGuard(guards[i], dt, player, shared, events);
    }
    // The alarm stands down only when every guard has calmed down.
    if (shared.alarm) {
      var anyHot = false;
      for (var j = 0; j < guards.length; j++) {
        if (guards[j].state === "chase" || guards[j].detection > 0) {
          anyHot = true;
          break;
        }
      }
      if (!anyHot) {
        shared.alarm = false;
        events.push({ type: "calm" });
      }
    }
  }

  return {
    createGuards: createGuards,
    createGuard: createGuard,
    updateGuards: updateGuards
  };
})();
