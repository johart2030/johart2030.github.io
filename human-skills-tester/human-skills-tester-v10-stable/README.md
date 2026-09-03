# Human Skills Tester v10 stable

Fixes appearance saving, light default, install banner contrast, automatic public-profile migration, friend requests, player-stat profiles, social errors and mobile UI.

## Required deployment
1. Replace every site file.
2. Deploy both included rules: `firebase deploy --only firestore:rules,database`.
3. Hard refresh or reinstall the PWA. Cache: `hst-v10-stable`.
4. Open each signed-in account once. Its missing public profile is created automatically.
