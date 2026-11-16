$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$installer = Join-Path $repoRoot 'release\AAPESH-Setup-x64.exe'
$portableExecutable = Join-Path $repoRoot 'release\AAPESH-Portable-x64.exe'
$installDirectory = Join-Path $env:RUNNER_TEMP 'AAPESH-Install-Smoke'
$appExecutable = Join-Path $installDirectory 'AAPESH.exe'
$uninstaller = Join-Path $installDirectory 'Uninstall AAPESH.exe'
$resultFile = Join-Path $env:RUNNER_TEMP 'aapesh-desktop-smoke.json'
$smokeUserData = Join-Path $env:RUNNER_TEMP 'AAPESH-UserData-Smoke'
$portableUserData = Join-Path $env:RUNNER_TEMP 'AAPESH-Portable-UserData-Smoke'
$database = Join-Path $smokeUserData 'aurora_music.db'
$env:AAPESH_USER_DATA_DIR = $smokeUserData

if (-not (Test-Path -LiteralPath $installer) -or -not (Test-Path -LiteralPath $portableExecutable)) {
  throw 'NSIS or portable executable artifact was not found.'
}

$install = Start-Process -FilePath $installer -ArgumentList @('/S', "/D=$installDirectory") -Wait -PassThru
if ($install.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $appExecutable)) {
  throw "AAPESH setup installer failed (exit code $($install.ExitCode))."
}

function Invoke-AapeshSmoke {
  if (Test-Path -LiteralPath $resultFile) {
    Remove-Item -LiteralPath $resultFile -Force
  }
  $oldResultPath = $env:AAPESH_SMOKE_TEST_RESULT
  $env:AAPESH_SMOKE_TEST_RESULT = $resultFile
  try {
    $process = Start-Process -FilePath $appExecutable -ArgumentList @('--smoke-test') -PassThru
    if (-not $process.WaitForExit(90000)) {
      $process.Kill()
      throw 'AAPESH smoke launch exceeded 90 seconds.'
    }
    if ($process.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $resultFile)) {
      throw "AAPESH smoke launch failed (exit code $($process.ExitCode))."
    }
    $result = Get-Content -LiteralPath $resultFile -Raw | ConvertFrom-Json
    if (-not $result.success -or $result.version -ne '2.0.0') {
      throw "AAPESH reported an unsuccessful startup: $($result | ConvertTo-Json -Compress)"
    }
    return $result
  }
  finally {
    if ($null -eq $oldResultPath) {
      Remove-Item Env:AAPESH_SMOKE_TEST_RESULT -ErrorAction SilentlyContinue
    }
    else {
      $env:AAPESH_SMOKE_TEST_RESULT = $oldResultPath
    }
  }
}

function Invoke-PortableSmoke {
  $oldUserDataPath = $env:AAPESH_USER_DATA_DIR
  $env:AAPESH_USER_DATA_DIR = $portableUserData
  try {
    $portableResultPath = Join-Path $env:RUNNER_TEMP 'aapesh-portable-smoke.json'
    if (Test-Path -LiteralPath $portableResultPath) {
      Remove-Item -LiteralPath $portableResultPath -Force
    }
    $oldResultPath = $env:AAPESH_SMOKE_TEST_RESULT
    $env:AAPESH_SMOKE_TEST_RESULT = $portableResultPath
    try {
      $process = Start-Process -FilePath $portableExecutable -ArgumentList @('--smoke-test') -PassThru
      if (-not $process.WaitForExit(120000)) {
        $process.Kill()
        throw 'Portable AAPESH launch exceeded 120 seconds.'
      }
      if ($process.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $portableResultPath)) {
        throw "Portable AAPESH launch failed (exit code $($process.ExitCode))."
      }
      $result = Get-Content -LiteralPath $portableResultPath -Raw | ConvertFrom-Json
      if (-not $result.success -or $result.version -ne '2.0.0') {
        throw "Portable AAPESH reported an unsuccessful startup: $($result | ConvertTo-Json -Compress)"
      }
      if (-not (Test-Path -LiteralPath (Join-Path $portableUserData 'aurora_music.db'))) {
        throw 'Portable AAPESH did not persist the database in the configured user data folder.'
      }
    }
    finally {
      if ($null -eq $oldResultPath) {
        Remove-Item Env:AAPESH_SMOKE_TEST_RESULT -ErrorAction SilentlyContinue
      }
      else {
        $env:AAPESH_SMOKE_TEST_RESULT = $oldResultPath
      }
    }
  }
  finally {
    $env:AAPESH_USER_DATA_DIR = $oldUserDataPath
  }
}

$firstRun = Invoke-AapeshSmoke
if (-not (Test-Path -LiteralPath $database) -or (Get-Item -LiteralPath $database).Length -eq 0) {
  throw "The database was not created in per-user application data: $database"
}

$secondRun = Invoke-AapeshSmoke
if ($firstRun.backendPort -ne $secondRun.backendPort) {
  throw 'The persisted loopback port changed across application restart.'
}

Invoke-PortableSmoke

if (-not (Test-Path -LiteralPath $uninstaller)) {
  throw "NSIS uninstaller was not installed: $uninstaller"
}
$uninstall = Start-Process -FilePath $uninstaller -ArgumentList @('/S') -Wait -PassThru
if ($uninstall.ExitCode -ne 0) {
  throw "AAPESH uninstall failed (exit code $($uninstall.ExitCode))."
}
if (-not (Test-Path -LiteralPath $database)) {
  throw 'Uninstall removed the user database; user data must be preserved.'
}
if (Test-Path -LiteralPath $appExecutable) {
  throw 'Uninstall left the application executable in the installation directory.'
}

# Reinstalling must reuse the same per-user data rather than creating a fresh
# database in the install directory or a temporary one-file extraction folder.
$install = Start-Process -FilePath $installer -ArgumentList @('/S', "/D=$installDirectory") -Wait -PassThru
if ($install.ExitCode -ne 0) {
  throw "AAPESH reinstall failed (exit code $($install.ExitCode))."
}
$thirdRun = Invoke-AapeshSmoke
if ($thirdRun.backendPort -ne $firstRun.backendPort) {
  throw 'Reinstall did not retain the per-user backend configuration.'
}

$uninstall = Start-Process -FilePath $uninstaller -ArgumentList @('/S') -Wait -PassThru
if ($uninstall.ExitCode -ne 0) {
  throw "AAPESH final uninstall failed (exit code $($uninstall.ExitCode))."
}
if (-not (Test-Path -LiteralPath $database)) {
  throw 'Final uninstall removed persistent user data.'
}

Write-Host 'AAPESH install, launch, restart, reinstall, user-data preservation, and uninstall checks passed.'
