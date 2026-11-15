param([string]$AppPath)
$ErrorActionPreference = 'Stop'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$out = Join-Path ([Environment]::GetFolderPath('Desktop')) "HuobaoDrama-diagnostics-$stamp"
New-Item -ItemType Directory -Path $out -Force | Out-Null
$report = Join-Path $out 'report.txt'
function Report([string]$text) { $text | Out-File -FilePath $report -Append -Encoding utf8; Write-Host $text }
try {
    Report "HuobaoDrama Windows startup diagnostics - $stamp"
    Report "OS: $([Environment]::OSVersion.VersionString) | 64-bit OS: $([Environment]::Is64BitOperatingSystem)"
    Report "PowerShell: $($PSVersionTable.PSVersion)"
    if (-not $AppPath) {
        $candidates = @(
            (Join-Path $PSScriptRoot 'HuobaoDrama.exe'),
            (Join-Path $env:LOCALAPPDATA 'Programs\HuobaoDrama\HuobaoDrama.exe'),
            (Join-Path $env:LOCALAPPDATA 'Programs\huobao-drama-desktop\HuobaoDrama.exe'),
            (Join-Path $env:ProgramFiles 'HuobaoDrama\HuobaoDrama.exe')
        )
        foreach ($key in @('HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*')) {
            Get-ItemProperty $key -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like '*HuobaoDrama*' } | ForEach-Object {
                Report "Installed: $($_.DisplayName) $($_.DisplayVersion)"
                if ($_.InstallLocation) { $candidates += Join-Path $_.InstallLocation 'HuobaoDrama.exe' }
            }
        }
        $AppPath = $candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
    }
    if (-not $AppPath -or -not (Test-Path -LiteralPath $AppPath -PathType Leaf)) {
        Report 'Application not found. Place these two diagnostic files beside HuobaoDrama.exe, then run the CMD file again. You can also drag HuobaoDrama.exe onto the CMD file.'
    } else {
        $AppPath = (Resolve-Path -LiteralPath $AppPath).Path
        $install = Split-Path -Parent $AppPath
        Report "Executable: $AppPath"
        Report "File version: $((Get-Item -LiteralPath $AppPath).VersionInfo.FileVersion)"
        foreach ($relative in @('resources\app.asar','resources\frontend\index.html','resources\bin\ffmpeg.exe','resources\bin\ffprobe.exe','resources\app.asar.unpacked\node_modules\better-sqlite3\build\Release\better_sqlite3.node','resources\app.asar.unpacked\node_modules\@img\sharp-win32-x64\lib\sharp-win32-x64.node')) {
            $file = Join-Path $install $relative
            Report "Resource $relative : $(Test-Path -LiteralPath $file -PathType Leaf)"
        }
        $running = @(Get-Process -Name HuobaoDrama -ErrorAction SilentlyContinue)
        if ($running.Count -gt 0) {
            Report 'Existing HuobaoDrama processes found; no new instance launched and no processes terminated.'
            foreach ($p in $running) { Report "PID=$($p.Id) Responding=$($p.Responding) Window=$($p.MainWindowTitle)" }
            Report 'If no window is visible, end HuobaoDrama in Task Manager and run this diagnostic again.'
        } else {
            $env:ELECTRON_ENABLE_LOGGING = '1'
            # A shell-level ELECTRON_RUN_AS_NODE makes the GUI executable act as Node.
            Report "Inherited ELECTRON_RUN_AS_NODE: $env:ELECTRON_RUN_AS_NODE"
            Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
            $chromium = Join-Path $out 'chromium.log'
            $p = Start-Process -FilePath $AppPath -WorkingDirectory $install -ArgumentList @('--enable-logging', "--log-file=`"$chromium`"") -RedirectStandardOutput (Join-Path $out 'stdout.log') -RedirectStandardError (Join-Path $out 'stderr.log') -PassThru
            Report "Launched PID=$($p.Id). Observing for 15 seconds; the application will not be terminated."
            Start-Sleep -Seconds 15
            $p.Refresh()
            if ($p.HasExited) { Report "Exited: code=$($p.ExitCode)" }
            else { Report "Still running: Responding=$($p.Responding) Window=$($p.MainWindowTitle)" }
        }
    }
    $startup = Join-Path $env:APPDATA 'HuobaoDrama\logs\startup.log'
    if (Test-Path -LiteralPath $startup) { Copy-Item -LiteralPath $startup -Destination $out }
    $events = @(Get-WinEvent -FilterHashtable @{LogName='Application';StartTime=(Get-Date).AddMinutes(-20);Level=2} -MaxEvents 100 -ErrorAction SilentlyContinue | Where-Object { $_.Message -match 'HuobaoDrama|huobao-backend' })
    if ($events.Count -gt 0) { $events | Select-Object TimeCreated,ProviderName,Id,Message | Format-List | Out-File (Join-Path $out 'windows-events.txt') -Encoding utf8 }
} catch { Report "Diagnostic error: $($_.Exception.Message)" }
Report "Send the folder on your Desktop to support: $out"
Start-Process explorer.exe -ArgumentList "`"$out`""
