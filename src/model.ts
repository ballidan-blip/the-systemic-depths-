export type Point = { x: number; y: number };
export type Tile = "wall" | "floor" | "exit" | "shard" | "oil" | "potion" | "bomb" | "fire";
export type EnemyKind = "stalker" | "brute" | "warden";
export type Enemy = { id: number; kind: EnemyKind; x: number; y: number; hp: number; maxHp: number };
export type Inventory = { potions: number; firebombs: number };
export type GameState = {
  schemaVersion: 2;
  seed: number;
  floor: number;
  width: number;
  height: number;
  map: Tile[][];
  player: Point & { hp: number; maxHp: number };
  enemies: Enemy[];
  inventory: Inventory;
  shards: number;
  turn: number;
  status: "playing" | "dead" | "won";
};
export type Move = "up" | "down" | "left" | "right" | "wait";
export type ItemAction = "potion" | "firebomb";
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

function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function damageEnemy(s: GameState, enemy: Enemy, amount: number, messages: string[]) {
  enemy.hp -= amount;
  messages.push(enemy.kind === "warden"
    ? "The Abyssal Warden takes " + amount + " damage."
    : "The " + enemy.kind + " takes " + amount + " damage.");
  if (enemy.hp <= 0) {
    s.enemies = s.enemies.filter(candidate => candidate.id !== enemy.id);
    if (enemy.kind === "warden") {
      s.shards += 5;
      messages.push("The Warden collapses. The sealed stairwell unlocks. +5 resonance shards.");
    } else {
      s.shards++;
      messages.push("The " + enemy.kind + " falls. +1 resonance shard.");
    }
  }
}

export function createRun(seed = Date.now() >>> 0, floor = 1, shards = 0): GameState {
  const width = 13, height = 13, random = rng(seed + floor * 997);
  const map: Tile[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ? "wall" : "floor")
  );
  for (let y = 2; y < height - 2; y++) for (let x = 2; x < width - 2; x++) {
    if (random() < 0.1 && x !== 6 && y !== 6) map[y]![x] = "wall";
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
  const takeCandidate = (): Point | undefined => {
    if (!candidates.length) return undefined;
    return candidates.splice(Math.floor(random() * candidates.length), 1)[0];
  };
  const enemies: Enemy[] = [];
  if (floor === 5) {
    const p = takeCandidate() ?? { x: 6, y: 6 };
    enemies.push({ id: 99, kind: "warden", x: p.x, y: p.y, hp: 16, maxHp: 16 });
  }
  const count = floor === 5 ? 2 : Math.min(2 + floor, 6);
  for (let i = 0; i < count && candidates.length; i++) {
    const p = takeCandidate();
    if (!p) break;
    const kind: EnemyKind = floor >= 3 && random() < 0.3 ? "brute" : "stalker";
    const hp = kind === "brute" ? 5 : 3;
    enemies.push({ id: i + 1, kind, x: p.x, y: p.y, hp, maxHp: hp });
  }
  for (let i = 0; i < Math.min(2, floor + 1) && candidates.length; i++) {
    const p = takeCandidate();
    if (p) map[p.y]![p.x] = "shard";
  }
  // Consumables are visible, deterministic pickups. Oil creates useful firebomb combos.
  for (const tile of ["potion", "bomb", "oil"] as const) {
    const p = takeCandidate();
    if (p) map[p.y]![p.x] = tile;
  }
  return {
    schemaVersion: 2, seed, floor, width, height, map,
    player: { x: 1, y: 1, hp: 12, maxHp: 12 },
    enemies, inventory: { potions: 2, firebombs: 2 }, shards, turn: 0, status: "playing"
  };
}

export type TurnResult = { state: GameState; messages: string[] };

function enemyTurn(s: GameState, messages: string[]) {
  for (const enemy of [...s.enemies]) {
    if (!s.enemies.some(current => current.id === enemy.id) || s.status !== "playing") continue;
    const distance = manhattan(enemy, s.player);
    if (distance === 1) {
      const damage = enemy.kind === "warden" ? 2 : enemy.kind === "brute" ? 2 : 1;
      s.player.hp -= damage;
      messages.push(enemy.kind === "warden" ? "The Warden slams you for 2 damage." :
        enemy.kind === "brute" ? "The brute crushes you for 2 damage." : "The stalker claws you for 1 damage.");
      continue;
    }
    const range = enemy.kind === "warden" ? 7 : 5;
    if (distance <= range) {
      const dx = s.player.x - enemy.x, dy = s.player.y - enemy.y;
      const sx = Math.sign(dx), sy = Math.sign(dy);
      const options: Point[] = Math.abs(dx) >= Math.abs(dy)
        ? [{ x: enemy.x + sx, y: enemy.y }, { x: enemy.x, y: enemy.y + sy }]
        : [{ x: enemy.x, y: enemy.y + sy }, { x: enemy.x + sx, y: enemy.y }];
      const target = options.find(p => s.map[p.y]?.[p.x] !== "wall" &&
        s.map[p.y]?.[p.x] !== "fire" &&
        !s.enemies.some(other => other.id !== enemy.id && other.x === p.x && other.y === p.y) &&
        !(p.x === s.player.x && p.y === s.player.y));
      if (target) {
        enemy.x = target.x;
        enemy.y = target.y;
        if (enemy.kind === "warden") messages.push("The Warden advances, dragging a wake of ash.");
      }
    }
  }
  if (s.player.hp <= 0) {
    s.player.hp = 0;
    s.status = "dead";
    messages.push("You fall silent. The dungeon keeps its secrets.");
  }
}

