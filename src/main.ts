import Phaser from "phaser";
import { createRun, takeTurn, useItem, type GameState, type Move, type ItemAction, type Enemy } from "./model";
import { loadRun, saveRun } from "./save";
import "./style.css";

const COLORS = { wall: 0x252b3b, floor: 0x151a27, exit: 0xc7a664, shard: 0x73b6b4, potion: 0xd66e78, bomb: 0xe79a54, oil: 0x71654b, fire: 0xf16c3d, player: 0xe9dfc5, enemy: 0xb96f70, brute: 0xd18a4b, boss: 0x9e73c8, grid: 0x34394a };
const TILE = 32;
let state: GameState = createRun();
let sceneRef: DungeonScene | undefined;
let logMessages = ["The stone remembers every step.", "Find the amber stairwell."];

class DungeonScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  constructor() { super("dungeon"); }
  create() {
    sceneRef = this;
    this.graphics = this.add.graphics();
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const moves: Record<string, Move> = { arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right", ".": "wait" };
      if (moves[key]) act(moves[key]!);
      if (key === "q") actItem("potion");
      if (key === "e") actItem("firebomb");
    });
    this.scale.on("resize", () => this.drawBoard());
    this.drawBoard();
  }
  drawBoard() {
    if (!this.graphics) return;
    this.graphics.clear();
    const boardW = state.width * TILE, boardH = state.height * TILE;
    const scale = Math.max(0.1, Math.min((this.scale.width - 18) / boardW, (this.scale.height - 18) / boardH));
    const size = TILE * scale, ox = (this.scale.width - state.width * size) / 2, oy = (this.scale.height - state.height * size) / 2;
    for (let y = 0; y < state.height; y++) for (let x = 0; x < state.width; x++) {
      const tile = state.map[y]![x]!;
      const color = COLORS[tile] ?? COLORS.floor;
      this.graphics.fillStyle(color, 1);
      this.graphics.fillRoundedRect(ox + x * size + 1, oy + y * size + 1, size - 2, size - 2, Math.max(1, 2 * scale));
      this.graphics.lineStyle(1, COLORS.grid, 0.5);
      this.graphics.strokeRect(ox + x * size + 1, oy + y * size + 1, size - 2, size - 2);
      const cx = ox + (x + .5) * size, cy = oy + (y + .5) * size;
      if (tile === "exit") {
        this.graphics.fillStyle(0xf0d99b, 1);
        this.graphics.fillCircle(cx, cy, size * .24);
      } else if (tile === "shard") {
        this.graphics.fillStyle(0xb2ffff, 1);
        this.graphics.fillPoints([{ x: cx, y: cy - size * .3 }, { x: cx + size * .19, y: cy }, { x: cx, y: cy + size * .3 }, { x: cx - size * .19, y: cy }], true);
      } else if (tile === "potion") {
        this.graphics.fillStyle(0xffb6bd, 1);
        this.graphics.fillRoundedRect(cx - size * .13, cy - size * .2, size * .26, size * .4, size * .05);
        this.graphics.fillStyle(0xf6e6ca, 1);
        this.graphics.fillRect(cx - size * .08, cy - size * .27, size * .16, size * .08);
      } else if (tile === "bomb") {
        this.graphics.fillStyle(0xffd29a, 1);
        this.graphics.fillCircle(cx, cy, size * .2);
        this.graphics.lineStyle(Math.max(1, size * .04), 0xffe6a8, 1);
        this.graphics.lineBetween(cx + size * .1, cy - size * .15, cx + size * .22, cy - size * .29);
      } else if (tile === "oil") {
        this.graphics.fillStyle(0x29251f, 0.9);
        this.graphics.fillEllipse(cx, cy, size * .68, size * .38);
      } else if (tile === "fire") {
        this.graphics.fillStyle(0xffd17b, 1);
        this.graphics.fillTriangle(cx, cy - size * .28, cx - size * .2, cy + size * .2, cx + size * .2, cy + size * .2);
      }
    }
    for (const enemy of state.enemies) this.drawEnemy(enemy, ox, oy, size);
    const px = ox + (state.player.x + .5) * size, py = oy + (state.player.y + .5) * size;
    this.graphics.fillStyle(COLORS.player, 1);
    this.graphics.fillRoundedRect(px - size * .25, py - size * .31, size * .5, size * .62, size * .1);
    this.graphics.fillStyle(0xb69a62, 1);
    this.graphics.fillCircle(px, py - size * .35, size * .18);
    updateHud();
  }
  private drawEnemy(enemy: Enemy, ox: number, oy: number, size: number) {
    const cx = ox + (enemy.x + .5) * size, cy = oy + (enemy.y + .5) * size;
    const color = enemy.kind === "warden" ? COLORS.boss : enemy.kind === "brute" ? COLORS.brute : COLORS.enemy;
    this.graphics.fillStyle(color, 1);
    if (enemy.kind === "warden") {
      this.graphics.fillPoints([{ x: cx, y: cy - size * .36 }, { x: cx + size * .3, y: cy - size * .13 }, { x: cx + size * .24, y: cy + size * .25 }, { x: cx, y: cy + size * .34 }, { x: cx - size * .24, y: cy + size * .25 }, { x: cx - size * .3, y: cy - size * .13 }], true);
      this.graphics.fillStyle(0xffe5a2, 1);
      this.graphics.fillCircle(cx - size * .1, cy - size * .03, size * .045);
      this.graphics.fillCircle(cx + size * .1, cy - size * .03, size * .045);
    } else {
      this.graphics.fillCircle(cx, cy, size * (enemy.kind === "brute" ? .33 : .27));
      this.graphics.fillStyle(0x2a1118, 1);
      this.graphics.fillCircle(cx - size * .08, cy - size * .04, size * .035);
      this.graphics.fillCircle(cx + size * .08, cy - size * .04, size * .035);
    }
    const barW = size * .62, barH = Math.max(2, size * .07);
    this.graphics.fillStyle(0x291c27, 1);
    this.graphics.fillRect(cx - barW / 2, cy + size * .34, barW, barH);
    this.graphics.fillStyle(enemy.kind === "warden" ? 0xd6a3ff : 0xe7a1a1, 1);
    this.graphics.fillRect(cx - barW / 2, cy + size * .34, barW * Math.max(0, enemy.hp / enemy.maxHp), barH);
  }
}

