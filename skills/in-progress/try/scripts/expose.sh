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

tailscale serve --bg --https="$port" "http://127.0.0.1:$port" >/dev/null
echo "https://$host:$port"
