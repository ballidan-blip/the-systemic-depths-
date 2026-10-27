# The Systemic Depths

A standalone, mobile-first systemic roguelike prototype built with Phaser 3, TypeScript, and Vite. The current vertical slice is a five-floor solo trial with a final boss; it is not yet the full 25-floor game.

## Local development

Requirements: Node.js 20+ and npm.

- Install dependencies: `npm install`
- Run tests: `npm run test`
- Type-check: `npm run typecheck`
- Build production assets: `npm run build`
- Preview the build: `npm run preview`

The production output is written to `dist/`. Relative asset paths support root hosting and project subpaths. The build generates a service-worker precache manifest for offline app assets.

## Current vertical-slice features

- Phaser dungeon board with desktop keyboard and mobile touch controls.
- Seeded five-floor generation and persistent health/inventory between floors.
- Turn-based combat with stalkers, hard-hitting brutes, and the 16-HP Abyssal Warden boss on floor five.
- Healing potions that restore up to five vitality and consume an enemy turn.
- Firebombs that hit a small area; oil caught in the blast ignites and burns enemies standing in the flames.
- Resonance shards from pickups and defeated enemies; the Warden awards five shards.
- The floor-five exit remains sealed until the Warden is defeated.
- IndexedDB local save/load and best-effort autosave, with migration from schema-version-1 saves.
- PWA manifest and generated offline precache service worker.
- Vitest tests for deterministic generation, combat, consumables, oil ignition, floor transitions, boss gate, victory, and death.

## CI and deployment

GitHub Actions runs unit tests, TypeScript checking, and a production build. A separate GitHub Pages workflow builds the app and publishes the `dist/` directory on pushes to `main` and manual workflow dispatch. The game has no payment UI/backend, purchase flows, accounts, or online services.

## Known limitations before release

- This is a vertical slice, not the complete campaign or a release-certified game.
- The trial currently uses simple procedural rooms, abstract placeholder graphics, and limited enemy AI.
- Boss balance, accessibility, audio, device QA, and broader playtesting remain future work.
- Browser storage can be evicted; save export/recovery still needs work.
- The app icon is a development placeholder.
- Co-op, Daily Descent, ghosts, hero classes, talent trees, the Resonance Grid, full Codex, modding, and seasonal content are not implemented yet.

Do not describe this build as release-certified until CI passes and the published site is tested on target devices.
