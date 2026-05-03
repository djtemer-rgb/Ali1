# Ali Quest / «Путь героя» — 4 Coding Iterations для OpenCode

Версия: 2026-05-03  
Проект: отдельный от TemBook.  
Repo: `djtemer-rgb/Ali1`  
Vercel: `ali1-one.vercel.app`  
Storage: Upstash Redis, хранить последние 90 дней.

---

## Общая стратегия

Не делать всё одним чудовищным prompt. Делать 4 итерации:

1. **Итерация 1 — фундамент, UI, Upstash, задачи, оценки, звёзды, награды, Telegram.**
2. **Итерация 2 — PWA, push-уведомления, AI hero message, озвучка через браузерный SpeechSynthesis.**
3. **Итерация 3 — отчёты, экспорт MD/PDF, 90-дневная очистка, полировка настроек.**
4. **Итерация 4 — голосовой ввод/AI voice, финальная QA-полировка, стабильность, edge cases.**

Каждая итерация должна ссылаться на следующую, но не начинать её раньше времени.

---

## Data contract v1

Агент должен использовать компактный server-side storage через Upstash Redis.

Рекомендуемые ключи:

```text
aq:settings
aq:children
aq:child:ali:profile
aq:child:said:profile
aq:day:ali:YYYY-MM-DD
aq:day:said:YYYY-MM-DD
aq:events:parent
aq:telegram:chats
aq:star-ledger:ali
aq:star-ledger:said
```

### Child profile

```ts
type ChildProfile = {
  id: 'ali' | 'said'
  name: string
  mode: 'full' | 'little-hero'
  avatarLetter: string
  favoriteHeroes: string[]
  hideGradesInChildHome?: boolean
  createdAt: string
  updatedAt: string
}
```

### Task template

```ts
type TaskTemplate = {
  id: string
  childId: 'ali' | 'said' | 'both'
  title: string
  category: 'study' | 'sport' | 'boxing' | 'chess' | 'reading' | 'order' | 'home-help' | 'rest' | 'custom'
  customCategory?: string
  repeatDays: number[]
  dueTime?: string
  stars: number
  active: boolean
  requiresOpenDetails: boolean
  detailsText?: string
  subtasksMode: 'none' | 'checkboxes' | 'plain-list'
  subtasks: { id: string; title: string; done?: boolean }[]
  askDifficultyAfterDone: boolean
  createdAt: string
  updatedAt: string
}
```

### Daily task instance

```ts
type DailyTaskInstance = {
  id: string
  templateId?: string
  childId: 'ali' | 'said'
  date: string
  title: string
  category: string
  stars: number
  dueTime?: string
  completed: boolean
  completedAt?: string
  detailsOpened: boolean
  requiresOpenDetails: boolean
  subtasksMode: 'none' | 'checkboxes' | 'plain-list'
  subtasks: { id: string; title: string; done: boolean }[]
  difficulty?: 'easy' | 'normal' | 'hard'
}
```

### Grade

```ts
type Grade = {
  id: string
  childId: 'ali' | 'said'
  date: string
  subjectId: string
  grade: 5 | 4 | 3 | 2
  starsAwarded: number
  createdAt: string
}
```

### Reward

```ts
type Reward = {
  id: string
  childId: 'ali' | 'said' | 'both'
  title: string
  description?: string
  costStars: number
  icon: string
  iconStyle: 'color' | 'minimal'
  active: boolean
  createdAt: string
  updatedAt: string
}
```

### Star ledger

```ts
type StarLedgerItem = {
  id: string
  childId: 'ali' | 'said'
  date: string
  amount: number
  source: 'task' | 'grade' | 'manual' | 'reward-purchase' | 'reset' | 'adjustment'
  sourceId?: string
  reason: string
  createdAt: string
}
```

### Parent event

```ts
type ParentEvent = {
  id: string
  childId: 'ali' | 'said'
  type: 'reward-available' | 'reward-selected' | 'day-completed' | 'task-completed' | 'grade-added' | 'system'
  title: string
  body: string
  read: boolean
  createdAt: string
}
```

---

# ITERATION 1 PROMPT — Foundation + Telegram

