# Catcher / Ловец — Implementation Report

Implement state of the art bonus mini-game "Catcher / Ловец" for specific unlocked reward cards:
- **2 Капибара — Капи** (`streak-reward-2`) - Water/Lotus/Thorny ball theme (Summer riverbank style)
- **17 Носорог — Титан** (`streak-reward-17`) - Crystal/Titan rock theme (Purple cave style)
- **14 Буйволёнок — Гром** (`streak-reward-14`) - Thunder/Lightning/Charged rock theme (Stormy plains style)

## Completed Tasks

1. **Asset Processing**:
   - Stripped the chroma-key (magenta for Capybara, green for Rhino and Buffalo) using a custom Python script: `scripts/remove-chromakey-catcher.py`.
   - Output files are generated in `public/images/bonus-games/catcher/`:
     - `02_capybara_kapi.png`
     - `14_buffalo_grom.png`
     - `17_rhino_titan.png`

2. **Catcher Game Component** (`app/components/CatcherGame.tsx`):
   - Created a fullscreen overlay HTML5 Canvas-based gameplay experience.
   - Character sprite-sheet rendering with walk frames (0 and 1) and catching feedback frame (2).
   - Smooth horizontal movement using pointer hover/drag, touch drag, and arrow keys.
   - Lane-based spawning (Left, Center, Right) of objects (Star, Useful theme-based item, Danger theme-based item).
   - 3 Hearts system. Catching a danger item removes a heart and triggers a flashing 1.2s invulnerability period.
   - Target condition: catch 15 useful items/stars in under 60 seconds.
   - Floating themed particles (e.g. blossom leaves, purple sparks, lightning flares) with density capped at 15 and vertical opacity fading below 180px down to groundY level.
   - CSS rotation strategy for mobile portrait screens (same transform rules used in the Runner game).

3. **Dashboard Integration** (`app/page.tsx`):
   - Configured the CatcherGame launch portal inside `app/page.tsx`.
   - Mapped the Catcher game to cards: `streak-reward-2`, `streak-reward-14`, `streak-reward-17`.
   - Connected game completion tracking to POST `/api/bonus-games` API to persist the result per child profile.

## Verification & Build Results

- Verification shows Next.js build compilation passes with zero errors (`npm run build`).
- Persistence layers remain decoupled for child profiles (Ali and Said).

## Risks & Performance
- Sprite-sheet texture size: The assets are fully loaded and preloaded before game start, preventing flash of empty dinosaur fallback shapes.
- Browser rotation: Uses CSS transform scale and rotation of 90 degrees when viewport height > width to emulate landscape orientation without relying on device-level accelerometer lock.
