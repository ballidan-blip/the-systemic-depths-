# The Systemic Depths

A standalone, mobile-first systemic roguelike prototype built with Phaser 3, TypeScript, and Vite. This is not yet the complete 25-floor game.

## Local development

Requirements: Node.js 20+ and npm.

- Install dependencies: `npm install`
- Run tests: `npm run test`
- Type-check: `npm run typecheck`
- Build production assets: `npm run build`
- Preview the build: `npm run preview`

The production output is written to `dist/`. Deploy that directory to a static host with HTTPS. Relative asset paths support root hosting and project subpaths. The build generates a service worker precache manifest so the HTML, JavaScript, styles, icon, and web manifest are cached at install time.

## Prototype features

- Phaser dungeon board with desktop keyboard and mobile touch controls.
- Turn-based movement and combat, basic enemy responses, resonance shards, and stairwell progression.
- Seeded floor generation.
- Local IndexedDB save/load and best-effort autosave.
- PWA manifest and generated offline precache service worker.
- Vitest unit tests and GitHub Actions CI.

## CI and deployment safety

GitHub Actions runs tests, type-checking, and a production build for pushes to `main` and feature branches and for pull requests to `main`. The workflow does not deploy the game. No live payment code, purchase UI, accounts, backend, or online services are included.

## Known limitations before public launch

- This is a vertical-slice prototype, not a finished campaign.
- The five-floor endpoint is prototype behavior, not a purchase/entitlement gate.
- Browser storage can be evicted; save migration/export and recovery need more work.
- Accessibility review, audio, device QA, balance testing, and security review remain future work.
- The icon is a development placeholder.

Do not describe this build as release-certified until CI passes and the production preview is tested on target devices.
