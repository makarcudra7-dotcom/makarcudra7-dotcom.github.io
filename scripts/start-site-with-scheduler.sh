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
    started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    if node /srv/scripts/publish-scheduled.js; then
      echo "[runtime-scheduler] ${started_at} queue check ok"
    else
      code=$?
      echo "[runtime-scheduler] ${started_at} queue check failed (exit=${code})" >&2
    fi
    sleep "$INTERVAL"
  done
) &

echo "[web] starting Caddy on port ${PORT:-8080}"
exec caddy run --config /srv/Caddyfile --adapter caddyfile
