#!/usr/bin/env bash
set -euo pipefail

VIDEO_DIR="Development_data/lobbies-optimized"
POSTER_DIR="Development_data/lobby-posters"
HEIGHT="720"
FORCE="0"
VIDEO_NAME=""
TIMESTAMP_SECONDS=""
TEMP_POSTER=""

cleanup() {
  if [[ -n "$TEMP_POSTER" ]]; then
    rm -f "$TEMP_POSTER"
  fi
}
trap cleanup EXIT INT TERM

usage() {
  echo "Usage: $0 --video-name <file.mp4> --seconds <seconds> [--force] [--height 720]" >&2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --video-name) VIDEO_NAME="$2"; shift 2 ;;
    --seconds) TIMESTAMP_SECONDS="$2"; shift 2 ;;
    --video-dir) VIDEO_DIR="$2"; shift 2 ;;
    --poster-dir) POSTER_DIR="$2"; shift 2 ;;
    --height) HEIGHT="$2"; shift 2 ;;
    --force) FORCE="1"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "$VIDEO_NAME" || -z "$TIMESTAMP_SECONDS" ]]; then
  usage
  exit 1
fi

if [[ "$VIDEO_NAME" == */* || "$VIDEO_NAME" == *\\* ]]; then
  echo "Video name must be a file name inside the video directory, not a path." >&2
  exit 1
fi

if ! [[ "$TIMESTAMP_SECONDS" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
  echo "Seconds must be 0 or greater, for example: 12 or 12.5" >&2
  exit 1
fi

if [[ "$VIDEO_NAME" != *.* ]]; then
  VIDEO_NAME="$VIDEO_NAME.mp4"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

[[ "$VIDEO_DIR" = /* ]] || VIDEO_DIR="$PROJECT_ROOT/$VIDEO_DIR"
[[ "$POSTER_DIR" = /* ]] || POSTER_DIR="$PROJECT_ROOT/$POSTER_DIR"

command -v ffmpeg >/dev/null 2>&1 || {
  echo "ffmpeg was not found in PATH. Install it with: brew install ffmpeg" >&2
  exit 1
}

if [[ ! -d "$VIDEO_DIR" ]]; then
  echo "Video directory was not found: $VIDEO_DIR" >&2
  exit 1
fi

VIDEO="$VIDEO_DIR/$VIDEO_NAME"
if [[ ! -f "$VIDEO" ]]; then
  echo "Video was not found: $VIDEO" >&2
  exit 1
fi

mkdir -p "$POSTER_DIR"

BASENAME="$(basename "$VIDEO_NAME")"
BASENAME="${BASENAME%.*}"
POSTER="$POSTER_DIR/$BASENAME.jpg"
TEMP_POSTER="$POSTER.tmp.jpg"

if [[ "$FORCE" != "1" && -f "$POSTER" ]]; then
  echo "Poster already exists: $POSTER. Re-run with --force to overwrite it." >&2
  exit 1
fi

rm -f "$TEMP_POSTER"

echo "Generating poster"
echo "  video:   $VIDEO"
echo "  seconds: $TIMESTAMP_SECONDS"
echo "  poster:  $POSTER"

ffmpeg -hide_banner -loglevel error -y \
  -i "$VIDEO" -ss "$TIMESTAMP_SECONDS" \
  -frames:v 1 -vf "scale=-2:$HEIGHT" \
  "$TEMP_POSTER"

mv "$TEMP_POSTER" "$POSTER"
TEMP_POSTER=""
echo "Done."
