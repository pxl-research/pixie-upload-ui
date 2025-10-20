#!/bin/sh
set -eu

CONFIG_PATH="${PIXIE_ENV_CONFIG_PATH:-/usr/share/nginx/html/env-config.js}"
RUNTIME_ENV_FILE_DEFAULT="/usr/share/nginx/html/.env"
RUNTIME_ENV_FILE="${PIXIE_ENV_FILE:-$RUNTIME_ENV_FILE_DEFAULT}"

echo "=== Pixie Upload UI - Runtime Environment Configuration ==="

# Load runtime .env if present
if [ -f "$RUNTIME_ENV_FILE" ]; then
  echo "✓ Loading environment from: $RUNTIME_ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  . "$RUNTIME_ENV_FILE"
  set +a
else
  echo "ℹ No runtime .env file found at: $RUNTIME_ENV_FILE"
  echo "  Using environment variables passed to the container"
fi

TMP_PATH="$(mktemp)"

{
  echo 'window.__PIXIE_UPLOAD_UI_ENV__ = Object.assign('
  echo '  window.__PIXIE_UPLOAD_UI_ENV__ || {},'
  echo '  {'
} >"$TMP_PATH"

ENV_DUMP="$(mktemp)"
env | LC_ALL=C sort >"$ENV_DUMP"

FOUND_VARS=0
while IFS='=' read -r name value; do
  case "$name" in
    VITE_*)
      escaped_value=$(printf '%s' "$value" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')
      printf '    %s: "%s",\n' "$name" "$escaped_value" >>"$TMP_PATH"
      echo "  ✓ Injected: $name"
      FOUND_VARS=$((FOUND_VARS + 1))
      ;;
  esac
done <"$ENV_DUMP"
rm -f "$ENV_DUMP"

{
  echo '  }'
  echo ');'
} >>"$TMP_PATH"

install -m 644 "$TMP_PATH" "$CONFIG_PATH"
rm -f "$TMP_PATH"

if [ "$FOUND_VARS" -eq 0 ]; then
  echo "⚠ WARNING: No VITE_* environment variables found!"
  echo "  The application may not work correctly without proper configuration."
else
  echo "✓ Generated $CONFIG_PATH with $FOUND_VARS VITE_* variables"
fi

echo "=== Starting Nginx ==="
echo ""

# Start nginx
exec "$@"
