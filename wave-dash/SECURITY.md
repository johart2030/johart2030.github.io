# Security Notes

Frontend hardening was applied in code, but Firebase security still depends on server-side rules and console settings.

## Required Firebase Console Follow-Up

1. Enable Firebase App Check for Authentication, Firestore, and Realtime Database.
2. Restrict Authentication authorized domains to the exact production hosts you use.
3. Use Firestore and Realtime Database rules that only allow a signed-in user to write their own profile/player state.
4. Do not allow clients to overwrite global leaderboard scores for other users.
5. Restrict room ownership updates so only the room owner can start/reset a private room.

## Firestore Rule Shape

```text
match /players/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

match /leaderboard/{userId} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

## Realtime Database Rule Shape

```text
rooms: {
  "$roomId": {
    ".read": true,
    "players": {
      "$playerId": {
        ".write": "auth != null && auth.uid === $playerId"
      }
    }
  }
}
```

Adjust guest/public-room behavior carefully if you intentionally allow anonymous multiplayer IDs.
