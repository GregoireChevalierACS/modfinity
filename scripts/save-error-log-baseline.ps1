<#
.SYNOPSIS
    Saves the game's current error.log as a normalized baseline for the running game version.

.DESCRIPTION
    Run it right after quitting a session played WITHOUT any mod. Timestamps are stripped,
    lines deduplicated and sorted, so the baseline only lists distinct vanilla errors.
    Output: baselines\error-log-<game version>.txt
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$documents = [Environment]::GetFolderPath('MyDocuments')
$logs = Join-Path $documents 'Paradox Interactive\Europa Universalis V\logs'

$branchLine = Select-String -LiteralPath (Join-Path $logs 'code_revisions.log') -Pattern 'game_branch: .*/release/(\S+)' |
    Select-Object -First 1
if ($null -eq $branchLine) {
    throw 'Could not read the game version from code_revisions.log.'
}
$version = $branchLine.Matches[0].Groups[1].Value

$lines = Get-Content -LiteralPath (Join-Path $logs 'error.log') -Encoding UTF8 |
    ForEach-Object { $_ -replace '^\[\d{2}:\d{2}:\d{2}\]', '' } |
    Where-Object { $_.Trim() -ne '' } |
    Sort-Object -Unique

$output = Join-Path $repoRoot "baselines\error-log-$version.txt"
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $output) | Out-Null
[System.IO.File]::WriteAllLines($output, [string[]] $lines, [System.Text.UTF8Encoding]::new($false))

Write-Host "Baseline saved: $output ($($lines.Count) distinct lines)."
