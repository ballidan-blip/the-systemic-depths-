# Elemental Combat Direction — The Systemic Depths

## Product identity

The game is an elemental dungeon roguelike. Elements are the primary combat verbs and environmental rules, not a decorative spell list. The player should win by reading rooms, choosing an element, positioning enemies, and creating reactions.

This is an original game inspired by the broad elemental-dungeon roguelike genre. Do not copy another game's names, art, maps, UI, lore, or proprietary content.

## Playable vertical-slice target

The next playable milestone keeps the five-floor solo trial and makes elemental combat its central loop. No payments, accounts, or online services are part of this milestone.

### Core elements

- **Fire — pressure and area denial.** Direct damage; oil ignites and creates persistent fire tiles. Fire damages enemies that remain on burning tiles. Fire is dangerous to the player too.
- **Water — control and setup.** Creates wet tiles, extinguishes fire, and marks enemies as wet for a short duration. Wet terrain changes how other elements resolve.
- **Ice — control and terrain.** Damages and freezes/slows a target. Frozen enemies lose movement for a short duration; ice terrain creates a risky route that can also impede pursuers.
- **Lightning — chaining burst.** Strikes a target and can chain to nearby enemies. Wet enemies take bonus damage and make the chain more reliable.
- **Earth — space control.** Raises a temporary obstacle or damages/roots enemies in a line. It can create cover and redirect enemy paths, but must never permanently trap the player.

### Elemental reaction rules

1. Fire + oil = ignition and persistent burning.
2. Water + fire = extinguish the affected fire tiles.
3. Water + lightning = wet targets take bonus damage; lightning can chain across nearby wet enemies.
4. Ice + water = freeze the targeted wet enemy for a longer duration.
5. Earth + chokepoint = temporary cover that changes pathing and buys a tactical turn.
6. Every reaction is deterministic, visible in the log, and governed by the same rules for player and enemies wherever practical.

### Turn economy and fairness

- Casting an element consumes a turn; enemies respond after the spell resolves.
- Invalid casts and out-of-range casts do not consume a turn or resource.
- Telegraph dangerous boss attacks before they land.
- Status durations are counted in turns and shown clearly.
- Elemental effects must not create unwinnable maps, soft-lock stairs, or block the player in.
- Keep random generation seed-driven so a run can be reproduced.

### Boss identity

The Abyssal Warden should be an elemental exam, not simply a larger health bar. It should telegraph a fire/ash attack, punish standing still, and reward use of terrain and elemental reactions. The five-floor trial must remain beatable without requiring one specific random drop.

### Build order

1. Add a tested, renderer-independent elemental rules module.
2. Add player spell selection and a clear mobile spell bar.
3. Render water, ice, lightning, and earth effects distinctly in Phaser.
4. Add enemy status effects and telegraphed Warden phases.
5. Add deterministic unit tests for every reaction and for blocked-path / escape invariants.
6. Run tests, type-check and production build before publishing.

## Acceptance criteria for this milestone

- The player can cast all five elements from keyboard and touch controls.
- At least four elemental reactions have visible, testable consequences.
- Each spell has a clear range, cost/cooldown, effect and log message.
- Status effects expire correctly and do not skip player turns.
- The boss can be defeated through multiple elemental approaches.
- Tests, type-check and build pass; then test the published version on a real mobile browser.
