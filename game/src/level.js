// Gloam Archive — level: tile map queries, collision, line of sight.
// The map is a grid of 40px tiles. Walls, shelves and crates block
// movement and sight; fern beds hide a sneaking player but not a walking
// one, and never block movement.

const GloamLevel = (function () {
  var C = GloamConfig;
  var TILE = C.TILE;

  // Parse the map once into lookup grids.
  var solid = []; // blocks movement: #, S, C
  var sight = []; // blocks sight: #, S, C, B (a fern bed reads as a wall of leaves)
  var bush = []; // fern-bed tiles
  var playerStart = null;
  var vault = null;
  var exitTile = null;

  function parseMap() {
    for (var y = 0; y < C.ROWS; y++) {
      solid[y] = [];
      sight[y] = [];
      bush[y] = [];
      for (var x = 0; x < C.COLS; x++) {
        var ch = C.MAP[y].charAt(x);
        solid[y][x] = ch === "#" || ch === "S" || ch === "C";
        sight[y][x] = ch === "#" || ch === "S" || ch === "C" || ch === "B";
        bush[y][x] = ch === "B";
        if (ch === "P") playerStart = { tx: x, ty: y };
        if (ch === "V") vault = { tx: x, ty: y };
        if (ch === "E") exitTile = { tx: x, ty: y };
      }
    }
  }
  parseMap();

  function tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= C.COLS || ty >= C.ROWS) return "#";
    return C.MAP[ty].charAt(tx);
  }

  function isSolidTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= C.COLS || ty >= C.ROWS) return true;
    return solid[ty][tx];
  }

  function isSightTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= C.COLS || ty >= C.ROWS) return true;
    return sight[ty][tx];
  }

  function isBushTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= C.COLS || ty >= C.ROWS) return false;
    return bush[ty][tx];
  }

  function tileCenter(tx, ty) {
    return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
  }

  // Circle-vs-solid-tiles collision: try the full move, then each axis.
  // Returns the new position after sliding along walls.
  function moveCircle(x, y, dx, dy, radius) {
    var nx = x + dx;
    var ny = y + dy;
    if (!circleHitsSolid(nx, y, radius)) x = nx;
    if (!circleHitsSolid(x, ny, radius)) y = ny;
    return { x: x, y: y };
  }

  function circleHitsSolid(x, y, radius) {
    var x0 = Math.floor((x - radius) / TILE);
    var x1 = Math.floor((x + radius) / TILE);
    var y0 = Math.floor((y - radius) / TILE);
    var y1 = Math.floor((y + radius) / TILE);
    for (var ty = y0; ty <= y1; ty++) {
      for (var tx = x0; tx <= x1; tx++) {
        if (!isSolidTile(tx, ty)) continue;
        var cx = Math.max(tx * TILE, Math.min(x, (tx + 1) * TILE));
        var cy = Math.max(ty * TILE, Math.min(y, (ty + 1) * TILE));
        var ddx = x - cx;
        var ddy = y - cy;
        if (ddx * ddx + ddy * ddy < radius * radius) return true;
      }
    }
    return false;
  }

  // Line of sight between two points, sampled along the segment. Walls,
  // shelves and crates always block it. A fern bed also blocks it — the
  // leaves are a wall of green — except when the target itself crouches
  // inside a fern bed: then the guard can still just about make them out
  // (the meter fills at the fern's slow rate instead of dropping to zero),
  // which is what makes hiding in the ferns a near-hide rather than a
  // perfect one.
  function lineOfSight(x0, y0, x1, y1) {
    var dx = x1 - x0;
    var dy = y1 - y0;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var steps = Math.max(1, Math.ceil(dist / 6));
    var targetTx = Math.floor(x1 / TILE);
    var targetTy = Math.floor(y1 / TILE);
    var targetInBush = isBushTile(targetTx, targetTy);
    for (var i = 1; i < steps; i++) {
      var t = i / steps;
      var px = x0 + dx * t;
      var py = y0 + dy * t;
      var tx = Math.floor(px / TILE);
      var ty = Math.floor(py / TILE);
      var ch = tileAt(tx, ty);
      if (ch === "#" || ch === "S" || ch === "C") return false;
      if (ch === "B" && !targetInBush) return false;
    }
    return true;
  }

  // Warm light pools around the wall lanterns. Standing in one makes
  // Wren far easier to spot; the dark between them is safer.
  function lightAt(x, y) {
    for (var i = 0; i < C.LANTERNS.length; i++) {
      var c = tileCenter(C.LANTERNS[i].tx, C.LANTERNS[i].ty);
      var dx = x - c.x;
      var dy = y - c.y;
      if (dx * dx + dy * dy < 110 * 110) return true;
    }
    return false;
  }

  function inBush(x, y) {
    return isBushTile(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  function nearExit(x, y) {
    var c = tileCenter(exitTile.tx, exitTile.ty);
    var dx = x - c.x;
    var dy = y - c.y;
    return dx * dx + dy * dy < 34 * 34;
  }

  function nearVault(x, y) {
    var c = tileCenter(vault.tx, vault.ty);
    var dx = x - c.x;
    var dy = y - c.y;
    return dx * dx + dy * dy < 34 * 34;
  }

  return {
    tileAt: tileAt,
    isSolidTile: isSolidTile,
    isSightTile: isSightTile,
    isBushTile: isBushTile,
    tileCenter: tileCenter,
    moveCircle: moveCircle,
    circleHitsSolid: circleHitsSolid,
    lineOfSight: lineOfSight,
    lightAt: lightAt,
    inBush: inBush,
    nearExit: nearExit,
    nearVault: nearVault,
    playerStart: playerStart,
    vault: vault,
    exitTile: exitTile
  };
})();
