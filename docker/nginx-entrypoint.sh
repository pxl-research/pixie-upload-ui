#!/bin/sh
set -eu

CONFIG_PATH="${PIXIE_ENV_CONFIG_PATH:-/usr/share/nginx/html/env-config.js}"
RUNTIME_ENV_FILE_DEFAULT="/usr/share/nginx/html/.env"
RUNTIME_ENV_FILE="${PIXIE_ENV_FILE:-$RUNTIME_ENV_FILE_DEFAULT}"
DEFAULT_NGINX_CONF="/etc/nginx/conf.d/default.conf"
INJECT_KEYS="TABULAR_API_KEY RAG_API_KEY LOG_LEVEL ENABLED_BACKENDS TABULAR_API_BASE_URL RAG_API_BASE_URL TABULAR_PROXY_TARGET RAG_PROXY_TARGET"

ENABLED_BACKENDS="${ENABLED_BACKENDS:-both}"
TABULAR_PROXY_TARGET="${TABULAR_PROXY_TARGET:-http://informer-api:8000/}"
RAG_PROXY_TARGET="${RAG_PROXY_TARGET:-http://rag-api:8000/}"

case "$TABULAR_PROXY_TARGET" in
  */) ;;
  *) TABULAR_PROXY_TARGET="${TABULAR_PROXY_TARGET}/" ;;
esac

case "$RAG_PROXY_TARGET" in
  */) ;;
  *) RAG_PROXY_TARGET="${RAG_PROXY_TARGET}/" ;;
esac

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
  case " $INJECT_KEYS " in
    *" $name "*)
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
  echo "⚠ WARNING: No runtime environment variables found for Pixie Upload UI!"
  echo "  Expected one of: $INJECT_KEYS"
else
  echo "✓ Generated $CONFIG_PATH with $FOUND_VARS variables"
fi

# Generate nginx config with optional proxies per backend
NGINX_TMP="$(mktemp)"
cat >"$NGINX_TMP" <<EOF
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Increase limits/timeouts for large uploads and long-running upstream work
    client_max_body_size 200m;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;

    resolver 127.0.0.11 ipv6=off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Disable caching for env-config.js (CRITICAL for runtime env injection!)
    location = /env-config.js {
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        add_header Pragma "no-cache";
        add_header Expires "0";
        try_files \$uri =404;
    }
EOF

if [ "$ENABLED_BACKENDS" = "both" ] || [ "$ENABLED_BACKENDS" = "tabular" ]; then
  cat >>"$NGINX_TMP" <<EOF

    # Proxy tabular API
    location /tabular/ {
        rewrite ^/tabular/(.*)$ /\$1 break;
        proxy_pass ${TABULAR_PROXY_TARGET};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
EOF
fi

if [ "$ENABLED_BACKENDS" = "both" ] || [ "$ENABLED_BACKENDS" = "rag" ]; then
  cat >>"$NGINX_TMP" <<EOF

    # Proxy RAG API
    location /rag/ {
        rewrite ^/rag/(.*)$ /\$1 break;
        proxy_pass ${RAG_PROXY_TARGET};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
EOF
fi

cat >>"$NGINX_TMP" <<'EOF'

    # SPA fallback - serve index.html for all non-file requests
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Disable access to hidden files
    location ~ /\. {
        deny all;
    }
}
EOF

install -m 644 "$NGINX_TMP" "$DEFAULT_NGINX_CONF"
rm -f "$NGINX_TMP"

echo "=== Starting Nginx ==="
echo ""

# Start nginx
exec "$@"
