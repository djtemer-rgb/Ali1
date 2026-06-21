# AliToDo / «Путь героя» — Bonus Mini-Games Roadmap & Implementation Spec

> Цель: добавить короткие бонусные мини-игры к открытым карточкам наград в проекте «Путь героя» / AliToDo.  
> Игра — это не отдельная награда и не источник дополнительных звёзд. Игра сама является коротким эмоциональным бонусом после серии выполненных задач.

---

## 0. Critical Product Rules

1. **Do not break existing AliToDo reward logic.**
   - Existing child tasks, streaks, stars, reward cards, animations, and unlock logic must remain stable.
   - Implement bonus games as an additive layer.

2. **One unlocked reward card = one bonus game instance.**
   - If the child completes the bonus game for that card, the card’s game button becomes inactive for that child.
   - If the child exits or fails, the button remains active.

3. **Completion state must be per child.**
   - Али and Саид must have separate game completion state.
   - If Али completed Panda Runner, Саид must still be able to play Panda Runner if his card is unlocked and not completed.
   - Prefer existing cloud-backed storage / Supabase if the project already uses it. Do not rely only on localStorage unless no backend exists.

4. **No persistent score, no extra stars, no badges.**
   - In-game stars may appear as temporary fun collectibles.
   - They must not be saved, compared, or added to the child’s reward balance.
   - No 1/2/3-star rating after the game.

5. **Games are reward rituals, not exams.**
   - Regular games should last about **30–40 seconds**, up to ~60 seconds if needed.
   - They should be easy enough that a 6-year-old and a 9-year-old can usually complete them.
   - Use hearts/lives to avoid frustration.

---

## 1. Character Distribution

### Game 1 — Runner
- `1` Панда — Бамбу
- `5` Хаски — Фрост
- `7` Лисёнок — Фокси
- `15` Хамелеончик — Спектр

### Game 2 — Catcher / «Ловец»
- `2` Капибара — Капи
- `17` Носорог — Титан
- `14` Буйволёнок — Гром

### Game 3 — Tap Reaction / «Тап-реакция»
- `8` Крокодильчик — Крокси
- `4` Пингвинёнок — Пикс
- `19` Акулёнок — Риф
- `10` Коала — Эвка

### Game 4 — Flight / «Сквозь порталы»
- `6` Ледяной дракончик — Кристалл
- `11` Огненный дракончик — Искрик
- `16` Лесной дракончик — Вердан
- `13` Орлёнок — Скай

### Game 5 — Jumper / «Вверх к звезде»
- `9` Волчонок — Норд
- `12` Тигрёнок — Рыкс
- `3` Енотик — Плюш
- `18` Леопардик — Блиц

### Game 6 — Special Final Game
- `20` Звёздный дракончик — Астра
- Main 90-day reward.
- Stronger game with 3 levels: Ice → Fire → Cosmos.

---

## 2. File / Asset Folder Structure

Use this exact structure unless the existing project has a stronger convention:

```txt
public/
  Images/
    bonus-games/
      runner/
        01_panda_bambu.png
        05_husky_frost.png
        07_fox_foxy.png
        15_chameleon_spectrum.png
      catcher/
        02_capybara_kapi.png
        17_rhino_titan.png
        14_buffalo_grom.png
      tap-reaction/
        08_crocodile_croxy.png
        04_penguin_pix.png
        19_shark_reef.png
        10_koala_evka.png
      flight-portals/
        06_ice_dragon_crystal.png
        11_fire_dragon_iskrik.png
        16_forest_dragon_verdan.png
        13_eaglet_sky.png
      jump-to-star/
        09_wolf_nord.png
        12_tiger_ryks.png
        03_raccoon_plush.png
        18_leopard_blitz.png
      star-dragon/
        20_star_dragon_astra.png
```

### Asset assumptions

Each PNG is a chroma-key sprite sheet, normally 1:1.
The implementation should:
- remove / ignore the chroma-key background visually using CSS masking/canvas processing only if necessary;
- prefer transparent PNGs if Antigravity or the asset pipeline can convert them;
- support chroma-key colors:
  - bright green for assets without green details;
  - bright pink/magenta for assets with green details.

Recommended sprite sheet layout:
- Top row: 3 character animation frames.
- Bottom row: 2–3 thematic objects, depending on game.
- If slicing is unreliable, create a small metadata map per asset with approximate crop rectangles.

Do not block implementation on perfect slicing. If needed, use placeholder SVG shapes for stars, hearts, portals, and simple hazards until final assets are ready.

