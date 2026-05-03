#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="Development_data/lobbies"
VIDEO_OUT_DIR="Development_data/lobbies-optimized"
HEIGHT="540"
FPS="24"
CRF="30"
PRESET="slow"
FORCE="0"
TEMP_VIDEO=""

cleanup() {
  if [[ -n "$TEMP_VIDEO" ]]; then
    rm -f "$TEMP_VIDEO"
  fi
}
trap cleanup EXIT INT TERM

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-dir) SOURCE_DIR="$2"; shift 2 ;;
    --video-out-dir) VIDEO_OUT_DIR="$2"; shift 2 ;;
    --height) HEIGHT="$2"; shift 2 ;;
    --fps) FPS="$2"; shift 2 ;;
    --crf) CRF="$2"; shift 2 ;;
    --preset) PRESET="$2"; shift 2 ;;
    --force) FORCE="1"; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

[[ "$SOURCE_DIR" = /* ]] || SOURCE_DIR="$PROJECT_ROOT/$SOURCE_DIR"
[[ "$VIDEO_OUT_DIR" = /* ]] || VIDEO_OUT_DIR="$PROJECT_ROOT/$VIDEO_OUT_DIR"

command -v ffmpeg >/dev/null 2>&1 || {
  echo "ffmpeg was not found in PATH. Install it with: brew install ffmpeg" >&2
  exit 1
}

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Source directory was not found: $SOURCE_DIR" >&2
  exit 1
fi

mkdir -p "$VIDEO_OUT_DIR"

VIDEOS=()
while IFS= read -r VIDEO; do
  VIDEOS+=("$VIDEO")
done < <(find "$SOURCE_DIR" -maxdepth 1 -type f -iname '*.mp4' | sort)
TOTAL="${#VIDEOS[@]}"
INDEX="0"

echo "Optimizing $TOTAL memorial lobby videos"
echo "  source: $SOURCE_DIR"
echo "  output: $VIDEO_OUT_DIR"

for VIDEO in "${VIDEOS[@]}"; do
  INDEX="$((INDEX + 1))"
  NAME="$(basename "$VIDEO")"
  OPTIMIZED="$VIDEO_OUT_DIR/$NAME"
  TEMP_VIDEO="$OPTIMIZED.tmp.mp4"

  echo "[$INDEX/$TOTAL] $NAME"

  if [[ "$FORCE" != "1" && -f "$OPTIMIZED" ]]; then
    echo "  optimized video exists; skipping"
    continue
  fi

  rm -f "$TEMP_VIDEO"

  ffmpeg -hide_banner -loglevel error -y \
    -i "$VIDEO" \
    -vf "scale=-2:$HEIGHT,fps=$FPS" \
    -c:v libx264 -preset "$PRESET" -crf "$CRF" \
    -pix_fmt yuv420p -movflags +faststart -an \
    "$TEMP_VIDEO"

  mv "$TEMP_VIDEO" "$OPTIMIZED"
  TEMP_VIDEO=""
done

echo "Done. Optimized $TOTAL memorial lobby videos."
