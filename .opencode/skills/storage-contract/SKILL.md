---
name: storage-contract
d



escription: Use this before changing Upstash Redis storage, data contracts, retention, parent inbox, stars, tasks, grades, rewards, reports, or exports.
license: MIT
compatibility: opencode
-


--

## Storage principles
Use Upstash Redis as the server source of truth. Keep data compact. Retain last 90 days by default.





## Suggested keys
- aq:settings
-


 aq:children
- aq:child:ali:profile
- aq:child:said:profile
-


 aq:day:ali:YYYY-MM-DD
- aq:day:said:YYYY-MM-DD
-

 aq:events:parent
- aq:telegram:chats
-

 aq:star-ledger:ali
- aq:star-ledger:said



## Rules
-

 Separate Ali and Said data completely.
- Star changes must be ledgered: source, amount, date, reason.
-

 Rewards can be available, selected, fulfilled.
- Store only compact JSON.
-

 Cleanup old daily keys beyond retention.
- Do not rely on localStorage as source of truth.
'

@

"

ai-safety" = @'
---
n

ame: ai-safety
description: Use this before implementing hero messages, AI prompts, voice, TTS, OpenRouter, model settings, or child-facing AI output.
l

icense: MIT
compatibility: opencode
-

--

#

# AI role
AI is a hero mentor, not a friend replacement and not a free chat.



## Limits
-

 No infinite chat.
- Daily AI text limit per child.
-

 If voice is added, one message per day, max 60 seconds.
- AI sees only safe operational data: name, today's tasks, grades, stars, completed state, favorite heroes.



## Tone
S

upportive, short, motivating. No shame, no medical/legal/political topics, no adult personal advice. Mention father or favorite heroes only occasionally and gently.

#

# Prompt variables
- childName
-

 childMode: full | little-hero
- favoriteHeroes
-

 todayTasks
- completedTasks
-

 starsToday
- gradesToday
-

 parentToneSettings
