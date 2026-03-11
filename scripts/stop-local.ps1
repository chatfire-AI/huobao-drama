$ErrorActionPreference = 'SilentlyContinue'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$backendConnections = Get-NetTCPConnection -State Listen -LocalPort 5678 -ErrorAction SilentlyContinue
if ($backendConnections) {
    $backendConnections | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }
}

$frontendConnections = Get-NetTCPConnection -State Listen -LocalPort 3012 -ErrorAction SilentlyContinue
if ($frontendConnections) {
    $frontendConnections | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }
}

Write-Host "Stopped services for $projectRoot"