---

## 3. Reward Card Flow

### Current intended flow

1. Child completes all required tasks for the streak day.
2. Existing reward unlock animation plays.
3. App navigates to the rewards section.
4. Reward card becomes visible/unlocked.
5. Child opens the reward card.
6. Inside the card modal, show button:

```txt
Бонусная игра
```

### Button state

- If card is unlocked and bonus game not completed for this child:
  - button enabled.
- If card is locked:
  - button hidden or disabled according to existing locked-card design.
- If bonus game completed for this child:
  - button disabled.
  - Suggested label: `Игра пройдена`.

### On click

Open a fullscreen game overlay/modal.

---

## 4. Fullscreen Game Shell

Create a reusable shell component, for example:

```txt
BonusGameShell
```

Responsibilities:
- fullscreen overlay;
- orientation handling;
- Start screen;
- X exit;
- Pause button;
- hearts/lives display;
- temporary star counter;
- success screen;
- fail screen;
- callbacks:
  - `onExitWithoutCompletion()`
  - `onCompleted()`
  - `onRestart()`

### Orientation

Most games are landscape:
- Runner
- Catcher
- Tap Reaction
- Flight
- Star Dragon final game may use landscape.

Portrait:
- Jump to Star / «Вверх к звезде».

Mobile landscape prompt:
```txt
Поверни телефон
```

Make it simple and visual. The prompt may blink 2 times. Do not overcomplicate device-orientation detection. If detection is hard, allow the child to continue after pressing Start.

Desktop:
- Open directly in game area. No rotate prompt needed.

### Controls wording

Use simple Russian:
- `Нажимай на экран, чтобы прыгать`
- `Нажми два раза, чтобы сделать двойной прыжок`
- `Води по экрану влево и вправо`
- `Нажимай на светящиеся предметы`
- `Нажимай, чтобы взлетать выше`

Do not use:
- tap
- swipe
- combo-heavy English UI
- “score”, “rating”, “leaderboard”

### Exit

Always show X in upper corner.
If child exits:
- do not mark game completed;
- return to reward card;
- keep `Бонусная игра` button active.

### Pause

Add pause button near the X or opposite corner.
Paused state:
- freeze gameplay;
- show large centered play button;
- on play, resume after a tiny countdown or instantly.

---

## 5. Lives / Failure / Success

### Default lives

Use **3 hearts** for regular games.

When hit:
1. remove 1 heart;
2. character flashes or bounces briefly;
3. short invulnerability window, about 1 second;
4. continue the game.

If all hearts are lost:
- stop gameplay;
- show:

```txt
Пока не получилось
```

- button:

```txt
Начать заново
```

No automatic restart.

### Continue vs restart after losing one heart

Preferred:
- after losing a heart, continue from current position/checkpoint if technically simple.
- if this complicates the implementation too much, simply keep the game running with temporary invulnerability.

Full restart only after all hearts are lost and the child presses `Начать заново`.

### Success

On success:
- stop gameplay;
- show:

```txt
Игра пройдена!
Поздравляю!
```

Button:
```txt
Окей
```

On click:
- mark this bonus game completed for this child/card;
- exit fullscreen;
- return to reward card;
- disable the card’s bonus game button.

---

## 6. Temporary Stars / Sound

Temporary stars:
- appear inside games for fun;
- recommended count: about 5 per regular game;
- can be collected or missed;
- not required for success unless a specific game says otherwise;
- not saved;
- not added to main reward stars.

Sounds:
- use small, standard/simple sounds if available;
- jump sound;
- collectible sound;
- magical star sound;
- hit sound;
- success sound;
- fail sound.

Add a simple internal mute fallback if the app already has sound settings. If sounds become annoying or technically problematic, keep visual effects and disable sounds.

---

# 7. Game Specs

## 7.1 Runner

Characters:
- 1 Панда — Бамбу
- 5 Хаски — Фрост
- 7 Лисёнок — Фокси
- 15 Хамелеончик — Спектр

Mode:
- Landscape.
- Character auto-runs from left to right.
- Player presses screen/clicks to jump.
- A second press in the air triggers one double jump.
- Double jump resets only after landing.

Goal:
- survive/reach finish in about 30–40 seconds.
- Alternative: pass about 12–15 obstacles if timing is easier to implement.
- Place first obstacle after a short delay so the child understands game started.

Lives:
- 3 hearts.
- Collision removes heart, flashes/bounces character, continues with invulnerability.

Objects:
- thematic obstacles per character;
- about 5 temporary stars placed along the route.

