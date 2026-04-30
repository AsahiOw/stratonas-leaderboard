param(
  [int]$Port = 5432
)

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

function Read-EnvFile {
  param([string]$Path)

  $values = @{}
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
      $key, $value = $line.Split("=", 2)
      $values[$key] = $value
    }
  }
  return $values
}

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envValues = Read-EnvFile (Join-Path $projectRoot ".env")

$user = $envValues["POSTGRES_USER"]
$password = $envValues["POSTGRES_PASSWORD"]
$database = $envValues["POSTGRES_DB"]

$dataDir = Join-Path $projectRoot "Development_data\native-postgres"
$logDir = Join-Path $projectRoot "Development_data\logs"
$passwordFile = Join-Path $projectRoot "Development_data\pg-password.txt"
$logFile = Join-Path $logDir "postgres.log"

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dataDir), $logDir | Out-Null

$initdb = Find-PostgresTool "initdb"
$pgCtl = Find-PostgresTool "pg_ctl"
$psql = Find-PostgresTool "psql"
$createdb = Find-PostgresTool "createdb"

if (-not (Test-Path (Join-Path $dataDir "PG_VERSION"))) {
  Set-Content -Path $passwordFile -Value $password -NoNewline
  & $initdb -D $dataDir -U $user --pwfile=$passwordFile --encoding=UTF8 --locale=C
  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL initdb failed."
  }
}

& $pgCtl -D $dataDir status | Out-Null
if ($LASTEXITCODE -ne 0) {
  & $pgCtl -D $dataDir -l $logFile -o "-p $Port" start
  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL failed to start. Check $logFile."
  }
}

$env:PGPASSWORD = $password
$exists = & $psql -h localhost -p $Port -U $user -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$database'"
if ($exists.Trim() -ne "1") {
  & $createdb -h localhost -p $Port -U $user $database
  if ($LASTEXITCODE -ne 0) {
    throw "Could not create database $database."
  }
}

Write-Host "PostgreSQL is running on localhost:$Port"
Write-Host "Data folder: $dataDir"
