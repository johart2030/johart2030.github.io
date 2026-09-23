# Human Skills Tester Terra

Terra is the complete v10-stable Human Skills Tester build with all existing single-player, multiplayer, account, friend, profile, leaderboard, appearance, and PWA features preserved.

New in Terra:

- Pi Memory: starts at `3.14`; every correct round adds the next character of π.
- Protected Pi and Typing Test prompts, with paste, drop, cut, and copy shortcuts rejected in the manual-entry fields.
- Protected Number Memory prompts and manual-only number entry.
- Pi personal bests, score sync, and a Pi Memory leaderboard.
- Per-game, per-user Firebase audit logs for game starts, completed rounds, results, and tab switches while an active game is in progress: `gameLogs/{game}/users/{uid}/entries/{entryId}`. The Admin Console intentionally shows only tab-switch records, using `usernameKey` rather than raw UIDs.
- An access-controlled Admin Console at `admin.html` for reviewing the latest users, scores, and tab-switch logs.
- A recursive administrator-only rule for the Admin Console's Firebase collection-group log query.
- A unique PWA cache name, so Terra does not reuse stale v10 assets.
- A fix for the shared home-score renderer, which previously attempted to access home-only elements on every page.

## Deployment

1. Deploy this folder as its own site path or replace an existing site build.
2. Deploy the included Firebase rules and collection-group index when using accounts, logs, friends, multiplayer, or cloud leaderboards: `firebase deploy --only firestore:rules,firestore:indexes,database`.
3. Reload or reinstall the PWA after deploy. The Terra cache name is `hst-terra-v5`.

## Administrator access

All profiles are created with `role: "user"`. The client and deployed Firestore rules prevent users from promoting themselves. Promote a trusted account from the Firebase Console or an Admin SDK by changing its `users/{uid}` document to `role: "admin"`; after their next refresh, the Admin link and console become available. Deploy the included `firestore.rules` with the application code.
