# pieces-babysitter

Watchdog for Pieces OS. Monitors the process, restarts it if it crashes,
and sends macOS notifications on state changes.

Runs as a persistent launchd agent (`KeepAlive: true`).

## Files

- `bin/pieces_babysitter.py` — the watchdog script
- `launchd/com.pieces.babysitter.plist` — launchd agent definition

## Logs

```
~/Library/Logs/PiecesOS/babysitter.stdout.log
~/Library/Logs/PiecesOS/babysitter.stderr.log
```

## Notes

On a new machine, Pieces OS and its agents must be installed first.
Download from https://pieces.app before running the helpers installer.
