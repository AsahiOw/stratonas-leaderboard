param(
  [string]$SourceDir = "Development_data/lobbies",
  [string]$VideoOutDir = "Development_data/lobbies-optimized",
  [string]$PosterOutDir = "Development_data/lobby-posters",
  [int]$Height = 540,
  [int]$Fps = 24,
  [int]$Crf = 30,
  [string]$Preset = "slow",
  [string]$FfmpegPath = "",
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not [IO.Path]::IsPathRooted($SourceDir)) {
  $SourceDir = Join-Path $ProjectRoot $SourceDir
}

if (-not [IO.Path]::IsPathRooted($VideoOutDir)) {
  $VideoOutDir = Join-Path $ProjectRoot $VideoOutDir
}

if (-not [IO.Path]::IsPathRooted($PosterOutDir)) {
  $PosterOutDir = Join-Path $ProjectRoot $PosterOutDir
}

if (-not $FfmpegPath) {
  $ffmpegCommand = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if ($ffmpegCommand) {
    $FfmpegPath = $ffmpegCommand.Source
  }
}

if (-not $FfmpegPath) {
  throw "ffmpeg was not found in PATH. Install FFmpeg first, then re-run this script."
}

function Invoke-Ffmpeg {
  param([string[]]$Arguments)

  & $FfmpegPath @Arguments

  if ($LASTEXITCODE -ne 0) {
    throw "ffmpeg failed with exit code $LASTEXITCODE."
  }
}

function Remove-TempFile {
  param([string]$Path)

  try {
    if (Test-Path -LiteralPath $Path) {
      Remove-Item -LiteralPath $Path -Force -ErrorAction Stop
    }
  } catch {
    Write-Host "  temp cleanup skipped"
  }
}

if (-not (Test-Path -LiteralPath $SourceDir)) {
  throw "Source directory was not found: $SourceDir"
}

New-Item -ItemType Directory -Force -Path $VideoOutDir | Out-Null
New-Item -ItemType Directory -Force -Path $PosterOutDir | Out-Null

$videos = Get-ChildItem -LiteralPath $SourceDir -Filter *.mp4 -File | Sort-Object Name
$total = $videos.Count
$index = 0

foreach ($video in $videos) {
  $index += 1
  $optimizedPath = Join-Path $VideoOutDir $video.Name
  $posterPath = Join-Path $PosterOutDir "$($video.BaseName).webp"

  Write-Host "[$index/$total] $($video.Name)"

  if ($Force -or -not (Test-Path -LiteralPath $optimizedPath)) {
    $tempVideo = "$optimizedPath.tmp.mp4"
    Remove-TempFile $tempVideo

    Invoke-Ffmpeg @(
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", $video.FullName,
      "-vf", "scale=-2:$Height,fps=$Fps",
      "-c:v", "libx264", "-preset", $Preset, "-crf", "$Crf",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
      $tempVideo
    )

    Move-Item -LiteralPath $tempVideo -Destination $optimizedPath -Force
  } else {
    Write-Host "  optimized video exists; skipping"
  }

  if ($Force -or -not (Test-Path -LiteralPath $posterPath)) {
    $tempPoster = "$posterPath.tmp.webp"
    Remove-TempFile $tempPoster

    Invoke-Ffmpeg @(
      "-hide_banner", "-loglevel", "error", "-y",
      "-ss", "1", "-i", $optimizedPath,
      "-frames:v", "1", "-vf", "scale=-2:$Height",
      $tempPoster
    )

    Move-Item -LiteralPath $tempPoster -Destination $posterPath -Force
  } else {
    Write-Host "  poster exists; skipping"
  }
}

Write-Host "Done. Optimized $total memorial lobby videos."