Suggested themes:
- Panda: bamboo + grey stone.
- Husky: ice crystal + snowball.
- Fox: stump + red mushroom.
- Chameleon: red crystal + closed jungle flytrap.

Instruction:
```txt
Нажимай на экран, чтобы прыгать.
Нажми ещё раз в воздухе — будет двойной прыжок.
```

---

## 7.2 Catcher / «Ловец»

Characters:
- 2 Капибара — Капи
- 17 Носорог — Титан
- 14 Буйволёнок — Гром

Mode:
- Landscape.
- Character stands/moves at bottom.
- Player moves character left/right by dragging finger/mouse or pressing left/right zones.

Goal:
- catch about 15 useful falling objects within 30–40 seconds.
- Include about 5 special star items.
- Missing useful items is not punished.
- Catching dangerous items removes a heart.

Lives:
- 3 hearts.

Object ratio:
- mostly normal useful items;
- about 5 temporary stars;
- a few hazards.

Instruction:
```txt
Води героя влево и вправо.
Лови полезные предметы и звёзды.
Опасные предметы лучше пропускать.
```

Suggested themes:
- Capybara: water drops / lotus leaves / muddy stones.
- Rhino: purple crystals / titan stones / spiky rocks.
- Buffalo: thunder sparks / storm gems / dark stones.

---

## 7.3 Tap Reaction

Characters:
- 8 Крокодильчик — Крокси
- 4 Пингвинёнок — Пикс
- 19 Акулёнок — Риф
- 10 Коала — Эвка

Mode:
- Landscape.
- Items appear in random safe screen zones.
- Player presses useful items before they disappear.
- Items stay around 1.5 seconds.
- Include dangerous items that remove a heart if pressed.

Goal:
- collect/tap about 15–20 useful items in 30–40 seconds.
- Include about 5 temporary stars.
- Add simple streak/combo feedback, but do not distract the child.

Combo:
- after 5 correct taps in a row, show short celebratory text/effect.
- add a tiny delay/freeze or spawn gap so the child is not punished while reading.

Lives:
- 3 hearts.
- Pressing dangerous item removes heart.
- Missing an item may be allowed without punishment, unless it makes the game too trivial.

Instruction:
```txt
Нажимай на светящиеся предметы.
Звёзды дают волшебный звук.
Опасные предметы не трогай.
```

Suggested themes:
- Crocodile: bubbles / pearls / sharp shells.
- Penguin: snowflakes / ice cubes / cracked ice.
- Shark: sea stars / pearls / sea mines.
- Koala: eucalyptus leaves / honey drops / thorny branches.

---

## 7.4 Flight — «Сквозь порталы»

Characters:
- 6 Ледяной дракончик — Кристалл
- 11 Огненный дракончик — Искрик
- 16 Лесной дракончик — Вердан
- 13 Орлёнок — Скай

Mode:
- Landscape.
- Soft Flappy-like motion:
  - press screen/click to rise;
  - if no press, character gently descends.
- Gravity must be soft.
- Portals/gates must be wide enough for a 6-year-old.

Goal:
- pass 10–12 portals.
- Collect up to 5 optional temporary stars.
- Stars may be placed slightly above/below the safest route.

Lives:
- 3 hearts.
- Collision with portal edge or hazard removes heart.

Instruction:
```txt
Нажимай на экран, чтобы взлетать выше.
Пролетай сквозь порталы.
Собирай звёзды, если успеваешь.
```

Suggested themes:
- Ice Dragon: ice portals, snow stars, crystal shards.
- Fire Dragon: flame portals, ember stars, lava rocks.
- Forest Dragon: leaf portals, glowing seeds, thorn vines.
- Eaglet: cloud rings, wind stars, storm clouds.

---

## 7.5 Jump to Star — «Вверх к звезде»

Characters:
- 9 Волчонок — Норд
- 12 Тигрёнок — Рыкс
- 3 Енотик — Плюш
- 18 Леопардик — Блиц

Mode:
- Portrait / vertical orientation.
- Character auto-jumps.
- Player controls left/right:
  - left half of screen = move left;
  - right half = move right;
  - dragging can also move the character.
- Movement should respond quickly so the game feels fair.

Goal:
- climb to the top star/sun/chest in about 40–60 seconds.
- Collect up to 5 optional temporary stars.
- Falling below screen removes a heart and returns to a safe platform/checkpoint.

Lives:
- 3 hearts.

Instruction:
```txt
Герой прыгает сам.
Нажимай слева или справа, чтобы двигаться.
Доберись до верхней звезды.
```

