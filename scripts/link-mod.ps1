<#
.SYNOPSIS
    Links a mod from this repository into the game's local mod folder (directory junction).

.DESCRIPTION
    Creates "<Documents>\Paradox Interactive\Europa Universalis V\mod\<ModName>" as a junction
    to "mods\<ModName>" so the game always loads the working copy. Junctions need no admin rights.

.EXAMPLE
    .\scripts\link-mod.ps1 -ModName travelling_scholar
    .\scripts\link-mod.ps1 -ModName travelling_scholar -Unlink
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string] $ModName,

    [switch] $Unlink
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repoRoot "mods\$ModName"
$documents = [Environment]::GetFolderPath('MyDocuments')
$gameModFolder = Join-Path $documents 'Paradox Interactive\Europa Universalis V\mod'
$link = Join-Path $gameModFolder $ModName

function Test-IsJunction([string] $Path) {
    $item = Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
    return $null -ne $item -and $item.LinkType -eq 'Junction'
}

if ($Unlink) {
    if (-not (Test-IsJunction $link)) {
        throw "No junction found at '$link'. Refusing to delete anything else."
    }
    # Removes the junction only, never the target's content.
    [System.IO.Directory]::Delete($link)
    Write-Host "Unlinked '$link'."
    return
}

if (-not (Test-Path -LiteralPath (Join-Path $source '.metadata\metadata.json'))) {
    throw "'$source' is not a mod: .metadata\metadata.json is missing."
}

if (Test-Path -LiteralPath $link) {
    if (Test-IsJunction $link) {
        Write-Host "Already linked: '$link' -> '$((Get-Item -LiteralPath $link).Target)'."
        return
    }
    throw "'$link' already exists and is not a junction. Move it away first."
}

New-Item -ItemType Directory -Force -Path $gameModFolder | Out-Null
New-Item -ItemType Junction -Path $link -Target $source | Out-Null
Write-Host "Linked '$link' -> '$source'."