Скопировать в OpenCode целиком.

```text
Ты работаешь в проекте Ali Quest / «Путь героя». Это отдельный проект, не TemBook.

Repo: djtemer-rgb/Ali1
Production domain: https://ali1-one.vercel.app
Storage: Upstash Redis, already linked to Vercel. Retention target: last 90 days.

Before coding, read:
- AGENTS.md
- docs/ALI_QUEST_PRODUCT_BRIEF.md

Use skills when relevant:
- product-guardian
- child-ux
- vercel-next
- storage-contract
- qa-checklist

Use context7 if you need current Next.js/Vercel/Upstash docs. Use gh_grep only for examples if stuck.

Goal of Iteration 1:
Build the working foundation: Next.js app, responsive child UI, parent PIN area, Upstash persistence, two child profiles, tasks, grades, stars, rewards, internal parent inbox, Telegram alerts.

Do NOT implement yet:
- PWA push notifications
- voice input
- PDF export
- full reports analytics
- complex AI voice/chat
These are planned for later iterations. Leave visible UI placeholders only where useful.

Technical stack:
- Next.js App Router
- TypeScript
- Tailwind or clean CSS modules
- Upstash Redis via @upstash/redis
- Vercel server routes

Critical deployment rule:
All routes must work on direct open and page refresh on Vercel:
- /
- /child/ali
- /child/said
- /parent
- /settings
- /reports
- /rewards
Do not create a route-refresh bug.

Core product requirements:
1. Two children: Ali and Said.
2. Same settings structure for both, but separate data layers.
3. Child can switch profile on the child-facing UI.
4. Said can use 'little-hero' mode, but do not make separate architecture. It is a profile setting.
5. Parent mode is protected by PIN, not email/password.
6. Parent settings must support two PIN slots and one emergency recovery word.
7. Store PINs and recovery word hashed, not plain text.
8. Parent session should be remembered in a secure httpOnly cookie for a reasonable time.
9. Child screens must not expose parent settings.

Child UI requirements:
- Light, premium, friendly dashboard based on provided screenshots.
- Header: avatar, greeting, stars.
- Tabs or nav: Main, Grades, Schedule, Rewards/Reports as appropriate.
- Main: today's quests, reward shop, parent/hero message placeholder.
- Large buttons, adaptive layout for phone/tablet/laptop/desktop.
- No overloaded text.
- Child can switch Ali/Said.

Task requirements:
- Parent can create/edit/delete task templates.
- Task categories: study, sport, boxing, chess, reading, order, home-help, rest, custom.
- Repeat days.
- Optional due time.
- Stars can be 0, 0.5, 1, 1.5 etc.
- Simple task can be completed directly.
- Complex task can require opening details before completion.
- If child tries to complete a details-required task without opening it, show a small warm red warning, for example: “Сначала открой условия квеста 🙂”.
- Subtasks can be checkbox list or plain instruction list.
- If subtasks are checkboxes, parent can require all checked before main completion.
- Optional post-completion difficulty selector: “Как было?” easy / normal / hard.

Grades requirements:
- Parent can configure subjects.
- Parent can configure grade-to-stars mapping.
- Default: 5 = +5, 4 = +2, 3 = 0, 2 = 0.
- Child can add grade by subject and grade.
- Grades are trusted; no parent approval.
- For 3 or 2, show short supportive text: no shame, focus on effort and understanding.

Stars requirements:
- Star ledger must support decimal values, minimum useful step 0.5.
- Stars are calculated from ledger, not only stored as a number.
- Parent can manually adjust stars with reason.

Rewards requirements:
- Parent can create/edit/delete rewards.
- Reward fields: title, description, costStars, icon, iconStyle, active.
- Include at least 40 colorful emoji/icon options and 40 minimal icon options in code/data.
- Child reward cards must be taller than screenshot cards: title + small description + cost.
- If 6 rewards, show 2 rows or responsive grid.
- Default reward economy: when reward is fulfilled/purchased, subtract its cost from stars.
- Star expiration is off by default. Add setting placeholder but full expiration logic can be minimal in Iteration 1 if time is tight.
- Child can mark a reward as wanted/selected if enough stars.
- Parent inbox must show both: reward became available and child selected reward.

Telegram requirements:
- Use server-side Telegram only.
- Env:
  TELEGRAM_BOT_TOKEN
  TELEGRAM_CHAT_IDS comma-separated
- Send Telegram event when:
  1) child reaches enough stars for a reward for the first time;
  2) child selects/wants a reward;
  3) optional: all today's tasks completed.
- Also write every such event into parent inbox in Upstash.
- If Telegram env is missing, app must not crash. It should log/store parent event and show setup warning only in parent settings.

Upstash requirements:
- Use @upstash/redis and Redis.fromEnv().
- Support both UPSTASH_REDIS_REST_URL/TOKEN and KV_REST_API_URL/TOKEN if possible.
- Store compact JSON.
- Do not use localStorage as source of truth.
- Keep client optimistic UI reasonable but persist to server.

Settings UI:
Parent settings should be accordion/card based, not one huge scroll wall.
Sections:
- Children profiles
- PIN and recovery
- Task templates
- Subjects and grade stars
- Rewards
- Star economy
- Telegram
- AI settings placeholder
- PWA/export placeholders

Seed data:
- Ali profile, full mode.
- Said profile, little-hero mode.
- Default subjects: Математика, Русский язык, Чтение, Окружающий мир, Английский язык.
- Default rewards from screenshots: 1 час видеоигр, Поход в кино, Новое LEGO.
- Example tasks: Прочитать 10 страниц, Собрать портфель, Тренировка.

Final deliverables:
- Working app locally.
- Build passes.
- Main routes work.
- Commit and push to GitHub if possible.
- Final report in Russian.

Final report must include:
- what was implemented;
- files changed;
- env vars required;
- how to run locally;
- how to deploy;
- what was tested;
- what remains for Iteration 2.

Important: Iteration 2 will add PWA install, PWA push, hero AI text response and read-aloud button. Do not start Iteration 2 now.
```

