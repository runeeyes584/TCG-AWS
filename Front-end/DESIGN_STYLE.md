# Kaleidoscope TCG Style Direction

## Taste Skill Setup

Installed through npm with:

```bash
npx skills add Leonxlnx/taste-skill
```

The install added Taste Skill entries under `.agents/skills` and generated `skills-lock.json`.
Restart Codex to pick up the new skills automatically in future sessions.

## Selected Direction

Reading this as: a tactical fantasy card-game board for players who need quick scanning, with a premium arcane tabletop language, leaning toward custom CSS plus the existing React/Next component structure.

Chosen style: **Arcane Tactical Board**.

Design dials:

- `DESIGN_VARIANCE: 6` - enough asymmetry and atmosphere for a fantasy game, but not an experimental marketing page.
- `MOTION_INTENSITY: 4` - tactile UI feedback and state transitions, no cinematic motion that slows gameplay.
- `VISUAL_DENSITY: 7` - board-game surfaces are naturally dense, but popups should keep the table clear.

## Palette

- Primary surface: obsidian black and deep green felt.
- Primary accent: aged gold for hierarchy, borders, important active states.
- Secondary accent: spectral teal for multiplayer, selection, and informational UI.
- Combat colors: red and blue reserved for attack/block/damage semantics.

Avoid:

- Generic purple-blue AI gradients.
- Beige/brass luxury palette.
- Minimalist white SaaS styling.
- Industrial brutalist blocks.

## Typography

- Display: `Cinzel` for fantasy identity and card-game ceremony.
- UI/body: `Plus Jakarta Sans` for readable modern controls.

Do not reintroduce `Inter` as the default UI font unless the project pivots to a neutral SaaS/admin feel.

## Component Feel

- Keep board space dominant; panels should float or collapse into popups.
- Use small-radius, machined UI (`6px` to `8px`) rather than large pill/card-heavy layouts.
- Use double-surface treatment where useful: subtle outer border, inner highlight, tinted shadow.
- Buttons should feel physical: short travel on active press, gold hover, no loud glow.

## UI Rules

- Action Log, Card Detail, and Dev Tools should not reserve permanent board columns.
- Card Detail appears on click and should stay in a corner, not push the board.
- Logs and dev controls belong behind fixed utility buttons.
- Preserve existing `lucide-react` icons for now because the project already uses them consistently.
