#!/bin/bash
# Allow connections from host (Docker gateway) for integration tests
# Runs on first DB init only. Use trust for dev/test to avoid md5/scram mismatch.
echo "host all all 0.0.0.0/0 trust" >> "$PGDATA/pg_hba.conf"
