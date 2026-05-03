#!/usr/bin/env bash
set -euo pipefail

VIDEO_DIR="Development_data/lobbies-optimized"
POSTER_DIR="Development_data/lobby-posters"
HEIGHT="540"
POSTER_EXT=".jpg"
FORCE="0"
TEMP_POSTER=""

cleanup() {
  if [[ -n "$TEMP_POSTER" ]]; then
    rm -f "$TEMP_POSTER"
  fi
}
trap cleanup EXIT INT TERM

while [[ $# -gt 0 ]]; do
  case "$1" in
    --video-dir) VIDEO_DIR="$2"; shift 2 ;;
    --poster-dir) POSTER_DIR="$2"; shift 2 ;;
    --height) HEIGHT="$2"; shift 2 ;;
    --poster-ext) POSTER_EXT="$2"; shift 2 ;;
    --force) FORCE="1"; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

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

mkdir -p "$POSTER_DIR"

VIDEOS=()
while IFS= read -r VIDEO; do
  VIDEOS+=("$VIDEO")
done < <(find "$VIDEO_DIR" -maxdepth 1 -type f -iname '*.mp4' ! -iname '*.tmp.mp4' | sort)
TOTAL="${#VIDEOS[@]}"
INDEX="0"

echo "Generating $TOTAL final-frame posters"
echo "  videos:  $VIDEO_DIR"
echo "  posters: $POSTER_DIR"

for VIDEO in "${VIDEOS[@]}"; do
  INDEX="$((INDEX + 1))"
  NAME="$(basename "$VIDEO")"
  BASENAME="${NAME%.*}"
  POSTER="$POSTER_DIR/$BASENAME$POSTER_EXT"
  TEMP_POSTER="$POSTER.tmp$POSTER_EXT"

  echo "[$INDEX/$TOTAL] $NAME"

  if [[ "$FORCE" != "1" && -f "$POSTER" ]]; then
    echo "  final-frame poster exists; skipping"
    continue
  fi

  rm -f "$TEMP_POSTER"

  ffmpeg -hide_banner -loglevel error -y \
    -sseof -0.08 -i "$VIDEO" \
    -frames:v 1 -vf "scale=-2:$HEIGHT" \
    "$TEMP_POSTER"

  mv "$TEMP_POSTER" "$POSTER"
  TEMP_POSTER=""
done

echo "Done. Generated $TOTAL ${POSTER_EXT#.} posters."
