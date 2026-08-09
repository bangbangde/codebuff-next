#!/bin/sh
set -eu

garage_bin="${GARAGE_BIN:-garage}"
runtime_access_key_id="${GARAGE_RUNTIME_ACCESS_KEY_ID:?GARAGE_RUNTIME_ACCESS_KEY_ID is required}"
runtime_secret_access_key="${GARAGE_RUNTIME_SECRET_ACCESS_KEY:?GARAGE_RUNTIME_SECRET_ACCESS_KEY is required}"
runtime_key_name="${GARAGE_RUNTIME_KEY_NAME:-codebuff-runtime}"
required_buckets="${GARAGE_REQUIRED_BUCKETS:?GARAGE_REQUIRED_BUCKETS is required}"

garage_admin() {
  if [ -n "${GARAGE_CONFIG_FILE:-}" ]; then
    "$garage_bin" -c "$GARAGE_CONFIG_FILE" "$@"
  else
    "$garage_bin" "$@"
  fi
}

if garage_admin key info "$runtime_access_key_id" >/dev/null 2>&1; then
  echo "Garage runtime key is already configured"
else
  garage_admin key import \
    --yes \
    -n "$runtime_key_name" \
    "$runtime_access_key_id" \
    "$runtime_secret_access_key" >/dev/null
  echo "Garage runtime key imported"
fi

# Runtime credentials must never be able to provision additional buckets.
garage_admin key deny --create-bucket "$runtime_access_key_id" >/dev/null

printf '%s\n' "$required_buckets" | tr ',' '\n' | while IFS= read -r bucket; do
  if [ -z "$bucket" ]; then
    continue
  fi

  if garage_admin bucket info "$bucket" >/dev/null 2>&1; then
    echo "Garage bucket $bucket is already configured"
  else
    garage_admin bucket create "$bucket" >/dev/null
    echo "Garage bucket $bucket created"
  fi

  garage_admin bucket allow \
    --read \
    --write \
    "$bucket" \
    --key "$runtime_access_key_id" >/dev/null
  garage_admin bucket deny \
    --owner \
    "$bucket" \
    --key "$runtime_access_key_id" >/dev/null
  echo "Garage runtime permissions reconciled for $bucket"
done
