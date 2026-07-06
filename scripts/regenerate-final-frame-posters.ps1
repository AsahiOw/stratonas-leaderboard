param(
  [string]$VideoDir = "Development_data/lobbies-optimized",
  [string]$PosterDir = "Development_data/lobby-posters",
  [int]$Height = 720,
  [string]$FfmpegPath = "",
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not [IO.Path]::IsPathRooted($VideoDir)) {
  $VideoDir = Join-Path $ProjectRoot $VideoDir
}

if (-not [IO.Path]::IsPathRooted($PosterDir)) {
  $PosterDir = Join-Path $ProjectRoot $PosterDir
}

New-Item -ItemType Directory -Force -Path $PosterDir | Out-Null

if (-not $FfmpegPath) {
  $ffmpegCommand = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if ($ffmpegCommand) {
    $FfmpegPath = $ffmpegCommand.Source
  }
}

if (-not $FfmpegPath) {
  throw "ffmpeg was not found in PATH. Install FFmpeg first, then re-run this script."
}

$videos = Get-ChildItem -LiteralPath $VideoDir -Filter *.mp4 -File | Sort-Object Name
$total = $videos.Count
$index = 0

Write-Host "Generating $total final-frame posters"
Write-Host "  videos:  $VideoDir"
Write-Host "  posters: $PosterDir"

foreach ($video in $videos) {
  $index += 1
  $poster = Join-Path $PosterDir "$($video.BaseName).jpg"
  $tempPoster = "$poster.tmp.jpg"

  Write-Host "[$index/$total] $($video.Name)"

  if (-not $Force -and (Test-Path -LiteralPath $poster)) {
    Write-Host "  final-frame poster exists; skipping"
    continue
  }

  if (Test-Path -LiteralPath $tempPoster) {
    Remove-Item -LiteralPath $tempPoster -Force
  }

  & $FfmpegPath -hide_banner -loglevel error -y -sseof -0.08 -i $video.FullName -frames:v 1 -vf "scale=-2:$Height" $tempPoster

  if ($LASTEXITCODE -ne 0) {
    throw "ffmpeg failed with exit code $LASTEXITCODE."
  }

  Move-Item -LiteralPath $tempPoster -Destination $poster -Force
}

Write-Host "Done. Generated $total .jpg posters."
