#!/bin/zsh

set -euo pipefail

TCCUTIL="/usr/bin/tccutil"
SUPPORT_DIR="${HOME}/Library/Application Support/Toolify"
SPEECH_CACHE="${SUPPORT_DIR}/.speech-recognition-granted"

SERVICES=(
  Accessibility
  Microphone
  SpeechRecognition
)

APP_BUNDLE_IDS=(
  com.toolify.app
  com.toolify.apple-stt
)

DEV_HOST_BUNDLE_IDS=(
  com.apple.Terminal
  com.googlecode.iterm2
  com.mitchellh.ghostty
)

INCLUDE_DEV_HOSTS=0
RESET_GLOBAL=0

for arg in "$@"; do
  case "$arg" in
    --include-dev-hosts)
      INCLUDE_DEV_HOSTS=1
      ;;
    --global)
      RESET_GLOBAL=1
      ;;
    --help|-h)
      cat <<'EOF'
Usage: ./scripts/reset-macos-permissions.sh [--include-dev-hosts] [--global]

Options:
  --include-dev-hosts  Also reset Terminal/iTerm/Ghostty permissions.
  --global             Reset the service for every app on this Mac.

Examples:
  ./scripts/reset-macos-permissions.sh
  ./scripts/reset-macos-permissions.sh --include-dev-hosts
  ./scripts/reset-macos-permissions.sh --global
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

if [[ ! -x "$TCCUTIL" ]]; then
  echo "tccutil not found at $TCCUTIL" >&2
  exit 1
fi

echo "Closing cached Toolify speech permission state"
rm -f "$SPEECH_CACHE"

if [[ "$RESET_GLOBAL" -eq 1 ]]; then
  echo "Resetting permissions globally"
  for service in "${SERVICES[@]}"; do
    "$TCCUTIL" reset "$service" || true
  done
else
  BUNDLE_IDS=("${APP_BUNDLE_IDS[@]}")

  if [[ "$INCLUDE_DEV_HOSTS" -eq 1 ]]; then
    BUNDLE_IDS+=("${DEV_HOST_BUNDLE_IDS[@]}")
  fi

  for service in "${SERVICES[@]}"; do
    for bundle_id in "${BUNDLE_IDS[@]}"; do
      echo "Resetting ${service} for ${bundle_id}"
      "$TCCUTIL" reset "$service" "$bundle_id" || true
    done
  done
fi

echo "Done."
echo "Next:"
echo "1. Quit Toolify completely."
echo "2. Reopen the app from /Applications/Toolify.app."
echo "3. Re-request Microphone, Accessibility and Speech Recognition."
