# Wave Dash v39 fixes

- Fixed duplicate Firebase default-app initialization that could stop the game at startup.
- Fixed multiplayer identity lookup so private rooms use the active Firebase user directly.
- Fixed keyboard controls firing while typing in login and room fields.
- Paused gameplay safely while login or room dialogs are open.
- Fixed stale devices reducing cloud-synced points during profile merges.
- Fixed shared multiplayer pickups briefly appearing at the wrong position when catching up.
- Added authenticated-user guards for creating and joining rooms.
- Added hidden-tab input cleanup to prevent stuck flight controls.
- Improved responsive canvas sizing, keyboard focus visibility, and reduced-motion support.
- Removed a duplicate Google credential callback declaration.


