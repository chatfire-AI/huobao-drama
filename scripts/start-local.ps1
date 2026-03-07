$ErrorActionPreference = "Stop"

$ProjectRoot = "E:\project\huobao-drama"
$ToolsRoot = "E:\tools"

$GoBin = "E:\tools\runtimes\go1.26.1\go\bin"
$NodeBin = "E:\tools\runtimes\node-v20.19.6-win-x64\node-v20.19.6-win-x64"
$FfmpegBin = "E:\tools\runtimes\ffmpeg-essentials\ffmpeg-8.0.1-essentials_build\bin"

$env:PATH = "$GoBin;$NodeBin;$FfmpegBin;$env:PATH"
$env:GOPATH = "$ToolsRoot\gopath"
$env:GOMODCACHE = "$ToolsRoot\gopath\pkg\mod"
$env:GOCACHE = "$ToolsRoot\gocache"
$env:NPM_CONFIG_CACHE = "$ToolsRoot\npm-cache"
$env:NPM_CONFIG_REGISTRY = "https://registry.npmmirror.com"
$env:GOPROXY = "https://goproxy.cn,direct"
$env:GOSUMDB = "sum.golang.google.cn"
$env:TEMP = "$ToolsRoot\tmp"
$env:TMP = "$ToolsRoot\tmp"

New-Item -ItemType Directory -Force -Path $env:GOPATH, $env:GOMODCACHE, $env:GOCACHE, $env:NPM_CONFIG_CACHE, $env:TEMP | Out-Null

$RunDir = Join-Path $ProjectRoot ".run"
New-Item -ItemType Directory -Force -Path $RunDir | Out-Null

$backendOut = Join-Path $RunDir "backend.out.log"
$backendErr = Join-Path $RunDir "backend.err.log"
$frontendOut = Join-Path $RunDir "frontend.out.log"
$frontendErr = Join-Path $RunDir "frontend.err.log"

$backend = Start-Process -FilePath "go" -ArgumentList @("run", "main.go") -WorkingDirectory $ProjectRoot -RedirectStandardOutput $backendOut -RedirectStandardError $backendErr -PassThru
$frontend = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev") -WorkingDirectory (Join-Path $ProjectRoot "web") -RedirectStandardOutput $frontendOut -RedirectStandardError $frontendErr -PassThru

Start-Sleep -Seconds 4

Write-Output "Backend PID: $($backend.Id)"
Write-Output "Frontend PID: $($frontend.Id)"
Write-Output "Backend URL: http://localhost:5678"
Write-Output "Frontend URL: http://localhost:3012"

