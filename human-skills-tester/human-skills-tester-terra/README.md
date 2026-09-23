# Human Skills Tester Terra

Terra is the complete v10-stable Human Skills Tester build with all existing single-player, multiplayer, account, friend, profile, leaderboard, appearance, and PWA features preserved.

New in Terra:

- Pi Memory: every correct round adds the next digit of π.
- Protected Pi and Typing Test prompts, with paste, drop, cut, and copy shortcuts rejected in the manual-entry fields.
- Pi personal bests, score sync, and a Pi Memory leaderboard.
- A unique PWA cache name, so Terra does not reuse stale v10 assets.
- A fix for the shared home-score renderer, which previously attempted to access home-only elements on every page.

## Deployment

1. Deploy this folder as its own site path or replace an existing site build.
2. Deploy the included Firebase rules when using accounts, friends, multiplayer, or cloud leaderboards: `firebase deploy --only firestore:rules,database`.
3. Reload or reinstall the PWA after deploy. The Terra cache name is `hst-terra-v1`.
