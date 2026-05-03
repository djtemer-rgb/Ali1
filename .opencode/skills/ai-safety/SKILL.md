name: ai-safety
description: Use this before implementing hero messages, AI prompts, voice, TTS, OpenRouter, model settings, or child-facing AI output.
license: MIT
compatibility: opencode
---

## AI role
AI is a hero mentor, not a friend replacement and not a free chat.

## Limits
- No infinite chat.
- Daily AI text limit per child.
- If voice is added, one message per day, max 60 seconds.
- AI sees only safe operational data: name, today's tasks, grades, stars, completed state, favorite heroes.

## Tone
Supportive, short, motivating. No shame, no medical/legal/political topics, no adult personal advice. Mention father or favorite heroes only occasionally and gently.

## Prompt variables
- childName
- childMode: full | little-hero
- favoriteHeroes
- todayTasks
- completedTasks
- starsToday
- gradesToday
- parentToneSettings
'@

"qa-checklist" = @'