#!/usr/bin/env bash
# Record a real studio walkthrough (not AI clips) and write the landing demo MP4.
# Requires: running app on :3000, E2E_CLERK_USER_ID + Clerk keys in .env.local
#
#   npx tsx scripts/record-image-demo.ts

set -euo pipefail
cd "$(dirname "$0")/.."
unset PLAYWRIGHT_BROWSERS_PATH
exec npx tsx scripts/record-image-demo.ts
