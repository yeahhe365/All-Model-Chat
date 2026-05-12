#!/bin/sh
set -eu

to_bool() {
  normalized="$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')"

  case "$normalized" in
    1|true|yes|on)
      printf 'true'
      ;;
    0|false|no|off)
      printf 'false'
      ;;
    *)
      printf 'false'
      ;;
  esac
}

trim_value() {
  printf '%s' "${1:-}" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
}

json_string_or_null() {
  value="$(trim_value "${1:-}")"
  if [ -z "$value" ]; then
    printf 'null'
    return
  fi

  escaped="$(printf '%s' "$value" | sed 's/\\/\\\\/g; s/"/\\"/g')"
  printf '"%s"' "$escaped"
}

server_managed_api="$(to_bool "${RUNTIME_SERVER_MANAGED_API:-false}")"
use_custom_api_config="$(to_bool "${RUNTIME_USE_CUSTOM_API_CONFIG:-true}")"
use_api_proxy="$(to_bool "${RUNTIME_USE_API_PROXY:-true}")"
api_proxy_url_json="$(json_string_or_null "${RUNTIME_API_PROXY_URL:-/api/gemini}")"
pyodide_base_url_json="$(json_string_or_null "${RUNTIME_PYODIDE_BASE_URL:-}")"

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__AMC_RUNTIME_CONFIG__ = {
  ...(window.__AMC_RUNTIME_CONFIG__ || {}),
  serverManagedApi: ${server_managed_api},
  useCustomApiConfig: ${use_custom_api_config},
  useApiProxy: ${use_api_proxy},
  apiProxyUrl: ${api_proxy_url_json},
  pyodideBaseUrl: ${pyodide_base_url_json},
};
EOF
