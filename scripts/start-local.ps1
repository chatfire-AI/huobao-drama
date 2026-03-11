$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LogsDir = Join-Path $ProjectRoot 'logs'

$GoBin = 'D:\tools\go\bin'
$NodeBin = 'D:\tools\node'
$FfmpegBin = 'D:\tools\ffmpeg\bin'

$env:PATH = "$GoBin;$NodeBin;$FfmpegBin;$env:PATH"
$env:GOPROXY = 'https://goproxy.cn,direct'
$env:HTTP_PROXY = 'http://127.0.0.1:7897'
$env:HTTPS_PROXY = 'http://127.0.0.1:7897'

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

function Test-PortListening {
    param([int]$Port)

    return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

if (-not (Test-Path (Join-Path $ProjectRoot 'configs\config.yaml'))) {
    Copy-Item (Join-Path $ProjectRoot 'configs\config.example.yaml') (Join-Path $ProjectRoot 'configs\config.yaml')
}

if (-not (Test-Path (Join-Path $ProjectRoot '.env'))) {
    Copy-Item (Join-Path $ProjectRoot '.env.example') (Join-Path $ProjectRoot '.env')
}

$backendLog = Join-Path $LogsDir 'backend.log'
$frontendLog = Join-Path $LogsDir 'frontend.log'

if (-not (Test-PortListening -Port 5678)) {
    Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoProfile',
        '-WindowStyle', 'Minimized',
        '-Command',
        "$env:PATH='$GoBin;$NodeBin;$FfmpegBin;'+`$env:PATH; `$env:GOPROXY='https://goproxy.cn,direct'; `$env:HTTP_PROXY='http://127.0.0.1:7897'; `$env:HTTPS_PROXY='http://127.0.0.1:7897'; Set-Location '$ProjectRoot'; go run main.go *>> '$backendLog'"
    ) | Out-Null
}

if (-not (Test-PortListening -Port 3012)) {
    Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoProfile',
        '-WindowStyle', 'Minimized',
        '-Command',
        "$env:PATH='$NodeBin;'+`$env:PATH; `$env:HTTP_PROXY='http://127.0.0.1:7897'; `$env:HTTPS_PROXY='http://127.0.0.1:7897'; Set-Location '$ProjectRoot\web'; npm run dev *>> '$frontendLog'"
    ) | Out-Null
}

$frontendReady = $false
for ($index = 0; $index -lt 30; $index++) {
    Start-Sleep -Seconds 1
    if (Test-PortListening -Port 3012) {
        $frontendReady = $true
        break
    }
}

Start-Process 'http://127.0.0.1:3012'

if (-not $frontendReady) {
    Write-Host 'Services are still starting; refresh the browser in a few seconds.'
}