export function useItem(previous: GameState, action: ItemAction): TurnResult {
  const s = structuredClone(previous);
  const messages: string[] = [];
  if (s.status !== "playing") return { state: s, messages: ["This run has ended. Start a new descent."] };
  if (action === "potion") {
    if (s.inventory.potions <= 0) return { state: s, messages: ["No healing potions remain."] };
    if (s.player.hp === s.player.maxHp) return { state: s, messages: ["You are already at full vitality. Save the potion."] };
    s.inventory.potions--;
    const healed = Math.min(5, s.player.maxHp - s.player.hp);
    s.player.hp += healed;
    messages.push("You drink a bitter red potion and recover " + healed + " vitality.");
  } else {
    if (s.inventory.firebombs <= 0) return { state: s, messages: ["No firebombs remain."] };
    const targets = s.enemies.filter(e => manhattan(e, s.player) <= 5).sort((a, b) => manhattan(a, s.player) - manhattan(b, s.player));
    if (!targets.length) return { state: s, messages: ["No enemy is close enough to target with a firebomb."] };
    s.inventory.firebombs--;
    const target = targets[0]!;
    const blast: Point[] = [];
    for (let y = Math.max(1, target.y - 1); y <= Math.min(s.height - 2, target.y + 1); y++) {
      for (let x = Math.max(1, target.x - 1); x <= Math.min(s.width - 2, target.x + 1); x++) {
        if (manhattan({ x, y }, target) <= 2 && s.map[y]![x] !== "wall") blast.push({ x, y });
      }
    }
    const ignitedOil = blast.filter(p => s.map[p.y]![p.x] === "oil").length;
    for (const p of blast) {
      if (s.map[p.y]![p.x] === "oil") s.map[p.y]![p.x] = "fire";
      else if (s.map[p.y]![p.x] === "fire") s.map[p.y]![p.x] = "fire";
    }
    messages.push(ignitedOil ? "The firebomb ignites the oil slick. Flame races across the floor!" : "The firebomb bursts in a ring of flame.");
    for (const enemy of [...s.enemies]) {
      if (manhattan(enemy, target) <= 2) damageEnemy(s, enemy, enemy.kind === "warden" ? 4 : 4 + (ignitedOil ? 2 : 0), messages);
    }
    // Burning tiles are dangerous to enemies that stand on them; the player can see the hazard.
    for (const enemy of [...s.enemies]) if (s.map[enemy.y]![enemy.x] === "fire") damageEnemy(s, enemy, 2, messages);
  }
  s.turn++;
  if (s.status === "playing") enemyTurn(s, messages);
  return { state: s, messages };
}

export function takeTurn(previous: GameState, move: Move): TurnResult {
  const s: GameState = structuredClone(previous);
  const messages: string[] = [];
  if (s.status !== "playing") return { state: s, messages: ["This run has ended. Start a new descent."] };
  const d = DIRECTIONS[move], nx = s.player.x + d.x, ny = s.player.y + d.y;
  let consumed = move === "wait";
  if (move !== "wait" && s.map[ny]?.[nx] && s.map[ny]![nx] !== "wall") {
    const enemy = s.enemies.find(e => e.x === nx && e.y === ny);
    if (enemy) {
      consumed = true;
      damageEnemy(s, enemy, 2, messages);
    } else {
      s.player.x = nx;
      s.player.y = ny;
      consumed = true;
      const tile = s.map[ny]![nx]!;
      if (tile === "shard") {
        s.shards++;
        s.map[ny]![nx] = "floor";
        messages.push("A resonance shard hums in your palm. +1 shard.");
      } else if (tile === "potion") {
        s.inventory.potions++;
        s.map[ny]![nx] = "floor";
        messages.push("You find a red healing potion. +1 potion.");
      } else if (tile === "bomb") {
        s.inventory.firebombs++;
        s.map[ny]![nx] = "floor";
        messages.push("You recover a firebomb. +1 firebomb.");
      } else if (tile === "oil") {
        messages.push("An oil slick coats the stones. A firebomb here could turn it into a hazard.");
      } else if (tile === "fire") {
        s.player.hp -= 2;
        messages.push("Flames lick your boots. You take 2 damage!");
      } else if (tile === "exit") {
        if (s.floor === 5 && s.enemies.some(e => e.kind === "warden")) {
          messages.push("The Warden seals the trial gate. Defeat it to escape.");
          s.player.x -= d.x;
          s.player.y -= d.y;
          // A sealed gate attempt still gives enemies a turn.
        } else if (s.floor >= 5) {
          s.status = "won";
          messages.push("The trial gate opens. You survived all five floors and defeated the Abyssal Warden!");
        } else {
          const next = createRun(s.seed, s.floor + 1, s.shards);
          next.player.hp = s.player.hp;
          next.player.maxHp = s.player.maxHp;
          next.inventory = { ...s.inventory };
          next.turn = s.turn + 1;
          return { state: next, messages: ["You descend to floor " + next.floor + ". Your inventory carries forward."] };
        }
      }
    }
  } else if (move !== "wait") {
    messages.push("The stone refuses your path.");
  }
  if (consumed && s.status === "playing") {
    s.turn++;
    // Existing flames burn creatures that occupy them at the start of the turn.
    for (const enemy of [...s.enemies]) if (s.map[enemy.y]![enemy.x] === "fire") damageEnemy(s, enemy, 2, messages);
    enemyTurn(s, messages);
    if (!messages.length) messages.push(move === "wait" ? "You listen. The dungeon answers." : "You move deeper into the dark.");
  }
  return { state: s, messages };
}
