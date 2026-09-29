#!/bin/sh
set -u

INTERVAL="${PV_SCHEDULER_INTERVAL_SECONDS:-15}"

case "$INTERVAL" in
  ''|*[!0-9]*) INTERVAL=15 ;;
esac

if [ "$INTERVAL" -lt 5 ]; then
  INTERVAL=5
fi

echo "[runtime-scheduler] starting; interval=${INTERVAL}s"

(
  while true; do
    if node /srv/scripts/sync-runtime-queue.js; then
      node /srv/scripts/publish-scheduled.js || {
        code=$?
        echo "[runtime-scheduler] $(date -u +%Y-%m-%dT%H:%M:%SZ) publish check failed (exit=${code})" >&2
      }
    else
      code=$?
      echo "[runtime-scheduler] $(date -u +%Y-%m-%dT%H:%M:%SZ) queue refresh failed (exit=${code}); publish check skipped" >&2
    fi
    sleep "$INTERVAL"
  done
) &

echo "[web] starting Caddy on port ${PORT:-8080}"
exec caddy run --config /srv/Caddyfile --adapter caddyfile
