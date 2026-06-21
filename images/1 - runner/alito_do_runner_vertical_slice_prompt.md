# AliToDo / «Путь героя» — Runner Bonus Game Vertical Slice Implementation Prompt

> Use this prompt first. Implement only the Runner mini-game and the shared bonus-game infrastructure needed for it.  
> Do not implement the other games yet. Do not generate images. Use the provided asset paths if files exist; otherwise use placeholders and clearly mark missing assets.

---

## 0. Mission

Add the first playable bonus mini-game to AliToDo / «Путь героя»:

```txt
Game: Runner
Characters:
1 Панда — Бамбу
5 Хаски — Фрост
7 Лисёнок — Фокси
15 Хамелеончик — Спектр
```

This is a vertical slice to validate the whole flow:

```txt
Unlocked reward card → Бонусная игра button → fullscreen Runner → success/failure/exit → return to card → per-child completion state
```

---

## 1. Critical Safety Rules

1. Do not break existing tasks, streaks, stars, reward cards, or reward unlock animations.
2. Do not change existing reward values.
3. Do not add persistent bonus stars or badges for games.
4. Do not auto-restart after failure.
5. Do not mark game completed unless the child actually passes the game.
6. Completion state must be per child:
   - Али and Саид are independent.
   - If Али completed Panda Runner, Саид can still play his own Panda Runner if available.

---

## 2. First: Audit the Project

Before making code changes, inspect the repository and briefly report:

1. Framework/build stack.
2. Where child/profile state is stored.
3. Where reward cards are rendered.
4. Where reward modal/card details are rendered.
5. Where settings are implemented.
6. Whether Supabase or another backend is already used.
7. Recommended exact files to modify.
8. Whether image assets should be served from `public/Images/...` or another existing convention.

Then proceed only with the minimal vertical slice unless a blocker appears.

---

## 3. Asset Paths

Expect Runner assets here:

```txt
public/Images/bonus-games/runner/01_panda_bambu.png
public/Images/bonus-games/runner/05_husky_frost.png
public/Images/bonus-games/runner/07_fox_foxy.png
public/Images/bonus-games/runner/15_chameleon_spectrum.png
```

If assets are not present:
- use simple placeholders;
- keep the code ready to switch to these files later;
- do not fail the implementation.

Each sprite sheet is expected to be a 1:1 chroma-key image:
- top row: 3 running frames;
- bottom row: 2 obstacles.
If slicing is not reliable yet, use the full sheet only as temporary display or add placeholder obstacles. Do not block the flow.

---

## 4. Reward Card Button

Inside the unlocked reward card modal/details, add a button:

```txt
Бонусная игра
```

Button rules:
- show/enable if reward is unlocked and Runner not completed for the current child/reward;
- after successful completion, disable button and show:
```txt
Игра пройдена
```
- if child exits with X or fails, keep button active.

---

## 5. Fullscreen Bonus Game Shell

Create reusable shell if practical:

```txt
BonusGameShell
```

Minimum UI:
- fullscreen overlay;
- game title:
```txt
Бонусная игра
```
- X close button;
- pause button;
- hearts/lives display;
- temporary star counter;
- start screen;
- success screen;
- fail screen.

### Landscape prompt

Runner should be landscape.

On mobile/narrow screen show simple prompt:

```txt
Поверни телефон
```

It can blink 2 times. Keep it simple.

Desktop:
- no rotate requirement.

### Start screen text

```txt
Нажимай на экран, чтобы прыгать.
Нажми ещё раз в воздухе — будет двойной прыжок.
```

Button:
```txt
Начать
```

---

## 6. Runner Mechanics

### Core movement

- Character auto-runs from left to right.
- World/obstacles move from right to left.
- Press/click anywhere in game area = jump.
- Press/click again while in air = double jump.
- Double jump is allowed only once before landing.
- Double jump resets after touching ground.

### Duration

Target playtime:
- about 30–40 seconds.
- If implementation uses obstacles instead of timer, use around 12–15 obstacles.
- First obstacle must appear after a short safe delay.

### Lives

Use 3 hearts.

On collision:
1. remove 1 heart;
2. character briefly flashes/bounces;
3. short invulnerability window around 1 second;
4. continue game.

If all hearts are lost:
- stop game;
- show:
```txt
Пока не получилось
```
- button:
```txt
Начать заново
```

Do not auto-restart.

### Success

Success condition:
- either finish timer expires, or finish line reached, whichever is simpler and stable.

Show:
```txt
Игра пройдена!
Поздравляю!
```

Button:
```txt
Окей
```

On click:
- persist completion for this child/reward;
- close fullscreen game;
- return to reward card;
- disable button.

---

## 7. Temporary Stars

Add about 5 temporary stars during Runner.

Rules:
- Stars are for momentary fun only.
- They are not saved.
- They are not added to main AliToDo stars.
- Missing a star is not a fail.
- Collecting star can play a small magical sound/effect if available.

Temporary UI can show:
```txt
★ 0/5
```

This counter disappears when the game ends and is not stored.

---

## 8. Character Themes

Runner characters and obstacles:

### 1 Панда — Бамбу
- obstacles: bamboo, grey stone.

### 5 Хаски — Фрост
- obstacles: ice crystal, snowball.

### 7 Лисёнок — Фокси
- obstacles: stump, red mushroom.

### 15 Хамелеончик — Спектр
- obstacles: red crystal, closed jungle flytrap.

If obstacle sprites cannot be extracted yet, use simple placeholder obstacles with matching labels/classes internally, but do not show text labels to children.

---

## 9. Per-Child Completion State

Find existing child profile IDs and storage patterns.

Need store at least:

```ts
{
  childId: string,
  rewardAnimalId: number,
  gameId: "runner",
  completed: boolean,
  completedAt?: string
}
```

Preferred:
- Supabase or existing cloud-backed app storage.
Fallback only if necessary:
- localStorage with a clear TODO to migrate to cloud.

Important:
- Completion must be checked per current child.
- Do not mark all children completed.

---

## 10. Settings MVP

If existing settings page is easy to extend, add:

```txt
Сбросить бонусные игры
```

Minimum:
- reset Runner completion for selected child.

If settings architecture is not obvious, do not overbuild. Add a clear TODO and keep the core Runner flow working.

---

## 11. Pause / Exit

Pause:
- game freezes.
- show large centered play button.
- pressing play resumes.

Exit X:
- return to card/modal.
- do not save completion.
- do not consume attempts.
- button remains active.

---

## 12. Sound

Add simple sounds only if existing project already has safe audio handling or if it is easy:
- jump;
- star collect;
- hit;
- success;
- fail.

If sound causes issues, keep visual effects and skip sound.

---

## 13. Acceptance Criteria

Runner vertical slice is complete when:

1. Existing app still builds.
2. Existing task/reward flow still works.
3. Unlocked Runner reward card shows `Бонусная игра`.
4. Clicking opens fullscreen Runner.
5. Start screen appears with simple Russian instruction.
6. Jump works.
7. Double jump works once per airtime.
8. Obstacles appear after a short safe delay.
9. Collisions remove hearts.
10. All hearts lost shows `Пока не получилось` and `Начать заново`.
11. X exit returns without completion.
12. Pause freezes and resumes game.
13. Success shows `Игра пройдена! Поздравляю!`.
14. Pressing `Окей` saves completion for current child only.
15. Button becomes inactive only for that child/card.
16. No extra persistent stars/badges are awarded.
17. Temporary stars are not saved.
18. Build/lint/tests pass or issues are clearly reported.