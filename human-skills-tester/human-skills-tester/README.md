# Human Skills Tester - fixed Firebase release

## Fixes in this build
- Realtime Database timestamps are now invoked correctly.
- Existing Firestore scores download into local score state and refresh every game and the 0/7 dashboard.
- New local bests upload to Firestore.
- Google Identity Services button and One Tap initialize after the library loads, with a normal Google sign-in fallback.
- Multiplayer score state no longer uses null fields that Realtime Database deletes.
- Mobile navigation, forms, room UI, game panels, and PWA cache were polished.

## Required after uploading
1. Deploy rules: `firebase deploy --only firestore:rules,database`
2. Confirm the exact Realtime Database URL in `js/firebase.js`.
3. Keep `johart2030.github.io` in Firebase Authentication authorized domains.
4. Add `https://johart2030.github.io` as an authorized JavaScript origin for the Google OAuth web client.
5. Remove the old installed PWA or hard refresh once. The service-worker cache name is now `hst-v3-fixed`.
