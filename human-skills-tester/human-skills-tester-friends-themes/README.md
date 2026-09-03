# Human Skills Tester v9 - Friends and customization

Adds friend requests, accepted friends, blocking, exact-name search, public player stats, live friend activity, join-friend buttons, dark/light/system themes, accent colors, spacing settings, and privacy preferences.

## Deploy
1. Replace all site files.
2. Deploy both rules: `firebase deploy --only firestore:rules,database`.
3. Hard refresh or reinstall the PWA. Cache: `hst-v9-friends`.
4. Existing users should open Profile and save their display name once if a public profile is missing.

This is a client-side social prototype. For strict anti-abuse moderation and server-verified stats, add Cloud Functions later.
