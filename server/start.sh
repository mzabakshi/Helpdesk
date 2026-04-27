#!/bin/sh
set -e

echo "Running database migrations..."
bun run prisma migrate deploy

echo "Starting server..."
exec bun src/index.ts
