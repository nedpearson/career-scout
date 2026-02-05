$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir '..\..')

Push-Location $repoRoot
try {
  node "scripts\windows\generate-mobile-desktop-assets.mjs"
} finally {
  Pop-Location
}