function updateHud() {
  const hp = document.querySelector("#hp"), depth = document.querySelector("#depth"), floor = document.querySelector("#floor-label"), shards = document.querySelector("#shards");
  if (hp) hp.textContent = state.player.hp + " / " + state.player.maxHp;
  if (depth) depth.textContent = String(state.floor).padStart(2, "0");
  if (floor) floor.textContent = "FLOOR " + String(state.floor).padStart(2, "0");
  if (shards) shards.textContent = String(state.shards);
  const potions = document.querySelector("#potions"), bombs = document.querySelector("#firebombs");
  if (potions) potions.textContent = String(state.inventory.potions);
  if (bombs) bombs.textContent = String(state.inventory.firebombs);
  const boss = state.enemies.find(enemy => enemy.kind === "warden");
  const bossPanel = document.querySelector("#boss-status");
  if (bossPanel) bossPanel.textContent = boss ? "ABYSSAL WARDEN · " + boss.hp + " / " + boss.maxHp : state.floor === 5 && state.status === "won" ? "WARDEN DEFEATED" : state.floor === 5 ? "STAIRWELL UNSEALED" : "BOSS: FLOOR 05";
  const log = document.querySelector("#log");
  if (log) log.innerHTML = logMessages.slice(-5).map(message => "<p>" + escapeHtml(message) + "</p>").join("");
  const status = document.querySelector("#save-status");
  if (status) status.textContent = state.status === "playing" ? "LOCAL RUN" : state.status === "dead" ? "RUN ENDED" : "TRIAL CLEARED";
  const potionButton = document.querySelector<HTMLButtonElement>("#potion-btn");
  const bombButton = document.querySelector<HTMLButtonElement>("#bomb-btn");
  if (potionButton) potionButton.disabled = state.status !== "playing" || state.inventory.potions <= 0 || state.player.hp === state.player.maxHp;
  if (bombButton) bombButton.disabled = state.status !== "playing" || state.inventory.firebombs <= 0 || !state.enemies.some(enemy => Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y) <= 5);
  const newButton = document.querySelector<HTMLButtonElement>("#new-btn");
  if (newButton) newButton.textContent = state.status === "playing" ? "Abandon / new run" : "Start new descent";
}
function escapeHtml(value: string) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, character => entities[character] ?? character);
}
function applyResult(result: { state: GameState; messages: string[] }) {
  state = result.state;
  logMessages.push(...result.messages);
  sceneRef?.drawBoard();
  void saveRun(state).catch(() => {});
}
function act(move: Move) {
  applyResult(takeTurn(state, move));
}
function actItem(action: ItemAction) {
  applyResult(useItem(state, action));
}
function startNew() {
  state = createRun();
  logMessages = ["A new descent begins.", "Collect supplies, use oil with firebombs, and survive the Warden on floor five."];
  sceneRef?.drawBoard();
  void saveRun(state).catch(() => {});
}
function migrateLegacySave(value: unknown): GameState | null {
  if (!value || typeof value !== "object") return null;
  const old = value as Partial<GameState> & { schemaVersion?: number; enemies?: Array<Partial<Enemy>> };
  if (old.schemaVersion === 2 && old.map && old.player && old.inventory && Array.isArray(old.enemies)) return old as GameState;
  if (old.schemaVersion !== 1 || !old.map || !old.player || !Array.isArray(old.enemies)) return null;
  const migrated: GameState = {
    ...(old as GameState),
    schemaVersion: 2,
    inventory: { potions: 2, firebombs: 2 },
    enemies: old.enemies.map((enemy, index) => ({
      id: enemy.id ?? index + 1, x: enemy.x ?? 2, y: enemy.y ?? 2,
      hp: enemy.hp ?? 2, maxHp: enemy.hp ?? 2, kind: "stalker" as const
    }))
  };
  if (migrated.floor === 5 && !migrated.enemies.some(enemy => enemy.kind === "warden")) {
    const spot = [{ x: 6, y: 6 }, { x: 7, y: 6 }, { x: 6, y: 7 }].find(p =>
      migrated.map[p.y]?.[p.x] !== "wall" &&
      !migrated.enemies.some(enemy => enemy.x === p.x && enemy.y === p.y) &&
      !(migrated.player.x === p.x && migrated.player.y === p.y)
    );
    if (spot) migrated.enemies.push({ id: 99, kind: "warden", ...spot, hp: 16, maxHp: 16 });
  }
  return migrated;
}
async function init() {
  new Phaser.Game({
    type: Phaser.CANVAS, parent: "game", width: 520, height: 520, backgroundColor: "#0a0c12",
    pixelArt: true, antialias: false, scene: [DungeonScene],
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { roundPixels: true }
  });
  document.querySelectorAll<HTMLButtonElement>("[data-move]").forEach(button => {
    button.addEventListener("click", () => act(button.dataset.move as Move));
  });
  document.querySelector("#new-btn")?.addEventListener("click", startNew);
  document.querySelector("#potion-btn")?.addEventListener("click", () => actItem("potion"));
  document.querySelector("#bomb-btn")?.addEventListener("click", () => actItem("firebomb"));
  document.querySelector("#save-btn")?.addEventListener("click", async () => {
    try { await saveRun(state); logMessages.push("Run saved on this device."); }
    catch { logMessages.push("Save failed. Check browser storage settings."); }
    updateHud();
  });
  try {
    const loaded = migrateLegacySave(await loadRun());
    if (loaded) {
      state = loaded;
      logMessages = ["Your saved descent resumes.", "Inventory and floor progress restored on this device."];
      sceneRef?.drawBoard();
      if (loaded.schemaVersion === 2) void saveRun(loaded).catch(() => {});
    }
  } catch { logMessages.push("Local save storage is unavailable; play can continue for this session."); }
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      void navigator.serviceWorker.register(new URL("./sw.js", document.baseURI)).catch(() => {});
    });
  }
}
void init();
