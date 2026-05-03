param(
  [string]$VideoDir = "Development_data/lobbies-optimized",
  [string]$PosterDir = "Development_data/lobby-posters",
  [int]$Height = 540,
  [string]$PosterExt = ".jpg"
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

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source
$fallbackFfmpeg = Join-Path $env:LOCALAPPDATA "Overwolf/Extensions/ncfplpkmiejjaklknfnkgcpapnhkggmlcppckhcb/270.0.10/obs/bin/64bit/ffmpeg.exe"
if ($ffmpeg -like "*\Microsoft\WinGet\Links\ffmpeg.exe" -and (Test-Path -LiteralPath $fallbackFfmpeg)) {
  $ffmpeg = $fallbackFfmpeg
}
if (-not $ffmpeg) {
  throw "ffmpeg was not found."
}

$videos = Get-ChildItem -LiteralPath $VideoDir -Filter *.mp4 -File | Sort-Object Name
$total = $videos.Count
$index = 0

Write-Host "Generating $total final-frame posters"
Write-Host "  videos:  $VideoDir"
Write-Host "  posters: $PosterDir"

foreach ($video in $videos) {
  $index += 1
  $poster = Join-Path $PosterDir "$($video.BaseName)$PosterExt"
  $tempPoster = "$poster.tmp$PosterExt"

  Write-Host "[$index/$total] $($video.Name)"

  if (Test-Path -LiteralPath $tempPoster) {
    Remove-Item -LiteralPath $tempPoster -Force
  }

  & $ffmpeg -hide_banner -loglevel error -y -sseof -0.08 -i $video.FullName -frames:v 1 -vf "scale=-2:$Height" $tempPoster

  Move-Item -LiteralPath $tempPoster -Destination $poster -Force
}

Write-Host "Done. Generated $total .$($PosterExt.TrimStart('.')) posters."
