$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$port = 3000
$listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
foreach ($listener in $listeners) {
  $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
  if ($process -and $process.ProcessName -eq "node") {
    Stop-Process -Id $process.Id -Force
  }
}

$env:NEXT_TELEMETRY_DISABLED = "1"

Write-Host "Starting Stratonas leaderboard on http://127.0.0.1:$port"
& "$projectRoot\node_modules\.bin\next.cmd" dev --hostname 127.0.0.1 --port $port
