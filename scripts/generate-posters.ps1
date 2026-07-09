param(
  [Parameter(Mandatory = $true)]
  [string]$VideoName,
  [Parameter(Mandatory = $true)]
  [double]$Seconds,
  [string]$VideoDir = "Development_data/lobbies-optimized",
  [string]$PosterDir = "Development_data/lobby-posters",
  [int]$Height = 720,
  [string]$FfmpegPath = "",
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if ($Seconds -lt 0) {
  throw "Seconds must be 0 or greater."
}
$SecondsText = $Seconds.ToString([Globalization.CultureInfo]::InvariantCulture)

if ([IO.Path]::GetFileName($VideoName) -ne $VideoName) {
  throw "VideoName must be a file name inside the video directory, not a path."
}

if ([IO.Path]::GetExtension($VideoName) -eq "") {
  $VideoName = "$VideoName.mp4"
}

if (-not [IO.Path]::IsPathRooted($VideoDir)) {
  $VideoDir = Join-Path $ProjectRoot $VideoDir
}

if (-not [IO.Path]::IsPathRooted($PosterDir)) {
  $PosterDir = Join-Path $ProjectRoot $PosterDir
}

if (-not (Test-Path -LiteralPath $VideoDir -PathType Container)) {
  throw "Video directory was not found: $VideoDir"
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

$videoPath = Join-Path $VideoDir $VideoName
if (-not (Test-Path -LiteralPath $videoPath -PathType Leaf)) {
  throw "Video was not found: $videoPath"
}

$video = Get-Item -LiteralPath $videoPath
$poster = Join-Path $PosterDir "$($video.BaseName).jpg"
$tempPoster = "$poster.tmp.jpg"

if (-not $Force -and (Test-Path -LiteralPath $poster)) {
  throw "Poster already exists: $poster. Re-run with -Force to overwrite it."
}

if (Test-Path -LiteralPath $tempPoster) {
  Remove-Item -LiteralPath $tempPoster -Force
}

Write-Host "Generating poster"
Write-Host "  video:   $($video.FullName)"
Write-Host "  seconds: $SecondsText"
Write-Host "  poster:  $poster"

& $FfmpegPath -hide_banner -loglevel error -y -i $video.FullName -ss $SecondsText -frames:v 1 -vf "scale=-2:$Height" $tempPoster

if ($LASTEXITCODE -ne 0) {
  throw "ffmpeg failed with exit code $LASTEXITCODE."
}

Move-Item -LiteralPath $tempPoster -Destination $poster -Force
Write-Host "Done."
