---
name: vercel-next
description: Use this for Next.js + Vercel implementation, route refresh safety, env variables, PWA manifest, deployment and GitHub auto-deploy behavior.
license: MIT
compatibility: opencode
-






--

## Stack decision
Prefer Next.js App Router for real routes and server API routes.

## Critical Vercel route rule
D





irect opening and refresh must work on all routes:
- /
- /child/ali
- /child/said
- /parent
-




 /settings
- /reports
- /rewards

Do not ship a Vite SPA route-refresh bug. If using SPA fallback, include correct Vercel rewrites and test refresh.






## Env rules
Never expose secrets with NEXT_PUBLIC unless intentionally public. Server secrets only:
- UPSTASH_REDIS_REST_URL
- U



PSTASH_REDIS_REST_TOKEN
- OPENROUTER_API_KEY
- TELEGRAM_BOT_TOKEN
- AQ_PARENT_SESSION_SECRET
- VAPID_PRIVATE_KEY






## Deployment
Assume GitHub is connected to Vercel. Push to main triggers deployment.
