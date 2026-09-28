# Wave Dash v40 improvements

- Copied the stable v39 release into this game folder.
- Kept the public leaderboard visible for guest players.
- Added pause/resume for solo runs (P or Escape), without risking multiplayer desync.
- Made keyboard controls work after clicking UI buttons while continuing to ignore typing fields.
- Made touch controls more reliable with pointer capture and blocked accidental right-click input.
- Protected local preferences and progress against unavailable storage, malformed values, and non-finite scores.
- Validated imported level data and limited custom levels to 80 obstacles so malformed JSON cannot break a run.
- Corrected the room-list separator encoding and bumped the displayed version to v40.
