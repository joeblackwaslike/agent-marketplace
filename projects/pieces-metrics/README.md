# pieces-metrics

Collects runtime metrics from Pieces OS (CPU, memory, uptime) and writes
them to a local SQLite database for trend analysis.

Runs as a persistent launchd agent (`KeepAlive: true`).

## Files

- `bin/pieces_metrics.py` — the metrics collector
- `launchd/com.pieces.metrics.plist` — launchd agent definition

## Logs

```
~/Library/Logs/PiecesOS/metrics.stdout.log
~/Library/Logs/PiecesOS/metrics.stderr.log
```
