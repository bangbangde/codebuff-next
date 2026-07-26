#!/bin/sh
set -eu

image_lockfile="/opt/codebuff/pnpm-lock.yaml"
project_lockfile="/app/pnpm-lock.yaml"
source_modules="/opt/codebuff/node_modules"
target_modules="/app/node_modules"
lock_marker="$target_modules/.codebuff-lock-sha256"

if ! cmp -s "$image_lockfile" "$project_lockfile"; then
  echo "The development image is stale; rebuild it after changing pnpm-lock.yaml" >&2
  exit 1
fi

lock_hash="$(sha256sum "$image_lockfile" | cut -d ' ' -f 1)"
installed_hash="$(cat "$lock_marker" 2>/dev/null || true)"

if [ "$installed_hash" != "$lock_hash" ]; then
  echo "Synchronizing container dependencies..."
  mkdir -p "$target_modules"
  find "$target_modules" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} \;
  cp -a "$source_modules"/. "$target_modules"/
  printf '%s\n' "$lock_hash" > "$lock_marker"
fi

exec "$@"
