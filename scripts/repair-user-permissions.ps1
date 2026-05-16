$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$npmCache = npm config get cache

Write-Host "Repairing permissions for $currentUser"
Write-Host "Project: $projectRoot"
Write-Host "npm cache: $npmCache"

icacls $projectRoot /inheritance:e | Out-Host
icacls $projectRoot /grant "${currentUser}:(OI)(CI)F" /T /C | Out-Host

if ($npmCache -and (Test-Path $npmCache)) {
  icacls $npmCache /inheritance:e | Out-Host
  icacls $npmCache /grant "${currentUser}:(OI)(CI)F" /T /C | Out-Host
}

Write-Host "Done. Close the administrator terminal, open a normal terminal, then run: npm run dev:local"
