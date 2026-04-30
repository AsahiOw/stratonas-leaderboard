$ErrorActionPreference = "Stop"

function Find-PostgresTool {
  param([string]$Name)

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $matches = Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Filter "$Name.exe" -Recurse -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending

  if ($matches) {
    return $matches[0].FullName
  }

  throw "Could not find $Name. Install PostgreSQL and make sure its bin folder is on PATH."
}

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dataDir = Join-Path $projectRoot "Development_data\native-postgres"
$pgCtl = Find-PostgresTool "pg_ctl"

if (-not (Test-Path (Join-Path $dataDir "PG_VERSION"))) {
  Write-Host "No local PostgreSQL data folder exists yet."
  exit 0
}

& $pgCtl -D $dataDir stop -m fast
if ($LASTEXITCODE -ne 0) {
  throw "PostgreSQL did not stop cleanly."
}

Write-Host "PostgreSQL stopped."