Suggested themes:
- Wolf: snow stones / northern-light platforms.
- Tiger: jungle stones / vines.
- Raccoon: wooden boxes / branches.
- Leopard: storm clouds / lightning platforms.

---

## 7.6 Special Final Game — Star Dragon / «Три стихии Астры»

Character:
- 20 Звёздный дракончик — Астра

Role:
- Main premium reward after about 90 days.
- Should feel stronger and more ceremonial than all regular games.
- Has 3 short levels.

Mode:
- Landscape.
- Soft flight controls:
  - press/click to rise;
  - release to descend gently;
  - optional horizontal movement if technically simple, but do not overcomplicate.

Structure:
1. Level 1 — Ice
   - fly through icy portals;
   - collect star fragments;
   - avoid crystal spikes.
2. Level 2 — Fire
   - fly through flame rings;
   - collect ember stars;
   - avoid lava rocks.
3. Level 3 — Cosmos
   - fly through cosmic gates;
   - collect final stars;
   - avoid meteors.

Duration:
- each level about 25–40 seconds.
- total about 90–120 seconds maximum.

Lives:
- Either 3 hearts per level, or 5 hearts for the whole game.
- Recommended: 5 hearts for the whole final game so it feels generous and premium.

Success:
- after level 3:
```txt
Главное испытание пройдено!
Астра открыта!
Поздравляю!
```

Failure:
```txt
Пока не получилось
```

Restart button:
```txt
Начать заново
```

Final effect:
- star burst;
- gentle confetti;
- short success sound;
- return to reward card after pressing `Окей`.

---

# 8. Settings / Parent Controls

Add a parent/admin settings section for bonus games if feasible.

Recommended MVP controls:
1. `Reset all bonus game completions`
   - resets completion state for selected child or all children.
2. `Allow replay once`
   - optional: parent can allow one more replay for a selected child/card.
3. `Max successful completions per card`
   - default: 1.
   - parent can set higher number if needed.

Do not overbuild settings in first pass. If existing settings architecture is complex, implement only:
- reset all bonus games for selected child;
- per-child state.

---

# 9. Data Model Requirements

Find existing data model first.

Need store per child + per reward card:
- child id / profile id;
- reward id / animal id;
- game id;
- status:
  - not_started
  - completed
- completedAt timestamp;
- optional replayAllowance or completionCount if parent controls are implemented.

Potential table / object:
```ts
BonusGameProgress {
  childId: string
  rewardAnimalId: number
  gameId: 'runner' | 'catcher' | 'tap-reaction' | 'flight-portals' | 'jump-to-star' | 'star-dragon'
  completed: boolean
  completionCount: number
  completedAt?: string
  updatedAt: string
}
```

Prefer existing Supabase patterns if present.

---

# 10. Implementation Approach

## Phase 0 — Audit

Before coding:
1. Inspect current project stack.
2. Identify:
   - reward card components;
   - child/profile state;
   - task completion/streak logic;
   - settings page;
   - Supabase/client storage layer;
   - routing/modal architecture;
   - existing images/public asset conventions.
3. Report exact files to modify.
4. Do not commit/push/deploy unless explicitly instructed.

## Phase 1 — Vertical Slice: Runner only

Implement:
- button in unlocked reward card;
- fullscreen game shell;
- Runner mechanics;
- per-child completion state;
- disable button after success;
- X exit without completion;
- fail/restart;
- basic settings reset if simple.

Use only Runner characters:
- 1 Панда
- 5 Хаски
- 7 Лисёнок
- 15 Хамелеончик

## Phase 2 — Add remaining regular games

After Runner is stable:
- Catcher
- Tap Reaction
- Flight Portals
- Jump to Star

## Phase 3 — Star Dragon final game

Add special 3-level Star Dragon game.

---

# 11. Acceptance Criteria

1. Existing AliToDo tasks/rewards still work.
2. Reward card shows `Бонусная игра` only when appropriate.
3. Game opens fullscreen.
4. X exit returns to card and does not mark completed.
5. Failure allows manual restart.
6. Success marks completed for the current child only.
7. Button becomes inactive after completion.
8. Other child’s button remains independent.
9. No persistent extra points/stars are awarded.
10. Temporary in-game stars are not saved.
11. Runner double jump works.
12. Regular games feel short and easy.
13. Jump to Star uses portrait orientation.
14. Most other games use landscape.
15. Settings include at least reset ability or clearly documented follow-up if not implemented.