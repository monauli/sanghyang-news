$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskTools = Join-Path $taskRoot 'artifacts/tooling/gitleaks'
$resolvedTools = [IO.Path]::GetFullPath($taskTools)
if (-not $resolvedTools.StartsWith($taskRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Tool directory must remain inside the workspace'
}
New-Item -ItemType Directory -Path $resolvedTools -Force | Out-Null
$releaseBase = 'https://github.com/gitleaks/gitleaks/releases/download/v8.30.1'
$archiveName = 'gitleaks_8.30.1_windows_x64.zip'
$archivePath = Join-Path $resolvedTools $archiveName
$checksumsPath = Join-Path $resolvedTools 'checksums.txt'
Invoke-WebRequest -Uri "$releaseBase/$archiveName" -OutFile $archivePath
Invoke-WebRequest -Uri "$releaseBase/gitleaks_8.30.1_checksums.txt" -OutFile $checksumsPath
$expectedHash = ((Get-Content -LiteralPath $checksumsPath | Where-Object { $_ -match ($archiveName + '$') }) -split '\s+')[0]
$actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash
if (-not $expectedHash -or $expectedHash -ne $actualHash) { throw 'Official Gitleaks checksum verification failed' }
Expand-Archive -LiteralPath $archivePath -DestinationPath $resolvedTools -Force
& (Join-Path $resolvedTools 'gitleaks.exe') version
if ($LASTEXITCODE -ne 0) { throw 'Gitleaks executable verification failed' }
