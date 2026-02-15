#!/bin/sh
set -e

# Ensure database directory exists and is owned by appuser
mkdir -p /app/database
chown -R appuser:appgroup /app/database

# Drop to non-root user and exec the command
exec su-exec appuser "$@"
