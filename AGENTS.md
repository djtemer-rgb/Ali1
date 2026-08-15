# Ali Quest / Путь героя — Agent Rules

This project is separate from TemBook.

## Product goal
Build a private family dashboard for two children, Ali and Said. It is a short daily ritual for tasks, grades, stars, rewards, parent feedback and hero-style support. It must not become a social app, addictive game, or free-form AI toy.

## Stack
Prefer Next.js App Router + TypeScript + Tailwind + Upstash Redis + Vercel + GitHub auto-deploy.

## Current deployment
- GitHub: djtemer-rgb/Ali1
- Vercel: ali1-one.vercel.app
- Storage: Upstash Redis linked through Vercel Marketplace

## Core requirements
- Two child profiles: Ali and Said.
- Same settings system for both, but separate data layers.
- Child can switch profile.
- Parent area protected by PIN, not email/password.
- Two PIN slots + one emergency recovery word.
- Parent session should be remembered via secure cookie.
- Tasks can be simple or complex.
- Complex task can require details opening before completion.
- Subtasks can be checkboxes or plain instruction list.
- Stars can be decimal, minimum 0.5.
- Grades are trusted, no parent approval required.
- Rewards can be available, selected, fulfilled.
- Telegram alerts in iteration 1.
- PWA and push in iteration 2.
- Store last 90 days by default.
- UI must be responsive for phone, tablet, laptop, desktop.

## Security
- Never commit `.env`, `.env.local`, API keys, tokens, PINs, or Redis credentials.
- All AI and Telegram calls must go through server routes.
- Do not expose OpenRouter, Telegram, Upstash, VAPID private keys to browser.

## Use skills & Knowledge Base
- Before implementing any new feature or changing code, read the master documentation in `knowledge/README.md` and related docs.
- Use skill `ali-quest-dashboard` (`skills/ali-quest-dashboard/SKILL.md`).
- Before child UI, load `child-ux`.
- Before Vercel/PWA/routes/env work, load `vercel-next`.
- Before data changes, load `storage-contract`.
- Before AI/voice/TTS, load `ai-safety`.
- Before final answer, load `qa-checklist`.

## Use MCP & CodeGraph
- **CodeGraph is MANDATORY**: Before introducing new features, refactoring, or modifying backend/frontend code, always query `codegraph` (`codegraph_status`, `codegraph_context`, `codegraph_explore`, `codegraph_impact`) with `projectPath: "/Users/temer/Documents/Проекты/Ali1"`. This provides instant AST knowledge of all symbols, callers, callees, and dependencies without full-codebase rescan.
- Use `context7` when checking documentation for Next.js, Vercel, Upstash, PWA, web push.
- Use `gh_grep` for code examples only when needed.
- Do not enable heavy MCP tools unless necessary.

## Final report
Always report in Russian:
- rollback point / commit hash if available;
- what was implemented;
- files changed;
- env vars required;
- how to run locally;
- how to deploy;
- what was tested;
- what is left for next iteration.
```

---

## 14. Product brief для агента

Создай:

```powershell
mkdir docs -Force | Out-Null
ni docs\ALI_QUEST_PRODUCT_BRIEF.md -ItemType File -Force
notepad docs\ALI_QUEST_PRODUCT_BRIEF.md
```

Вставь кратко:

```markdown
# Ali Quest / Путь героя — Product Brief

Private family dashboard for Ali and Said. Father configures tasks, grades, stars, rewards, Telegram alerts, AI hero mentor and reports. Children use a simple dashboard to complete real-life tasks and see progress.

## Children
- Ali: older, school, sport, boxing, chess, leadership, likes competition but should not face loser mechanics. Likes praise, collecting, heroes, real rewards, father comparison gently.
- Said: younger, same system but can use little-hero mode. Grades may be hidden in little-hero mode.

## Motivation
Use self-competition, streaks, collections, stars, rewards, praise, hero path. Avoid shame and hard punishment.

## Tasks
Categories: study, sport, boxing, chess, reading, order, help at home, rest.
Task settings: title, category, stars, repeat days, due time, details required, subtasks, instruction list, difficulty feedback, active/inactive.

## Rewards
Title, description, icon, cost, available/selected/fulfilled. Default mode: stars are subtracted after purchase. Expiration disabled by default but configurable.

## AI
Hero mentor. Text in iteration 1 or 2. No infinite chat. Favorite heroes list up to 10: Ronaldo, Muhammad Ali, Tyson, Neymar, father, etc. AI can mention them occasionally.

## Reports
Week / 30 / 90 days. Compact, child-friendly and parent-friendly. Export MD/PDF later.