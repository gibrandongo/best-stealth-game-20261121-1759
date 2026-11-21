// Gloam Archive — configuration: level map, guards, lanterns, tuning.
// A quiet heist in the Marlowe Archive. The player, Wren, slips in through
// the service door, lifts the Gloam Ledger from the vault, and leaves by
// the garden gate without ever being seen.

const GloamConfig = (function () {
  var TILE = 40;
  var COLS = 32;
  var ROWS = 18;

  // Map legend:
  //   # wall   . floor   C crate (blocks move + sight)
  //   B fern bed (hides a sneaking player, blocks sight through it)
  //   S shelf (blocks move + sight)
  //   P player start   V the Gloam Ledger (vault)   E garden-gate exit
  //   o lantern (warm light pool)
  var MAP = [
    "################################",
    "#......#.......#.......#.......#",
    "#..B...#...S...#...C...#...V...#",
    "#......#.......#.......#.......#",
    "#..S...#...B...#...C...#.......#",
    "###.########.######.#######.####",
    "#..............................#",
    "#..C....B....C.......B....C....#",
    "#..............................#",
    "#....C.......B....S......C.....#",
    "#..............................#",
    "###.#########.#######.#######.##",
    "#..............................#",
    "#..B....C....B.......C....B....#",
    "#..............................#",
    "#P.....#.......#.......#......E#",
    "#......#...C...#...B...#.......#",
    "################################"
  ];

  // Five lantern wardens on patrol. Waypoints are tile coordinates.
  var GUARDS = [
    {
      name: "Warden Ash",
      color: "#e8b04b",
      waypoints: [[9, 8], [22, 8], [22, 10], [9, 10]],
      speed: 58
    },
    {
      name: "Warden Bram",
      color: "#e87a4b",
      waypoints: [[9, 3], [13, 3], [13, 4], [9, 4]],
      speed: 52
    },
    {
      name: "Warden Cleo",
      color: "#b04be8",
      waypoints: [[4, 13], [17, 13], [17, 14], [4, 14]],
      speed: 55
    },
    {
      name: "Warden Dov",
      color: "#4be8a0",
      waypoints: [[25, 2], [29, 2], [29, 4], [25, 4]],
      speed: 50
    },
    {
      name: "Warden Em",
      color: "#4b9fe8",
      waypoints: [[2, 2], [5, 2], [5, 4], [2, 4]],
      speed: 48
    }
  ];

  // Extra lanterns hung in the open hall (the map's `o` tiles are floor
  // lanterns too; these are wall sconces over the main lanes).
  var LANTERNS = [
    { tx: 8, ty: 8 },
    { tx: 16, ty: 8 },
    { tx: 24, ty: 8 },
    { tx: 12, ty: 13 },
    { tx: 20, ty: 13 },
    { tx: 27, ty: 6 }
  ];

  // Optional seals: small golden stamps hidden along risky routes.
  var SEALS = [
    { tx: 29, ty: 7 },
    { tx: 3, ty: 9 },
    { tx: 16, ty: 16 }
  ];

  return {
    TILE: TILE,
    COLS: COLS,
    ROWS: ROWS,
    MAP: MAP,
    GUARDS: GUARDS,
    LANTERNS: LANTERNS,
    SEALS: SEALS,
    // Movement (pixels per second).
    WALK_SPEED: 150,
    SNEAK_SPEED: 72,
    GUARD_CHASE_SPEED: 118,
    // Vision.
    CONE_RANGE: 175,
    CONE_HALF_ANGLE: 0.66, // radians, about 38 degrees each side
    // Detection meter 0..100.
    DETECT_BASE_RATE: 62, // per second at point blank, standing in light
    DETECT_DECAY_RATE: 30, // per second while unseen
    SUSPICIOUS_AT: 55, // guard turns and investigates
    ALARM_AT: 100, // full alarm: every guard chases
    LIGHT_FACTOR: 1.6, // standing in a lantern pool
    SHADOW_FACTOR: 0.55, // standing in the dark
    SNEAK_FACTOR: 0.55,
    BUSH_SNEAK_FACTOR: 0.12, // hidden in a fern bed while sneaking
    BUSH_WALK_FACTOR: 0.4,
    // Noise: guards hear footsteps inside this radius.
    NOISE_WALK: 78,
    NOISE_SNEAK: 22,
    // Alarm behaviour.
    LOSE_SIGHT_SECONDS: 4, // unseen this long while alarmed: guards search
    SEARCH_SECONDS: 3, // guards search the last-seen spot, then stand down
    CATCH_RADIUS: 24 // a chasing guard this close catches Wren
  };
})();
