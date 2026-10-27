import Phaser from "phaser";
import { createRun, takeTurn, type GameState, type Move } from "./model";
import { loadRun, saveRun } from "./save";
import "./style.css";

const COLORS = { wall: 0x252b3b, floor: 0x151a27, exit: 0xc7a664, shard: 0x73b6b4, player: 0xe9dfc5, enemy: 0xb96f70, grid: 0x34394a };
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
      const color = tile === "wall" ? COLORS.wall : tile === "exit" ? COLORS.exit : tile === "shard" ? COLORS.shard : COLORS.floor;
      this.graphics.fillStyle(color, 1);
      this.graphics.fillRoundedRect(ox + x * size + 1, oy + y * size + 1, size - 2, size - 2, Math.max(1, 2 * scale));
      this.graphics.lineStyle(1, COLORS.grid, 0.5);
      this.graphics.strokeRect(ox + x * size + 1, oy + y * size + 1, size - 2, size - 2);
      if (tile === "exit") {
        this.graphics.fillStyle(0xf0d99b, 1);
        this.graphics.fillCircle(ox + (x + .5) * size, oy + (y + .5) * size, size * .24);
      } else if (tile === "shard") {
        const cx = ox + (x + .5) * size, cy = oy + (y + .5) * size;
        this.graphics.fillStyle(0xb2ffff, 1);
        this.graphics.fillPoints([{ x: cx, y: cy - size * .3 }, { x: cx + size * .19, y: cy }, { x: cx, y: cy + size * .3 }, { x: cx - size * .19, y: cy }], true);
      }
    }
    for (const enemy of state.enemies) {
      const cx = ox + (enemy.x + .5) * size, cy = oy + (enemy.y + .5) * size;
      this.graphics.fillStyle(COLORS.enemy, 1);
      this.graphics.fillCircle(cx, cy, size * .29);
      this.graphics.fillStyle(0x2a1118, 1);
      this.graphics.fillCircle(cx - size * .09, cy - size * .04, size * .04);
      this.graphics.fillCircle(cx + size * .09, cy - size * .04, size * .04);
    }
    const px = ox + (state.player.x + .5) * size, py = oy + (state.player.y + .5) * size;
    this.graphics.fillStyle(COLORS.player, 1);
    this.graphics.fillRoundedRect(px - size * .25, py - size * .31, size * .5, size * .62, size * .1);
    this.graphics.fillStyle(0xb69a62, 1);
    this.graphics.fillCircle(px, py - size * .35, size * .18);
    updateHud();
  }
}

function updateHud() {
  const hp = document.querySelector("#hp"), depth = document.querySelector("#depth"), floor = document.querySelector("#floor-label"), shards = document.querySelector("#shards");
  if (hp) hp.textContent = state.player.hp + " / " + state.player.maxHp;
  if (depth) depth.textContent = String(state.floor).padStart(2, "0");
  if (floor) floor.textContent = "FLOOR " + String(state.floor).padStart(2, "0");
  if (shards) shards.textContent = String(state.shards);
  const log = document.querySelector("#log");
  if (log) log.innerHTML = logMessages.slice(-5).map(message => "<p>" + escapeHtml(message) + "</p>").join("");
  const status = document.querySelector("#save-status");
  if (status) status.textContent = state.status === "playing" ? "LOCAL RUN" : state.status === "dead" ? "RUN ENDED" : "TRIAL CLEARED";
}
function escapeHtml(value: string) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, character => entities[character] ?? character);
}
function act(move: Move) {
  const result = takeTurn(state, move);
  state = result.state;
  logMessages.push(...result.messages);
  sceneRef?.drawBoard();
  void saveRun(state).catch(() => {});
}
function startNew() {
  state = createRun();
  logMessages = ["A new descent begins.", "Find the amber stairwell."];
  sceneRef?.drawBoard();
  void saveRun(state).catch(() => {});
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
  document.querySelector("#save-btn")?.addEventListener("click", async () => {
    try { await saveRun(state); logMessages.push("Run saved on this device."); }
    catch { logMessages.push("Save failed. Check browser storage settings."); }
    updateHud();
  });
  try {
    const loaded = await loadRun();
    if (loaded && loaded.schemaVersion === 1 && loaded.map?.length === loaded.height && loaded.player) {
      state = loaded;
      logMessages = ["Your saved descent resumes.", "Progress is stored on this device."];
      sceneRef?.drawBoard();
    }
  } catch { logMessages.push("Local save storage is unavailable; play can continue for this session."); }
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      void navigator.serviceWorker.register(new URL("./sw.js", document.baseURI)).catch(() => {});
    });
  }
}
void init();
