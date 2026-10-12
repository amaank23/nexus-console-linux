#!/bin/sh
set -eu
case "$(uname -s)" in
  Linux) exec sh "$(dirname "$0")/setup-linux.sh" "$@" ;;
  Darwin) exec sh "$(dirname "$0")/setup.sh" "$@" ;;
  *) printf 'Setup supports Linux and macOS only.\n' >&2; exit 2 ;;
esac
