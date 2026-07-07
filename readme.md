# Kaleidoscope TCG

Local TypeScript card game prototype inspired by Legends of Runeterra.

## Project Layout

- `Back-end/src/server`: Socket.IO server and Next request handler.
- `Back-end/src/game`: shared TypeScript game engine, rules, card data, and tests.
- `Back-end/src/shared`: multiplayer event contracts used by both sides.
- `Front-end/src`: Next app, React client, hooks, UI components, styles, and assets.

## Worklog - 2026-07-01

### Engine
- Continued the reducer-based pure TypeScript game engine.
- Kept combat, spell casting, keywords, modifiers, graveyard, action log, and deterministic local state.
- Added deck validation and lightweight pending-choice support for future ability flows.
- Improved event payload handling and trigger context so abilities can react to richer game events.
- Normalized card type handling to lowercase `unit`, `spell`, and `champion`.

### Cards and Data
- Moved card definitions toward JSON-driven data in `Back-end/src/game/data/cards.json`.
- Kept card instances ID-only with registry lookups for card definitions.
- Added validation in the card registry to reject invalid card data.
- Added spell speed and hand-card targeting support for future spell interactions.

### Abilities and Effects
- Migrated legacy trigger behavior toward the generic Ability System.
- Added reusable condition, target, cost, and effect execution paths.
- Routed damage, draw, discard, heal, summon, and buff effects through shared operations.
- Preserved backward compatibility with existing cards while enabling data-driven migration.

### UI
- Updated the local 1v1 battle board layout.
- Added board zones for waiting and active rows.
- Added graveyard viewing hooks.
- Added attacker/defender visual markers: sword for the attacking side and shield for the defending side.

### Verification
- `npx tsc --noEmit`
- `npm test -- --run`
- `npm run build`
