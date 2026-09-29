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
    node /srv/scripts/publish-scheduled.js || {
      code=$?
      echo "[runtime-scheduler] $(date -u +%Y-%m-%dT%H:%M:%SZ) queue check failed (exit=${code})" >&2
    }
    sleep "$INTERVAL"
  done
) &

echo "[web] starting Caddy on port ${PORT:-8080}"
exec caddy run --config /srv/Caddyfile --adapter caddyfile