---

# ITERATION 2 PROMPT — PWA + Push + AI Hero Text

```text
Ты продолжаешь Ali Quest / «Путь героя» after Iteration 1.

Before coding:
- Read AGENTS.md
- Read docs/ALI_QUEST_PRODUCT_BRIEF.md
- Inspect current code from Iteration 1
- Use product-guardian, child-ux, vercel-next, ai-safety, qa-checklist
- Use context7 for current PWA, Vercel, web push and Next.js docs if unsure

Goal of Iteration 2:
Add PWA install support, icons/manifest, optional web push for parent devices, AI hero message text, and browser read-aloud button.

Do NOT implement yet:
- full voice input from child
- PDF export
- advanced reports
These are Iteration 3/4.

PWA requirements:
1. App name: «Путь героя».
2. Short name: «Путь героя» or «Герой».
3. Use /public/icon.png if present as source.
4. Generate needed icons or add clear script/instructions:
   - favicon.ico
   - apple-touch-icon.png
   - icons/icon-192.png
   - icons/icon-512.png
   - icons/maskable-192.png
   - icons/maskable-512.png
5. Add web manifest.
6. Theme color should match blue/gold hero UI.
7. App should be installable on mobile where supported.

PWA push requirements:
- Parent-only notifications.
- Do not send push to child devices by default.
- Add parent settings UI: enable/disable push on this device.
- Env for push:
  VAPID_PUBLIC_KEY
  VAPID_PRIVATE_KEY
  VAPID_SUBJECT
- If env missing, show setup note in parent settings, app must not crash.
- Store push subscriptions in Upstash.
- Send push when:
  1) reward becomes available;
  2) reward selected;
  3) day completed.
- Telegram remains primary reliable channel. Push is secondary.

AI Hero Message requirements:
- Add child-facing button: “Послание героя” / “Послание наставника”.
- AI can be called maximum HERO_AI_DAILY_LIMIT_PER_CHILD per day, default 3.
- It sees only safe data:
  child name, mode, favorite heroes, today's tasks, completed state, grades today, stars today, rewards available.
- No free-form infinite chat.
- Child cannot type arbitrary long chat.
- AI output is short, supportive, no shame.
- Mention favorite heroes occasionally, not every time.
- Favorite heroes list configurable in parent settings, max 10.
- Father can be one of favorite heroes if parent adds him manually.

AI env:
OPENROUTER_API_KEY
HERO_AI_MODEL
HERO_AI_MODEL_FALLBACK
HERO_AI_DAILY_LIMIT_PER_CHILD=3

If OpenRouter env missing:
- Show deterministic fallback message.
- App must not crash.

Read aloud:
- Add button: “Прочитать” / speaker icon.
- Use browser Web Speech API SpeechSynthesis first, no external TTS key.
- If unavailable, hide/disable gracefully.
- Do not add ElevenLabs.

Settings:
- Add AI settings accordion:
  - model id field
  - fallback model field
  - daily limit
  - system prompt editable textarea
  - favorite heroes per child
  - allow mini tips toggle
  - allow father-style references via favoriteHeroes only

Safety:
- AI prompt must explicitly forbid shame, adult topics, unsafe advice, politics, medical/legal advice, and infinite chatting.

Testing:
- Verify PWA manifest loads.
- Verify icon paths do not 404.
- Verify parent push setup screen does not crash without VAPID env.
- Verify AI fallback works without key.
- Verify AI works with key if env exists.
- Verify direct refresh routes still work.

Final report in Russian with files changed, env vars, tests, and what remains for Iteration 3.

Important: Iteration 3 will add reports, compact MD/PDF export, retention cleanup and richer analytics. Do not start Iteration 3 now.
```

