# Human Skills Tester - mobile room reliability release

## Main repairs
- Room membership is no longer deleted during normal iOS page navigation.
- Disconnects now mark players offline while preserving their room slot.
- Battle pages can restore a recently joined player slot using the saved room ID.
- Authentication and profile setup preserve room invitation destinations.
- Only one atomic room transaction schedules a match.
- Both devices count down to the same server-adjusted `startAt` time.
- Public matchmaking and room joins use transactions to reduce race conditions.
- Added reconnect status, player presence, clearer errors, mobile typing controls, and match progress UI.

## Deploy
1. Replace all existing site files.
2. Run `firebase deploy --only firestore:rules,database`.
3. Hard refresh or remove/reinstall the PWA because this build uses cache `hst-v4-mobile`.
4. Test using two different signed-in accounts.
