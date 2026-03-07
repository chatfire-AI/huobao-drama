$ErrorActionPreference = "SilentlyContinue"

Get-Process -Name main | Stop-Process -Force
Get-Process -Name node | Where-Object { $_.Path -like "E:\tools\runtimes\node-v20.19.6-win-x64*" } | Stop-Process -Force

Write-Output "Stopped huobao backend/frontend processes."

