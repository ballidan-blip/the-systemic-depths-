import { describe, expect, it } from "vitest";
import { createRun, takeTurn, useItem } from "./model";

describe("deterministic dungeon simulation", () => {
  it("generates the same map and enemies for the same seed and floor", () => {
    expect(createRun(12345, 2)).toEqual(createRun(12345, 2));
  });
  it("produces different seeded maps in general", () => {
    expect(createRun(12345).map).not.toEqual(createRun(54321).map);
  });
  it("does not move through boundary walls or consume a blocked turn", () => {
    const result = takeTurn(createRun(7), "left");
    expect(result.state.player).toMatchObject({ x: 1, y: 1 });
    expect(result.state.turn).toBe(0);
  });
  it("consumes a turn when waiting", () => {
    expect(takeTurn(createRun(7), "wait").state.turn).toBe(1);
  });
  it("attacks an enemy occupying the target tile and awards a shard on kill", () => {
    const state = createRun(7);
    state.enemies = [{ id: 1, kind: "stalker", x: 2, y: 1, hp: 2, maxHp: 2 }];
    const result = takeTurn(state, "right");
    expect(result.state.player).toMatchObject({ x: 1, y: 1 });
    expect(result.state.enemies).toHaveLength(0);
    expect(result.state.shards).toBe(1);
    expect(result.state.turn).toBe(1);
  });
  it("preserves health, inventory and shards when descending", () => {
    const state = createRun(7, 1, 3);
    state.enemies = [];
    state.player = { ...state.player, x: 10, y: 11, hp: 8 };
    state.inventory = { potions: 4, firebombs: 1 };
    const result = takeTurn(state, "right");
    expect(result.state.floor).toBe(2);
    expect(result.state.player.hp).toBe(8);
    expect(result.state.shards).toBe(3);
    expect(result.state.inventory).toEqual({ potions: 4, firebombs: 1 });
    expect(result.state.turn).toBe(1);
  });
  it("spawns the Abyssal Warden on floor five", () => {
    const state = createRun(7, 5);
    expect(state.enemies.some(enemy => enemy.kind === "warden" && enemy.hp === 16)).toBe(true);
  });
  it("keeps the floor-five exit sealed while the Warden lives", () => {
    const state = createRun(7, 5);
    state.enemies = [{ id: 99, kind: "warden", x: 6, y: 6, hp: 16, maxHp: 16 }];
    state.player = { ...state.player, x: 10, y: 11 };
    const result = takeTurn(state, "right");
    expect(result.state.status).toBe("playing");
    expect(result.state.player).toMatchObject({ x: 10, y: 11 });
    expect(result.messages.join(" ")).toContain("seals the trial gate");
  });
  it("wins the five-floor trial after the Warden is defeated", () => {
    const state = createRun(7, 5, 4);
    state.enemies = [];
    state.player = { ...state.player, x: 10, y: 11 };
    expect(takeTurn(state, "right").state.status).toBe("won");
  });
  it("heals up to five vitality and consumes a potion turn", () => {
    const state = createRun(7);
    state.player.hp = 4;
    const result = useItem(state, "potion");
    expect(result.state.player.hp).toBe(9);
    expect(result.state.inventory.potions).toBe(1);
    expect(result.state.turn).toBe(1);
  });
  it("does not waste a potion at full health", () => {
    const state = createRun(7);
    const result = useItem(state, "potion");
    expect(result.state.inventory.potions).toBe(2);
    expect(result.state.turn).toBe(0);
  });
  it("firebomb ignites oil and damages nearby enemies", () => {
    const state = createRun(7);
    state.player = { ...state.player, x: 2, y: 2 };
    state.enemies = [{ id: 1, kind: "stalker", x: 4, y: 2, hp: 8, maxHp: 8 }];
    state.map[2]![4] = "oil";
    const result = useItem(state, "firebomb");
    expect(result.state.map[2]![4]).toBe("fire");
    expect(result.state.enemies[0]?.hp).toBeLessThan(8);
    expect(result.state.inventory.firebombs).toBe(1);
    expect(result.messages.join(" ")).toContain("ignites the oil");
  });
  it("does not allow a turn after death", () => {
    const state = createRun(7);
    state.status = "dead";
    const result = takeTurn(state, "right");
    expect(result.state.turn).toBe(0);
    expect(result.messages[0]).toContain("ended");
  });
});
