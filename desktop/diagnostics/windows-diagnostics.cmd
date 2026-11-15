@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows-diagnostics.ps1" -AppPath "%~1"
echo.
pause
