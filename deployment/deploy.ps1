<#
.SYNOPSIS
  Run Archive 115 locally in a container (Windows). Uses Docker if it is
  installed and running; otherwise Podman (starting its virtual machine).

.EXAMPLE
  .\deployment\deploy.ps1            # build and start, then open the browser
  .\deployment\deploy.ps1 down       # stop and remove the container
  .\deployment\deploy.ps1 restart    # rebuild and restart
  .\deployment\deploy.ps1 logs       # follow the server logs
  .\deployment\deploy.ps1 status     # show the container status
  .\deployment\deploy.ps1 test       # run the Cypress suite against the container

  Options (environment variables): PORT=9000, ENGINE=podman, NO_OPEN=1
#>
param([string]$Action = 'up')

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
if (-not $env:PORT) { $env:PORT = '8080' }
$Port = $env:PORT

function Say([string]$Message) { Write-Host "[archivo-115] $Message" -ForegroundColor Yellow }
function Fail([string]$Message) { Write-Host "[archivo-115] $Message" -ForegroundColor Red; exit 1 }
function Has([string]$Command) { [bool](Get-Command $Command -ErrorAction SilentlyContinue) }

function Test-Quiet([scriptblock]$Block) {
  try { & $Block *> $null; return ($LASTEXITCODE -eq 0) } catch { return $false }
}

function Test-DockerReady { (Has 'docker') -and (Test-Quiet { docker info }) }

function Start-PodmanMachine {
  if (-not (Test-Quiet { podman info })) {
    $machines = @(podman machine list --format '{{.Name}}' 2>$null | Where-Object { $_ })
    if ($machines.Count -eq 0) {
      Say 'Creating the Podman virtual machine (first time only)...'
      podman machine init
    }
    Say 'Starting the Podman virtual machine...'
    try { podman machine start *> $null } catch { }
    if (-not (Test-Quiet { podman info })) { Fail 'Podman is installed but its virtual machine did not start. Try: podman machine start' }
  }
}

function Select-Engine {
  $wanted = $env:ENGINE
  if ($wanted -eq 'docker' -or (-not $wanted -and (Test-DockerReady))) {
    if (-not (Test-DockerReady)) { Fail 'Docker is not running. Start Docker Desktop and try again.' }
    if (Test-Quiet { docker compose version }) { return @{ Name = 'docker'; Compose = @('docker', 'compose') } }
    if (Has 'docker-compose') { return @{ Name = 'docker'; Compose = @('docker-compose') } }
    Fail 'Docker is installed but Docker Compose is missing: https://docs.docker.com/compose/install/'
  }
  if ($wanted -eq 'podman' -or (Has 'podman')) {
    if (-not (Has 'podman')) { Fail 'ENGINE=podman was requested but Podman is not installed.' }
    if (-not $wanted -and (Has 'docker')) { Say 'Docker is installed but not running; using Podman instead.' }
    Start-PodmanMachine
    if (Has 'podman-compose') { return @{ Name = 'podman'; Compose = @('podman-compose') } }
    if (Test-Quiet { podman compose version }) { return @{ Name = 'podman'; Compose = @('podman', 'compose') } }
    Fail 'Podman is installed but no compose provider was found. Install one: pip install podman-compose'
  }
  Fail "Neither Docker nor Podman is installed. Install one of them:`n  Docker: https://docs.docker.com/desktop/setup/install/windows-install/`n  Podman: https://podman.io/docs/installation"
}

function Invoke-Compose([string[]]$Arguments) {
  $exe = $script:Engine.Compose[0]
  $prefix = @($script:Engine.Compose | Select-Object -Skip 1)
  & $exe @($prefix + $Arguments)
  if ($LASTEXITCODE -ne 0) { Fail "Command failed: $($script:Engine.Compose -join ' ') $($Arguments -join ' ')" }
}

function Wait-Site {
  $url = "http://localhost:$Port/"
  Say "Waiting for $url ..."
  for ($i = 0; $i -lt 60; $i++) {
    try {
      $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
      if ($r.StatusCode -eq 200) { return }
    } catch { }
    Start-Sleep -Seconds 1
  }
  Fail "The site did not answer on $url. See the logs with: .\deployment\deploy.ps1 logs"
}

if ($Action -notin @('up', 'down', 'restart', 'logs', 'status', 'test')) {
  Fail "Unknown action `"$Action`". Use: up | down | restart | logs | status | test"
}

$script:Engine = Select-Engine
Say "Using $($Engine.Name) ($($Engine.Compose -join ' '))."

switch ($Action) {
  'up' {
    Invoke-Compose @('up', '-d', '--build', '--force-recreate', 'web')
    Wait-Site
    Say "Archive 115 is running at http://localhost:$Port/  (English: http://localhost:$Port/en/)"
    Say 'Stop it with: .\deployment\deploy.ps1 down'
    if ($env:NO_OPEN -ne '1') { Start-Process "http://localhost:$Port/" }
  }
  'restart' {
    Invoke-Compose @('down')
    Invoke-Compose @('up', '-d', '--build', '--force-recreate', 'web')
    Wait-Site
    Say "Restarted at http://localhost:$Port/"
  }
  'down' { Invoke-Compose @('down') }
  'logs' { Invoke-Compose @('logs', '-f', 'web') }
  'status' { Invoke-Compose @('ps') }
  'test' {
    Invoke-Compose @('up', '-d', '--build', '--force-recreate', 'web')
    Wait-Site
    Invoke-Compose @('--profile', 'test', 'run', '--rm', 'e2e')
  }
  default { Fail "Unknown action `"$Action`". Use: up | down | restart | logs | status | test" }
}
