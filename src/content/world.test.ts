import { describe, expect, it } from "vitest";
import {
  FIRST_STORY_DUNGEON,
  PROLOGUE,
  validateStoryDungeon,
  type StoryDungeon
} from "./world";

describe("story content", () => {
  it("provides original prologue beats with unique ids and objectives", () => {
    expect(PROLOGUE.length).toBeGreaterThanOrEqual(3);
    expect(new Set(PROLOGUE.map(beat => beat.id)).size).toBe(PROLOGUE.length);
    expect(PROLOGUE.every(beat => beat.text.length > 40 && beat.objective.length > 10)).toBe(true);
  });

  it("ships a valid tutorial dungeon with a reachable exit", () => {
    expect(validateStoryDungeon(FIRST_STORY_DUNGEON)).toEqual([]);
  });

  it("detects an exit that is walled off", () => {
    const blocked: StoryDungeon = {
      ...FIRST_STORY_DUNGEON,
      layout: [
        "#######",
        "#S#..X#",
        "#.#####",
        "#######"
      ],
      entrance: { x: 1, y: 1 },
      exit: { x: 5, y: 1 },
      legend: { "#": "wall", ".": "floor", S: "entrance", X: "exit" }
    };
    expect(validateStoryDungeon(blocked).map(issue => issue.code)).toContain("unreachable-exit");
  });

  it("detects unknown tile symbols rather than silently treating them as floor", () => {
    const invalid: StoryDungeon = {
      ...FIRST_STORY_DUNGEON,
      layout: ["#####", "#S?X#", "#####"],
      entrance: { x: 1, y: 1 },
      exit: { x: 3, y: 1 },
      legend: { "#": "wall", ".": "floor", S: "entrance", X: "exit" }
    };
    expect(validateStoryDungeon(invalid).map(issue => issue.code)).toContain("unknown-tile");
  });

  it("detects mismatched entrance and exit coordinates", () => {
    const mismatched: StoryDungeon = {
      ...FIRST_STORY_DUNGEON,
      entrance: { x: 2, y: 1 },
      exit: { x: 8, y: 1 }
    };
    expect(validateStoryDungeon(mismatched).map(issue => issue.code)).toEqual(
      expect.arrayContaining(["entrance-mismatch", "exit-mismatch"])
    );
  });
});