---

# ITERATION 3 PROMPT — Reports + Export + Retention

```text
Ты продолжаешь Ali Quest / «Путь героя» after Iteration 2.

Before coding:
- Read AGENTS.md
- Read docs/ALI_QUEST_PRODUCT_BRIEF.md
- Inspect current data contract and Upstash keys
- Use product-guardian, child-ux, storage-contract, vercel-next, qa-checklist
- Use context7 if unsure about PDF/export libraries or Next.js server/client boundaries

Goal of Iteration 3:
Add child-friendly and parent-friendly reports, compact MD/PDF export, and 90-day retention cleanup.

Reports requirements:
- Reports visible to child and parent.
- Child view must be simple and motivating.
- Parent view can be more detailed.
- Time ranges: 7 days, 30 days, 90 days.
- Optional disabled placeholders for 6 months/year if data not available.
- Show:
  - completed tasks count
  - stars earned
  - grades count / grade stars
  - streak days
  - category distribution
  - rewards available/selected/fulfilled
- UI should be beautiful but not crowded.
- Use responsive charts/cards.
- Avoid huge scroll walls.

Chart ideas:
- Two-line or two-bar chart: tasks completed and stars earned.
- Small category donut/pie.
- Streak card.
- Reward progress card.

Export requirements:
- Add export buttons to parent reports:
  - Today
  - Last 3 days
  - Last 7 days
  - Last 30 days
- Export MD:
  - clean readable markdown
  - compact sections
  - Ali/Said separated
- Export PDF:
  - compact layout
  - 30 days should target no more than 4–5 pages if reasonable
  - avoid huge blank spaces
  - if PDF library becomes too much, implement MD first and leave PDF as second step inside this iteration with clear TODO

Retention requirements:
- Store last 90 days by default.
- Add parent setting AQ_DATA_RETENTION_DAYS, default 90.
- Cleanup old daily keys beyond retention on safe moments:
  - after saving daily data
  - or via admin maintenance button
- Do not delete star ledger needed for current balance unless it has been summarized.
- If implementing ledger cleanup, first create monthly/rolling summary.
- Safer v1: keep ledger compact and trim events, but daily records older than retention can be removed.

Parent inbox requirements:
- Add filters: unread/all, Ali/Said, event type.
- Mark read.
- Clear old events safely.

Settings polish:
- Accordions should remember open/closed state locally.
- Avoid one giant settings wall.
- Add clear test buttons:
  - Test Telegram
  - Test Push if available
  - Test AI message
  - Test Upstash read/write

Testing:
- Reports load for Ali and Said separately.
- No mixing data.
- Export MD works.
- PDF works or TODO is explicit if not completed.
- Retention cleanup does not delete current data.
- Build passes.
- Routes refresh on Vercel paths.

Final report in Russian with files changed, env vars, tests, and what remains for Iteration 4.

Important: Iteration 4 will add optional one-per-day voice input and final hardening. Do not start Iteration 4 now.
```

