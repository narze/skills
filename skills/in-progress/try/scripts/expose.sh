#!/usr/bin/env bash
# Expose a local port on the tailnet (tailnet only, never funnel).
#   expose.sh <port>       serve http://127.0.0.1:<port> at https://<host>:<port>
#   expose.sh <port> off   stop serving it
#   expose.sh status       list what is served
set -euo pipefail

case "${1:-}" in
  ""|-h|--help) sed -n '2,5p' "$0"; exit 1 ;;
  status) exec tailscale serve status ;;
esac

port="$1"
case "$port" in
  ''|*[!0-9]*) echo "port must be a number: $port" >&2; exit 1 ;;
esac
if [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
  echo "port out of range: $port" >&2; exit 1
fi
host=$(tailscale status --json | python3 -c 'import json,sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')

if [ "${2:-}" = off ]; then
  tailscale serve --https="$port" off
  echo "stopped https://$host:$port"
  exit 0
fi

if tailscale serve status 2>/dev/null | grep -q "^https://$host:$port "; then
  echo "port $port is already served; pick another or run: $0 $port off" >&2
  exit 1
fi

# Only expose a port that something already serves on loopback, so a typo
# cannot publish a port that a later process (or a stranger) takes over.
if ! (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
  echo "nothing listens on 127.0.0.1:$port; start the server first" >&2
  exit 1
fi

tailscale serve --bg --https="$port" "http://127.0.0.1:$port" >/dev/null
echo "https://$host:$port"
