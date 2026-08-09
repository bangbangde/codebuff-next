#!/bin/sh
set -eu

config_file="${GARAGE_CONFIG_FILE:-/etc/garage/garage.toml}"
config_template_file="${GARAGE_CONFIG_TEMPLATE_FILE:-/etc/garage/garage.template.toml}"
admin_token="${GARAGE_ADMIN_TOKEN:?GARAGE_ADMIN_TOKEN is required}"
ready_file="/tmp/garage-layout-ready"

if [ "${#admin_token}" -ne 64 ] || printf '%s' "$admin_token" | grep -q '[^0-9a-f]'; then
  echo "GARAGE_ADMIN_TOKEN must be a 64-character lowercase hexadecimal value" >&2
  exit 1
fi

sed "s/__GARAGE_ADMIN_TOKEN__/$admin_token/g" "$config_template_file" >"$config_file"
chmod 600 "$config_file"

rm -f "$ready_file"

/garage server &
server_pid=$!

stop_server() {
  kill "$server_pid" 2>/dev/null || true
  wait "$server_pid" 2>/dev/null || true
}

trap stop_server INT TERM EXIT

garage_ready=false
attempt=1
while [ "$attempt" -le 60 ]; do
  if /garage -c "$config_file" status >/dev/null 2>&1; then
    garage_ready=true
    break
  fi

  attempt=$((attempt + 1))
  sleep 1
done

if [ "$garage_ready" != "true" ]; then
  echo "Garage did not become ready in time" >&2
  exit 1
fi

if ! node_output="$(/garage -c "$config_file" node id 2>&1)"; then
  echo "Garage node lookup failed: $node_output" >&2
  exit 1
fi

node_id="$(printf '%s\n' "$node_output" | grep -o '[0-9a-f]\{64\}' | head -n 1 || true)"

if [ -z "$node_id" ]; then
  echo "Garage node lookup returned no node ID" >&2
  exit 1
fi

node_id_prefix="$(printf '%s' "$node_id" | cut -c 1-16)"
layout_output="$(/garage -c "$config_file" layout show 2>/dev/null || true)"

if printf '%s\n' "$layout_output" | grep -q "^${node_id_prefix}[[:space:]]"; then
  echo "Garage layout is already configured"
else
  current_version="$(
    printf '%s\n' "$layout_output" \
      | sed -n 's/^Current cluster layout version: \([0-9][0-9]*\)$/\1/p' \
      | tail -n 1
  )"

  if [ -z "$current_version" ]; then
    echo "Unable to determine the current Garage layout version" >&2
    exit 1
  fi

  next_version=$((current_version + 1))
  /garage -c "$config_file" layout assign "$node_id" -z zone1 -c 1G -t 1G
  /garage -c "$config_file" layout apply --version "$next_version"
  echo "Garage layout version $next_version applied"
fi

touch "$ready_file"
echo "Garage layout and Admin API are ready"

trap - INT TERM EXIT
wait "$server_pid"
