#!/bin/bash
# Allow connections from host (Docker gateway) for integration tests
# Runs on first DB init only. Use trust for dev/test to avoid md5/scram mismatch.
LINES=(
  "host all all 0.0.0.0/0 trust"
  "host all all ::/0 trust"
  "hostssl all all 0.0.0.0/0 trust"
  "hostssl all all ::/0 trust"
)

for LINE in "${LINES[@]}"; do
  if ! grep -qF "$LINE" "$PGDATA/pg_hba.conf"; then
    tmp="$(mktemp)"
    {
      echo "$LINE"
      cat "$PGDATA/pg_hba.conf"
    } > "$tmp"
    cat "$tmp" > "$PGDATA/pg_hba.conf"
    rm -f "$tmp"
  fi
done
