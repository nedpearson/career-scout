$ErrorActionPreference = 'Stop'

function New-Shortcut {
  param(
    [Parameter(Mandatory=$true)][string]$ShortcutPath,
    [Parameter(Mandatory=$true)][string]$TargetPath,
    [Parameter(Mandatory=$false)][string]$Arguments = '',
    [Parameter(Mandatory=$false)][string]$WorkingDirectory = '',
    [Parameter(Mandatory=$false)][string]$Description = '',
    [Parameter(Mandatory=$false)][ValidateSet(1,3,7)][int]$WindowStyle = 1
  )

  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($ShortcutPath)
  $shortcut.TargetPath = $TargetPath
  if ($Arguments) { $shortcut.Arguments = $Arguments }
  if ($WorkingDirectory) { $shortcut.WorkingDirectory = $WorkingDirectory }
  if ($Description) { $shortcut.Description = $Description }
  $shortcut.WindowStyle = $WindowStyle
  $shortcut.Save()
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir '..\..')

$desktop = [Environment]::GetFolderPath('Desktop')
$startup = [Environment]::GetFolderPath('Startup')

$serverCmd = Join-Path $repoRoot 'scripts\windows\CareerScout-Server.cmd'
$appCmd    = Join-Path $repoRoot 'scripts\windows\CareerScout-App.cmd'
$startCmd  = Join-Path $repoRoot 'scripts\windows\CareerScout-Start.cmd'

if (!(Test-Path $serverCmd)) { throw "Missing: $serverCmd" }
if (!(Test-Path $appCmd))    { throw "Missing: $appCmd" }
if (!(Test-Path $startCmd))  { throw "Missing: $startCmd" }

$cmdExe = Join-Path $env:WINDIR 'System32\cmd.exe'

# Desktop shortcuts
New-Shortcut `
  -ShortcutPath (Join-Path $desktop 'Career Scout Server.lnk') `
  -TargetPath $cmdExe `
  -Arguments ('/c ""{0}""' -f $serverCmd) `
  -WorkingDirectory $repoRoot `
  -Description 'Start the Career Scout server' `
  -WindowStyle 7

New-Shortcut `
  -ShortcutPath (Join-Path $desktop 'Career Scout App.lnk') `
  -TargetPath $cmdExe `
  -Arguments ('/c ""{0}""' -f $appCmd) `
  -WorkingDirectory $repoRoot `
  -Description 'Open the Career Scout app'

# Startup shortcut (starts server + opens browser after login)
New-Shortcut `
  -ShortcutPath (Join-Path $startup 'Career Scout Server.lnk') `
  -TargetPath $cmdExe `
  -Arguments ('/c ""{0}""' -f $startCmd) `
  -WorkingDirectory $repoRoot `
  -Description 'Auto-start Career Scout on login' `
  -WindowStyle 7

Write-Host "Installed shortcuts:"
Write-Host " - Desktop: Career Scout Server"
Write-Host " - Desktop: Career Scout App"
Write-Host " - Startup: Career Scout Server"

# Also generate/update the Desktop QR + mobile install link (uses current LAN IP).
try {
  node (Join-Path $repoRoot "scripts\windows\generate-mobile-desktop-assets.mjs") | Out-Host
} catch {
  Write-Warning ("Unable to generate mobile QR assets: " + $_.Exception.Message)
}
