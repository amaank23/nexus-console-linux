#!/bin/sh
# Read-only prerequisite check. Installs nothing and never invokes sudo.
set -u

case "${1:---check}" in
  --check) ;;
  *) printf 'Usage: sh scripts/setup-linux.sh [--check]\n' >&2; exit 2 ;;
esac
if [ "$(uname -s)" != Linux ]; then
  printf 'This check is for Linux. Use scripts/setup.sh on macOS.\n' >&2
  exit 2
fi

missing=0
check_command() {
  if command -v "$1" >/dev/null 2>&1; then
    printf 'OK: %s\n' "$1"
  else
    printf 'Missing: %s\n' "$1"
    missing=$((missing + 1))
  fi
}
for tool in npm cargo rustc pkg-config cc lsof; do check_command "$tool"; done
if command -v node >/dev/null 2>&1 &&
  node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 12) ? 0 : 1)'; then
  printf 'OK: Node %s\n' "$(node --version)"
else
  printf 'Missing: Node >= 22.12 (activate a compatible Node version)\n'
  missing=$((missing + 1))
fi
for library in webkit2gtk-4.1 gtk+-3.0 ayatana-appindicator3-0.1 librsvg-2.0 openssl; do
  if pkg-config --exists "$library" 2>/dev/null; then
    printf 'OK: %s\n' "$library"
  else
    printf 'Missing: %s development files\n' "$library"
    missing=$((missing + 1))
  fi
done
if [ "$missing" -ne 0 ]; then
  printf '\nUbuntu/Pop!_OS build dependencies (run explicitly):\n'
  printf 'sudo apt-get update\n'
  printf 'sudo apt-get install build-essential pkg-config libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev libxdo-dev libssl-dev librsvg2-dev lsof\n'
  printf '\nActivate Node >= 22.12 and Rust, then rerun this check. Nothing was installed.\n'
  exit 1
fi
printf '\nPrerequisites found. Next: npm ci, then npm start.\n'
