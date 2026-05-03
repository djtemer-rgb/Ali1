-

--
name: qa-checklist
d

escription: Use this before final report. Check routing, child flows, parent settings, Upstash persistence, Telegram alerts, PWA, reports, exports, and no-secret leakage.
license: MIT

compatibility: opencode
-

--

#

# Required checks
- npm install works
-

 npm run lint passes or known issues are listed
- npm run build passes
-

 Direct refresh works on all routes
- Ali and Said data do not mix
-

 Parent PIN protects settings
- .env.local is igno
red by git
-
 No secrets in client bundle or repo
-
 Upstash read/write works
-
 Telegram test alert works when env exists
-
 Reward availability and selected reward events appear in parent inbox
-
 Star ledger supports 0.5
-
 90-day cleanup does not delete current data


#
# Final report in Russian
I
nclude: what was done, files changed, env vars needed, how to run, how to deploy, what was tested, what remains for next iteration.

