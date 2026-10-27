/**
 * Original story/map content for The Systemic Depths.
 *
 * These are data definitions, intentionally separate from Phaser rendering and
 * the combat simulation so authored story rooms can be validated independently.
 */

export type ElementId = "fire" | "water" | "ice" | "lightning" | "earth";

export type StoryBeat = {
  id: string;
  title: string;
  text: string;
  objective: string;
};

export type StoryDungeon = {
  id: string;
  name: string;
  biome: string;
  seed: number;
  legend: Record<string, string>;
  layout: string[];
  entrance: { x: number; y: number };
  exit: { x: number; y: number };
  requiredElements: ElementId[];
};

export const ELEMENTS: Record<ElementId, { name: string; role: string; hint: string }> = {
  fire: {
    name: "Fire",
    role: "Pressure and area denial",
    hint: "Ignite oil to turn a safe-looking floor into a dangerous zone."
  },
  water: {
    name: "Water",
    role: "Control and setup",
    hint: "Extinguish flames and leave targets wet for a follow-up reaction."
  },
  ice: {
    name: "Ice",
    role: "Control and terrain",
    hint: "Freeze a wet enemy or slow a pursuer to create room to move."
  },
  lightning: {
    name: "Lightning",
    role: "Chaining burst",
    hint: "Wet enemies conduct lightning and can pass a strike to nearby foes."
  },
  earth: {
    name: "Earth",
    role: "Space control",
    hint: "Raise temporary cover to redirect a threat without sealing your escape."
  }
};

export const PROLOGUE: StoryBeat[] = [
  {
    id: "prologue-01",
    title: "The Stone Remembers",
    text: "Beneath the last city, the old descent has begun to breathe again. The stones carry a pulse that predates the five elements, and every stair leads closer to the silence at its source.",
    objective: "Reach the amber stairwell and survive the first descent."
  },
  {
    id: "prologue-02",
    title: "A Flame with a Shadow",
    text: "A cracked mural depicts five hands holding one dark sun. Someone has scraped the sixth figure from the stone. The ash beneath the mural is warm, though no fire burns nearby.",
    objective: "Find an oil slick and learn how the room itself can become a weapon."
  },
  {
    id: "prologue-03",
    title: "The Warden's Debt",
    text: "The Abyssal Warden was not built to keep intruders out. Its chains point inward. Something below once tried to climb out, and the Warden has been paying for that failure ever since.",
    objective: "Break the fifth-floor seal and defeat the Warden."
  }
];

/**
 * A compact authored tutorial room. Characters are tile symbols defined in
 * legend; the game can render these through its existing tile renderer later.
 * S=start, X=exit, #=wall, .=floor, O=oil, *=shard, ~=water, ^=earth cover.
 */
export const FIRST_STORY_DUNGEON: StoryDungeon = {
  id: "the-ash-threshold",
  name: "The Ash Threshold",
  biome: "Cinder Reliquary",
  seed: 41027,
  legend: {
    "#": "wall",
    ".": "floor",
    S: "entrance",
    X: "exit",
    O: "oil",
    "*": "shard",
    "~": "water",
    "^": "earth-cover"
  },
  layout: [
    "###########",
    "#S..O....X#",
    "#.###.##..#",
    "#...#.....#",
    "###.#.###.#",
    "#...O..~..#",
    "#.#####.#.#",
    "#*....^...#",
    "###########"
  ],
  entrance: { x: 1, y: 1 },
  exit: { x: 9, y: 1 },
  requiredElements: ["fire", "water", "earth"]
};

export type MapValidationIssue =
  | { code: "empty-layout"; message: string }
  | { code: "ragged-layout"; message: string }
  | { code: "unknown-tile"; message: string; tile: string; x: number; y: number }
  | { code: "entrance-mismatch"; message: string }
  | { code: "exit-mismatch"; message: string }
  | { code: "unreachable-exit"; message: string };

const WALKABLE = new Set([".", "S", "X", "O", "*", "~", "^"]);

export function validateStoryDungeon(dungeon: StoryDungeon): MapValidationIssue[] {
  const issues: MapValidationIssue[] = [];
  const rows = dungeon.layout;
  if (!rows.length || !rows[0]?.length) {
    return [{ code: "empty-layout", message: "Dungeon layout must contain at least one tile." }];
  }

  const width = rows[0]!.length;
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y]!;
    if (row.length !== width) {
      issues.push({ code: "ragged-layout", message: `Row ${y} has width ${row.length}; expected ${width}.` });
    }
    for (let x = 0; x < row.length; x++) {
      const tile = row[x]!;
      if (!(tile in dungeon.legend)) {
        issues.push({ code: "unknown-tile", message: `Unknown tile '${tile}' at ${x},${y}.`, tile, x, y });
      }
    }
  }
  if (issues.length) return issues;

  if (rows[dungeon.entrance.y]?.[dungeon.entrance.x] !== "S") {
    issues.push({ code: "entrance-mismatch", message: "Entrance coordinates must point to S." });
  }
  if (rows[dungeon.exit.y]?.[dungeon.exit.x] !== "X") {
    issues.push({ code: "exit-mismatch", message: "Exit coordinates must point to X." });
  }

  const start = dungeon.entrance;
  if (rows[start.y]?.[start.x] !== "S") return issues;
  const queue = [start];
  const visited = new Set([`${start.x},${start.y}`]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]!;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const x = current.x + dx, y = current.y + dy;
      const key = `${x},${y}`;
      if (visited.has(key) || !WALKABLE.has(rows[y]?.[x] ?? "#")) continue;
      visited.add(key);
      queue.push({ x, y });
    }
  }
  if (!visited.has(`${dungeon.exit.x},${dungeon.exit.y}`)) {
    issues.push({ code: "unreachable-exit", message: "Exit cannot be reached from the entrance." });
  }
  return issues;
}
