# Human Skills Tester full release

Includes single-player tests, Firebase Authentication, Google sign-in and One Tap, unique display names, Firestore cloud scores, PWA installation, presence, private rooms, public matchmaking, and real-time Reaction, Math, and Typing battles.

## Required deployment

1. Confirm `databaseURL` in `js/firebase.js`. If Firebase Console shows a region-specific URL, replace the current value.
2. Install Firebase CLI and sign in.
3. Run `firebase deploy --only firestore:rules,database`.
4. Upload the site to GitHub Pages, or run `firebase deploy --only hosting`.
5. In Google Cloud OAuth credentials add `https://johart2030.github.io` as an authorized JavaScript origin.
6. In Firebase Authentication authorized domains keep `johart2030.github.io`.

Do not publish service-account keys or OAuth client secrets.