---

# ITERATION 4 PROMPT — Voice + Hardening + Final Polish

```text
Ты продолжаешь Ali Quest / «Путь героя» after Iteration 3.

Before coding:
- Read AGENTS.md
- Read docs/ALI_QUEST_PRODUCT_BRIEF.md
- Use product-guardian, child-ux, ai-safety, vercel-next, storage-contract, qa-checklist
- Use context7 for OpenRouter audio/Web Speech/PWA docs if needed

Goal of Iteration 4:
Add optional child voice input, final UI polish, edge-case handling, and production hardening.

Voice requirements:
- Voice is optional and controlled by parent settings.
- Default: disabled or conservative.
- One voice message per child per day.
- Max duration: 60 seconds.
- After recording, stop automatically.
- Child cannot create infinite chat loop.
- AI returns one short supportive answer.
- If voice pipeline unavailable, show graceful fallback.

Implementation options:
Option A — browser SpeechRecognition if supported:
- No external STT cost.
- Browser support varies.
- Use only if reliable enough.

Option B — OpenRouter audio-capable model:
- Send audio to server endpoint.
- Server calls OpenRouter.
- No keys in browser.
- More reliable if selected model supports audio.

Preferred implementation:
- Start with server endpoint abstraction:
  /api/ai/voice-message
- UI records audio, sends to server.
- Server either transcribes/responds or returns fallback.
- Parent settings choose voice provider: disabled | browser | openrouter.

AI safety:
- Voice input is not free chat.
- No sensitive topics.
- If child asks off-topic, answer briefly and redirect to real-life action.

Hardening:
- Check all env missing states.
- Check Upstash failures.
- Check Telegram failures.
- Check duplicate reward-available notifications: should not spam same reward every refresh.
- Check repeated clicks on task completion.
- Check decimal stars consistency.
- Check PIN recovery edge cases.
- Check two PIN slots cannot both be empty.
- Check Said little-hero mode.
- Check PWA installed mode display.

UI polish:
- Smooth microanimations.
- Confetti only for day completed, reward selected, major streak.
- Better empty states.
- Better mobile layout.
- Better reward cards.
- Better reports cards.

Final QA:
- npm install
- npm run lint
- npm run build
- Local smoke test
- Production route refresh list
- Ali/Said data separation
- Parent PIN protection
- Telegram test
- Push test if env exists
- AI text test
- Voice test if enabled
- Export test
- No secrets in repo

Final report in Russian:
- rollback point / commit hash
- what was completed
- files changed
- env vars used
- how to run locally
- how to deploy
- manual test checklist
- known limitations
- suggested next improvements
```

---

## Env variable checklist

Add in Vercel Project → Settings → Environment Variables:

```env
# App
NEXT_PUBLIC_APP_URL=https://ali1-one.vercel.app
AQ_DATA_RETENTION_DAYS=90
AQ_PARENT_SESSION_SECRET=generate-long-random-secret

# Upstash Redis
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
# or KV_REST_API_URL / KV_REST_API_TOKEN if Vercel KV naming is used

# Telegram
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_IDS=123456789,987654321

# AI
OPENROUTER_API_KEY=...
HERO_AI_MODEL=...
HERO_AI_MODEL_FALLBACK=...
HERO_AI_DAILY_LIMIT_PER_CHILD=3

# PWA Push, Iteration 2
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:your-email@example.com
```

Generate random secret locally:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Generate VAPID keys in Iteration 2:

```powershell
npx web-push generate-vapid-keys
```

---

## Notes for the coding agent

- Do not ask for more product clarification unless truly blocked.
- Make reasonable defaults.
- Keep code clean and simple.
- Avoid overengineering.
- Avoid huge single files if possible.
- Prefer clear server/client separation.
- Keep all dangerous secrets server-only.
- When in doubt, ship a safe placeholder rather than a broken feature.

