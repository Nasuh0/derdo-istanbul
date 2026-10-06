#!/bin/sh
# Railway-compatible LiveKit bootstrap.
# Based on the Apache-2.0 gridalpha/livekit-railway wrapper.
set -eu

log() { printf 'derdo-livekit: %s\n' "$*" >&2; }
yesc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }

: "${PORT:=7880}"
CONFIG_DIR=/etc/livekit
CONFIG="$CONFIG_DIR/config.yaml"
mkdir -p "$CONFIG_DIR"

if [ -z "${LIVEKIT_API_KEY:-}" ] || [ -z "${LIVEKIT_API_SECRET:-}" ]; then
  log "FATAL: LIVEKIT_API_KEY and LIVEKIT_API_SECRET are required."
  exit 1
fi

ICE_TCP_PORT=""
NODE_IP=""
BRIDGE_FROM=""
if [ -n "${RAILWAY_TCP_PROXY_DOMAIN:-}" ] && [ -n "${RAILWAY_TCP_PROXY_PORT:-}" ]; then
  ICE_TCP_PORT="$RAILWAY_TCP_PROXY_PORT"
  NODE_IP="${LIVEKIT_NODE_IP:-}"
  if [ -z "$NODE_IP" ]; then
    NODE_IP=$(dig +short +timeout=3 A "$RAILWAY_TCP_PROXY_DOMAIN" 2>/dev/null \
      | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -n 1)
  fi
  if [ -z "$NODE_IP" ]; then
    NODE_IP=$(getent ahostsv4 "$RAILWAY_TCP_PROXY_DOMAIN" 2>/dev/null | awk 'NR==1 {print $1}')
  fi
  if [ -z "$NODE_IP" ]; then
    log "FATAL: cannot resolve Railway TCP proxy IPv4 address."
    exit 1
  fi
  BRIDGE_FROM="${RAILWAY_TCP_APPLICATION_PORT:-7881}"
  log "ICE/TCP advertised as ${NODE_IP}:${ICE_TCP_PORT}"
fi

if [ -n "$ICE_TCP_PORT" ]; then
  RTC_BLOCK=$(printf '%s\n' \
    "  tcp_port: ${ICE_TCP_PORT}" \
    "  force_tcp: true" \
    "  use_external_ip: false" \
    "  node_ip: \"$(yesc "$NODE_IP")\"")
else
  RTC_BLOCK=$(printf '%s\n' \
    "  tcp_port: 7881" \
    "  use_external_ip: true")
fi

REDIS_BLOCK=""
if [ -n "${LIVEKIT_REDIS_HOST:-}" ]; then
  _addr="$LIVEKIT_REDIS_HOST"
  case "$_addr" in
    *:*) : ;;
    *) _addr="${_addr}:${LIVEKIT_REDIS_PORT:-6379}" ;;
  esac
  REDIS_BLOCK="redis:
  address: \"$(yesc "$_addr")\""
  [ -n "${LIVEKIT_REDIS_USERNAME:-}" ] && REDIS_BLOCK="$REDIS_BLOCK
  username: \"$(yesc "$LIVEKIT_REDIS_USERNAME")\""
  [ -n "${LIVEKIT_REDIS_PASSWORD:-}" ] && REDIS_BLOCK="$REDIS_BLOCK
  password: \"$(yesc "$LIVEKIT_REDIS_PASSWORD")\""
fi

{
  echo "port: ${PORT}"
  echo "logging:"
  echo "  level: ${LIVEKIT_LOG_LEVEL:-info}"
  echo "keys:"
  echo "  \"$(yesc "$LIVEKIT_API_KEY")\": \"$(yesc "$LIVEKIT_API_SECRET")\""
  echo "rtc:"
  echo "$RTC_BLOCK"
  echo "room:"
  echo "  auto_create: true"
  echo "  empty_timeout: 300"
  echo "  departure_timeout: 20"
  echo "turn:"
  echo "  enabled: false"
  [ -n "$REDIS_BLOCK" ] && echo "$REDIS_BLOCK"
} > "$CONFIG"
chmod 600 "$CONFIG"

if [ -n "$BRIDGE_FROM" ] && [ "$BRIDGE_FROM" != "$ICE_TCP_PORT" ]; then
  BRIDGE_TO="${LIVEKIT_BRIDGE_TARGET_IP:-}"
  if [ -z "$BRIDGE_TO" ]; then
    BRIDGE_TO=$(hostname -i 2>/dev/null | tr ' ' '\n' \
      | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | grep -v '^127\.' | head -n 1)
  fi
  if [ -z "$BRIDGE_TO" ]; then
    log "FATAL: cannot determine container IPv4 address."
    exit 1
  fi
  log "bridging container :${BRIDGE_FROM} -> ${BRIDGE_TO}:${ICE_TCP_PORT}"
  socat TCP-LISTEN:"$BRIDGE_FROM",fork,reuseaddr \
        TCP:"$BRIDGE_TO":"$ICE_TCP_PORT",retry=5,interval=1 &
fi

exec tini -s -- /livekit-server --config "$CONFIG"
