import { describe, expect, it } from "vitest";
import { createRun, takeTurn } from "./model";

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
  it("attacks an enemy occupying the target tile", () => {
    const state = createRun(7);
    state.enemies = [{ id: 1, x: 2, y: 1, hp: 2 }];
    const result = takeTurn(state, "right");
    expect(result.state.player).toMatchObject({ x: 1, y: 1 });
    expect(result.state.enemies).toHaveLength(0);
    expect(result.state.turn).toBe(1);
  });
  it("preserves health and shards when descending", () => {
    const state = createRun(7, 1, 3);
    state.enemies = [];
    state.player = { ...state.player, x: 10, y: 11, hp: 8 };
    const result = takeTurn(state, "right");
    expect(result.state.floor).toBe(2);
    expect(result.state.player.hp).toBe(8);
    expect(result.state.shards).toBe(3);
    expect(result.state.turn).toBe(1);
  });
  it("ends the five-floor trial at the final stairwell", () => {
    const state = createRun(7, 5, 4);
    state.enemies = [];
    state.player = { ...state.player, x: 10, y: 11 };
    expect(takeTurn(state, "right").state.status).toBe("won");
  });
  it("does not allow a turn after death", () => {
    const state = createRun(7);
    state.status = "dead";
    const result = takeTurn(state, "right");
    expect(result.state.turn).toBe(0);
    expect(result.messages[0]).toContain("ended");
  });
});
