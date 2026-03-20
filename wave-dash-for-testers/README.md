# Wave Dash

Small browser game inspired by Space Waves, with optional Google sign-in, progression points, and Firestore sync.

## Run

Serve the folder locally (recommended for Firebase auth):

```powershell
cd "c:\Users\johart2030\Documents\Ripoff Space Waves"
py -m http.server 8080
```

Then open `http://localhost:8080`.

## Firebase Login Setup

1. Create a Firebase project.
2. Enable **Authentication > Sign-in method > Google** and **Email/Password**.
3. Add `localhost` to **Authentication > Settings > Authorized domains**.
4. Confirm your config in `firebase-config.js`.
5. Reload the page and use the **Login** button at the top-right of the game to sign up/log in with email or Google.

You can always play as guest without signing in.

## Data Behavior

- Guest players: progress is stored locally in `localStorage`.
- Signed-in players: profile auto-syncs to Firestore document `players/{uid}`.
- On sign-in, local and cloud profiles are merged, then saved back to both local and Firestore.
- You can disable cloud sync by setting `enableCloudSave = false` in `firebase-config.js`.

## Progression

- Each run converts score to points.
- Use points in the in-game Garage to buy/equip sprites, trails, and colors.
- Starter trail is a solid line by default.
