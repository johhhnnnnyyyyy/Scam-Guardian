#!/usr/bin/env bash
# One command for everything that can be checked without real phones:
#   1. build the interface   2. unit + integration tests   3. text accuracy report
#   4. start a temporary server and run the end-to-end smoke test against it
#
#   bash scripts/test-all.sh                 # everything, on a temporary port
#   bash scripts/test-all.sh --heldout       # also the blind held-out accuracy set
#   bash scripts/test-all.sh --url https://your-name.trycloudflare.com   # smoke test your running server/tunnel instead
#
# The temporary server uses your .env (keys), but its own port, no DATA_DIR, and a relaxed session limit.
set -uo pipefail
cd "$(dirname "$0")/.."

URL=""; HELDOUT=""
while [ $# -gt 0 ]; do case "$1" in --url) URL="$2"; shift 2;; --heldout) HELDOUT="-- --heldout"; shift;; *) echo "unknown option $1"; exit 2;; esac; done

declare -a SUMMARY=()
step() { echo; echo "━━━ $1 ━━━"; }
result() { if [ "$2" -eq 0 ]; then SUMMARY+=("PASS  $1"); else SUMMARY+=("FAIL  $1"); fi; }

step "1/4 Build the interface"
npm run build --silent; result "interface build" $?

step "2/4 Unit and integration tests"
npm test --silent 2>&1 | tail -n 12; result "unit + integration tests" "${PIPESTATUS[0]}"

step "3/4 Detection accuracy (synthetic text)"
eval npm run evaluate --silent $HELDOUT 2>&1 | tail -n 40; result "accuracy report" "${PIPESTATUS[0]}"

step "4/4 End-to-end smoke test"
if [ -n "$URL" ]; then
 node scripts/smoke.mjs "$URL"; result "smoke test ($URL)" $?
else
 PORT_TEST="${PORT_TEST:-3999}"
 LOG="$(mktemp)"
 # A missing LLM key would stop the server, so fall back to rules-only for this local run and say so.
 EXTRA=""; if ! grep -qE '^LLM_API_KEY=.+' .env 2>/dev/null; then EXTRA="ALLOW_RULES_ONLY=1"; echo "(no LLM key in .env: temporary server runs rules-only)"; fi
 env $EXTRA PORT="$PORT_TEST" HOST=127.0.0.1 DATA_DIR= PUBLIC_ORIGIN= SECURE_COOKIES=0 ALLOWED_HOSTS=127.0.0.1,localhost LIMIT_SESSION_CREATE=200/3600 \
  node --env-file-if-exists=.env src/server.js >"$LOG" 2>&1 &
 PID=$!
 trap 'kill $PID 2>/dev/null' EXIT
 for _ in $(seq 1 50); do curl -fs "http://127.0.0.1:$PORT_TEST/api/health" >/dev/null 2>&1 && break; sleep 0.2; done
 node scripts/smoke.mjs "http://127.0.0.1:$PORT_TEST"; result "smoke test (temporary server)" $?
 kill $PID 2>/dev/null; wait $PID 2>/dev/null
 grep -iE "error|refuses" "$LOG" | head -5; rm -f "$LOG"
fi

echo; echo "━━━ Summary ━━━"
FAILED=0; for line in "${SUMMARY[@]}"; do echo "$line"; [[ $line == FAIL* ]] && FAILED=1; done
echo; echo "Not covered here (needs real devices and people). Live speech path: scripts/live-audio.mjs."
exit $FAILED
