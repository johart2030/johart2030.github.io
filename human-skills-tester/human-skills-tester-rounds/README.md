# Human Skills Tester - social release

Adds global active-player count for signed-in and guest visitors, seven top-100 leaderboards, and rooms without a player-count cap. Multiplayer still requires a permanent signed-in account.

## Required Firebase console step
Enable **Authentication → Sign-in method → Anonymous**. Guest visitors use temporary anonymous Firebase accounts only for secure presence counting.

## Deploy
1. Replace all site files.
2. Run `firebase deploy --only firestore:rules,database`.
3. Hard refresh or reinstall the PWA. Cache version: `hst-v5-social`.
4. Existing signed-in scores publish to leaderboards when that user next loads the site.

Note: client-side leaderboards are suitable for a friendly project, but determined users can falsify scores. Server-verified competitive rankings would require Cloud Functions or another trusted server.


## Multiplayer rounds release
Room creators can select 1, 3, 5, 7, or 10 rounds. Each round winner earns one win. Ties award one win to each tied player. The highest win total after the selected number of rounds wins the competition. Deploy the included Realtime Database rules before testing. Cache version: `hst-v7-rounds`.
