# Engine, PWA, and Content Source Audit

**Status:** repository/API inspection only; no local build or device test has been run.

## Decision

Keep `ballidan-blip/the-systemic-depths-` as the product and deployment target. Keep `ballidan-blip/Dungeons` as an isolated Unity research sandbox. Do not replace the Phaser application with the Unity fork.

Why:
- The product repository is already TypeScript + Phaser 3 + Vite and has test/typecheck/build scripts.
- The existing game has a small web-oriented structure and already includes an elemental combat design specification at `docs/ELEMENTAL_GAMEPLAY.md`.
- The Unity fork is a Unity 2022.3.39f1 project with C# assemblies, Unity scenes, assets, and Unity package dependencies. Reusing its gameplay code directly in Phaser would require a port, not a copy.
- Unity's current docs describe a Web/PWA template and mobile browser support, but actual load size, memory, controls, save persistence, and iPhone Safari performance still require a built device test. Browser support alone is not a performance guarantee.

## Repositories inspected

- Product target: https://github.com/ballidan-blip/the-systemic-depths-
- Unity fork sandbox: https://github.com/ballidan-blip/Dungeons
- Unity upstream: https://github.com/ICD-ICD/BEACON
- Phaser reference project: https://github.com/JohnVonDrashek/dungeon-crawler-now

## Unity fork findings

- The fork's parent is `ICD-ICD/BEACON`, described as a public Unity project for BEACON.
- Unity editor version: `2022.3.39f1`.
- Package manifest includes Cinemachine 2.10.5, URP 14.0.11, TextMeshPro, Timeline, UGUI, Visual Scripting, R3, and NuGetForUnity.
- The project includes at least two scene files: `Assets/Scenes/Game.unity` (~228 KB) and `Assets/Scenes/Game 1.unity` (~4.08 MB), plus game assets, animation folders for Player and Slimes, component scripts (including Door and Ending), and third-party plugin folders.
- The Unity README explicitly says there is a lot of asset “garbage” and that “SPECTRE” is a working title.
- Neither the fork nor upstream has GitHub-recognized license metadata, and the upstream repository has no `LICENSE` file at the expected path. **Do not assume the project's code or bundled assets are licensed for reuse.** Audit individual assets and obtain permission or replace them before shipping anything from this source.

## Product repository findings

- The repository is a TypeScript/Vite app with Phaser `^3.90.0`.
- Scripts include `npm run typecheck`, `npm test`, and `npm run build`.
- Existing source includes `src/main.ts`, `src/model.ts`, `src/model.test.ts`, and `src/save.ts`.
- The existing `docs/ELEMENTAL_GAMEPLAY.md` defines the intended five elements and deterministic reaction rules. Treat it as the gameplay acceptance contract; do not add decorative elemental effects that lack tactical consequences.
- No build or test has been run as part of this remote inspection, so current CI/build health and published mobile behaviour are not asserted here.

## Recommended story and map architecture

Keep content data-driven and separate from combat mechanics. Add content in small, testable slices rather than rewriting the engine.

Suggested structure (adapt to the actual source layout before creating files):

```text
src/
  content/
    world.ts
    chapters/
    characters/
    quests/
    dialogue/
    dungeons/
      story/
      biomes/
      room-pools/
      encounters/
      bosses/
  systems/
    elemental-rules.ts
    dungeon-generation.ts
    quest-state.ts
    map-validation.ts
```

The exact directories are proposals, not a claim that these files already exist.

### World and story

- Original setting, names, factions, dialogue, quests, and visual identity for The Systemic Depths.
- A Sanctuary hub with recurring NPCs, upgrades, lore discoveries, and persistent consequences between runs.
- Short authored story chapters and optional side quests; dialogue and quest progression stored as data.
- A journal codex for discovered lore, creatures, elemental interactions, and boss clues.
- Branches should be authored as explicit choices and flags, with a clear fallback if a run ends before a quest resolves.

### Maps

Use a hybrid rather than choosing only hand-authored or only procedural maps:
1. **Story dungeons:** authored layouts, guaranteed story beats, environmental puzzles, secrets, and boss arenas.
2. **Roguelike floors:** deterministic seeded generation using tested room pools, biome rules, and encounter budgets.
3. **Elemental variants:** water channels, oil patches, ice hazards, lightning-conductive wet zones, and earth chokepoints that affect pathing and combat.
4. **Map validator:** every generated floor must have a reachable entrance/exit, a route to required encounters, and no permanent player traps or blocked stairs.

### Mobile PWA requirements

- Touch-first controls and a visible five-element spell bar.
- Responsive layout with safe-area handling and readable combat/status text.
- Preserve local saves across reloads and offline launches; test upgrade/version migration.
- Keep the initial download small; lazy-load optional story art/audio where practical.
- Test install and play on iPhone Safari and Android Chrome; check portrait and landscape, background/resume, sound activation, storage, and performance.
- Confirm the GitHub Pages base path and service-worker cache strategy before publishing.

## Implementation order

1. Inspect the current Phaser source and tests before editing; confirm the current game loop and map model.
2. Implement and test a renderer-independent elemental rules module.
3. Add the spell bar and clear effects/log feedback for all five elements.
4. Add a first authored story dungeon that teaches fire/oil, water/fire, and water/lightning.
5. Add seeded biome room pools and map reachability validation.
6. Add Sanctuary, one NPC quest, journal entries, and boss telegraphs.
7. Run tests, typecheck, production build, then test the published PWA on real devices.

## Asset reuse policy

Use the Unity fork as a visual/design reference until licensing is resolved. Do not copy its scripts, scene assets, models, textures, audio, fonts, or animations into the product repository merely because the fork is public. Record the source and license for every shipped third-party asset. Prefer original or explicitly licensed assets for the first playable slice.

## Sources

- Unity Web browser compatibility: https://docs.unity.com/en-us/engine/6000.3/manual/platform-specific/webgl/intro/browsercompatibility
- Unity Web build optimization and PWA template: https://unity.com/how-to/profile-optimize-web-build
- Phaser reference repository (MIT license shown by GitHub): https://github.com/JohnVonDrashek/dungeon-crawler-now
