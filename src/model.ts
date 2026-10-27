export type Point = { x: number; y: number };
export type Tile = "wall" | "floor" | "exit" | "shard";
export type Enemy = { id: number; x: number; y: number; hp: number };
export type GameState = {
  schemaVersion: 1;
  seed: number;
  floor: number;
  width: number;
  height: number;
  map: Tile[][];
  player: Point & { hp: number; maxHp: number };
  enemies: Enemy[];
  shards: number;
  turn: number;
  status: "playing" | "dead" | "won";
};
export type Move = "up" | "down" | "left" | "right" | "wait";
export const DIRECTIONS: Record<Move, Point> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, wait: { x: 0, y: 0 }
};

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRun(seed = Date.now() >>> 0, floor = 1, shards = 0): GameState {
  const width = 13, height = 13, random = rng(seed + floor * 997);
  const map: Tile[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ? "wall" : "floor")
  );
  for (let y = 2; y < height - 2; y++) for (let x = 2; x < width - 2; x++) {
    if (random() < 0.13 && x !== 6 && y !== 6) map[y]![x] = "wall";
  }
  for (let i = 1; i < width - 1; i++) {
    map[1]![i] = "floor";
    map[height - 2]![i] = "floor";
  }
  for (let i = 1; i < height - 1; i++) {
    map[i]![1] = "floor";
    map[i]![width - 2] = "floor";
  }
  map[height - 2]![width - 2] = "exit";
  const candidates: Point[] = [];
  for (let y = 2; y < height - 2; y++) for (let x = 2; x < width - 2; x++) {
    if (map[y]![x] === "floor" && !(x < 4 && y < 4) && !(x > width - 5 && y > height - 5)) candidates.push({ x, y });
  }
  const enemies: Enemy[] = [];
  for (let i = 0, count = Math.min(2 + floor, 6); i < count && candidates.length; i++) {
    const p = candidates.splice(Math.floor(random() * candidates.length), 1)[0]!;
    enemies.push({ id: i + 1, x: p.x, y: p.y, hp: floor > 4 ? 3 : 2 });
  }
  for (let i = 0; i < Math.min(2, floor + 1) && candidates.length; i++) {
    const p = candidates.splice(Math.floor(random() * candidates.length), 1)[0]!;
    map[p.y]![p.x] = "shard";
  }
  return { schemaVersion: 1, seed, floor, width, height, map, player: { x: 1, y: 1, hp: 12, maxHp: 12 }, enemies, shards, turn: 0, status: "playing" };
}

export type TurnResult = { state: GameState; messages: string[] };
export function takeTurn(previous: GameState, move: Move): TurnResult {
  const s: GameState = structuredClone(previous);
  const messages: string[] = [];
  if (s.status !== "playing") return { state: s, messages: ["This run has ended. Start a new descent."] };
  const d = DIRECTIONS[move], nx = s.player.x + d.x, ny = s.player.y + d.y;
  let consumed = move === "wait";
  if (move !== "wait" && s.map[ny]?.[nx] && s.map[ny]![nx] !== "wall") {
    const enemy = s.enemies.find(e => e.x === nx && e.y === ny);
    if (enemy) {
      enemy.hp -= 2;
      consumed = true;
      messages.push("You strike the depth-stalker for 2 damage.");
      if (enemy.hp <= 0) {
        s.enemies = s.enemies.filter(e => e.id !== enemy.id);
        messages.push("The depth-stalker crumbles into dust.");
      }
    } else {
      s.player.x = nx;
      s.player.y = ny;
      consumed = true;
      const tile = s.map[ny]![nx]!;
      if (tile === "shard") {
        s.shards++;
        s.map[ny]![nx] = "floor";
        messages.push("A resonance shard hums in your palm. +1 shard.");
      }
      if (tile === "exit") {
        if (s.floor >= 5) {
          s.status = "won";
          messages.push("The trial gate opens. You reached the end of the five-floor trial.");
        } else {
          const next = createRun(s.seed, s.floor + 1, s.shards);
          next.player.hp = s.player.hp;
          next.player.maxHp = s.player.maxHp;
          next.turn = s.turn + 1;
          return { state: next, messages: ["You descend to floor " + next.floor + "."] };
        }
      }
    }
  } else if (move !== "wait") {
    messages.push("The stone refuses your path.");
  }
  if (consumed && s.status === "playing") {
    s.turn++;
    for (const e of s.enemies) {
      const dx = s.player.x - e.x, dy = s.player.y - e.y;
      const distance = Math.abs(dx) + Math.abs(dy);
      if (distance === 1) {
        s.player.hp--;
        messages.push("A depth-stalker claws you for 1 damage.");
        continue;
      }
      if (distance <= 5) {
        const sx = Math.sign(dx), sy = Math.sign(dy);
        const options: Point[] = Math.abs(dx) >= Math.abs(dy)
          ? [{ x: e.x + sx, y: e.y }, { x: e.x, y: e.y + sy }]
          : [{ x: e.x, y: e.y + sy }, { x: e.x + sx, y: e.y }];
        const target = options.find(p => s.map[p.y]?.[p.x] !== "wall" &&
          !s.enemies.some(other => other.id !== e.id && other.x === p.x && other.y === p.y) &&
          !(p.x === s.player.x && p.y === s.player.y));
        if (target) { e.x = target.x; e.y = target.y; }
      }
    }
    if (s.player.hp <= 0) {
      s.player.hp = 0;
      s.status = "dead";
      messages.push("You fall silent. The dungeon keeps its secrets.");
    }
    if (!messages.length) messages.push(move === "wait" ? "You listen. The dungeon answers." : "You move deeper into the dark.");
  }
  return { state: s, messages };
}
