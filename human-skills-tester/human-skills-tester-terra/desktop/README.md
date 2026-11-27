# Human Skills Tester Terra Desktop

This Electron project packages a persistent desktop shell for the deployed
Terra web app. It deliberately uses the live site instead of duplicating game
code, so the desktop app uses the same Firebase project, accounts, scores,
multiplayer rooms, and game behavior as the browser version. The shell keeps
its pill navigation mounted and caches visited sections so switching between
Home, Multiplayer, Friends, Leaderboard, Settings, and Admin does not reload
those sections.

## Local test

From this directory, run:

```powershell
npm install
npm start
```

## Build an installer locally

```powershell
npm run dist
```

The Windows installer is written to `release/`. Building macOS installers must
run on macOS, and the GitHub Actions workflow builds each platform on its own
runner.

## Release build

Push a tag that matches the app version, such as `v1.0.3`. The repository workflow at
`.github/workflows/release-desktop.yml` builds Windows, macOS, and Linux
installers and attaches them to the matching GitHub Release.

GitHub Releases are the download location for executables. GitHub Packages is
for package registries such as npm, Maven, NuGet, and containers, rather than
end-user `.exe` installers.
