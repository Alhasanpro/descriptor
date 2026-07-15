#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-run}"
APP_NAME="Descriptor"
LEGACY_APP_NAME="Descripter"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${DESCRIPTOR_DESKTOP_OUTPUT:-${DESCRIPTER_DESKTOP_OUTPUT:-$ROOT_DIR/dist}}"

osascript -e "tell application \"$APP_NAME\" to quit" >/dev/null 2>&1 || true
pkill -x "$APP_NAME" >/dev/null 2>&1 || true
osascript -e "tell application \"$LEGACY_APP_NAME\" to quit" >/dev/null 2>&1 || true
pkill -x "$LEGACY_APP_NAME" >/dev/null 2>&1 || true

cd "$ROOT_DIR"
npm run desktop:package

APP_BUNDLE="$(find "$OUTPUT_DIR" -maxdepth 3 -type d -name "$APP_NAME.app" -print -quit)"
if [[ -z "$APP_BUNDLE" ]]; then
  echo "Descriptor.app was not created in $OUTPUT_DIR" >&2
  exit 1
fi
APP_BINARY="$APP_BUNDLE/Contents/MacOS/$APP_NAME"

open_app() {
  node "$ROOT_DIR/desktop/launch-app.mjs" "$APP_BINARY"
}

case "$MODE" in
  run)
    open_app
    ;;
  --debug|debug)
    lldb -- "$APP_BINARY"
    ;;
  --logs|logs)
    open_app
    /usr/bin/log stream --info --style compact --predicate "process == \"$APP_NAME\""
    ;;
  --telemetry|telemetry)
    open_app
    /usr/bin/log stream --info --style compact --predicate 'process == "Descriptor" OR process == "Descriptor Helper"'
    ;;
  --verify|verify)
    open_app
    for _ in {1..30}; do
      if pgrep -x "$APP_NAME" >/dev/null; then
        echo "$APP_NAME is running from $APP_BUNDLE"
        exit 0
      fi
      sleep 1
    done
    echo "$APP_NAME did not stay running" >&2
    exit 1
    ;;
  *)
    echo "usage: $0 [run|--debug|--logs|--telemetry|--verify]" >&2
    exit 2
    ;;
esac
