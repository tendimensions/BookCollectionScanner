<#
.SYNOPSIS
    Deploy Book Collection Scanner server to a remote Linux machine via SSH.

.DESCRIPTION
    Builds the React admin UI locally, syncs the server code and docker-compose.yml
    to the remote host, then runs docker compose up --build -d.

.PARAMETER SshTarget
    SSH connection string, e.g. pi@Locke.local or user@192.168.1.50

.PARAMETER Destination
    Remote path to deploy into. Defaults to ~/bookcollectionscanner

.PARAMETER RebuildAdmin
    Force a fresh npm run build of the admin UI before deploying.
    The admin dist is always included; this flag forces a rebuild even if dist/ exists.

.PARAMETER SkipBuild
    Skip docker compose --build on the remote (faster redeploy if only config changed).

.EXAMPLE
    .\deploy.ps1 -SshTarget pi@Locke.local

.EXAMPLE
    .\deploy.ps1 -SshTarget user@192.168.1.50 -Destination ~/apps/books -RebuildAdmin
#>

#Requires -Version 5.1

param(
    [Parameter(Mandatory, HelpMessage = "SSH target, e.g. pi@Locke.local")]
    [string]$SshTarget,

    [string]$Destination = "~/bookcollectionscanner",

    [switch]$RebuildAdmin,

    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# ── Paths ─────────────────────────────────────────────────────────────────────

$ScriptDir   = $PSScriptRoot                          # .../server
$RepoRoot    = Split-Path $ScriptDir -Parent          # repo root
$AdminDir    = Join-Path $ScriptDir "admin"
$AdminDist   = Join-Path $AdminDir  "dist"
$EnvFile     = Join-Path $ScriptDir ".env"
$EnvExample  = Join-Path $ScriptDir ".env.example"
$ComposeFile = Join-Path $RepoRoot  "docker-compose.yml"

# ── Helpers ───────────────────────────────────────────────────────────────────

function Write-Step([string]$msg) {
    Write-Host "`n▶ $msg" -ForegroundColor Cyan
}

function Write-OK([string]$msg) {
    Write-Host "  ✅ $msg" -ForegroundColor Green
}

function Write-Warn([string]$msg) {
    Write-Host "  ⚠️  $msg" -ForegroundColor Yellow
}

function Invoke-SSH([string]$cmd) {
    ssh $SshTarget $cmd
    if ($LASTEXITCODE -ne 0) { throw "SSH command failed: $cmd" }
}

function Find-Rsync {
    # Prefer native rsync, then Git-for-Windows rsync, then WSL
    foreach ($candidate in @(
        "rsync",
        "C:\Program Files\Git\usr\bin\rsync.exe",
        "C:\Program Files (x86)\Git\usr\bin\rsync.exe"
    )) {
        if (Get-Command $candidate -ErrorAction SilentlyContinue) { return $candidate }
    }
    # WSL fallback — return "wsl" only; caller invokes as: wsl rsync <args>
    if (Get-Command wsl -ErrorAction SilentlyContinue) { return "wsl" }
    return $null
}

function ConvertTo-WslPath([string]$winPath) {
    # C:\foo\bar  →  /mnt/c/foo/bar  (PS 5.1 compatible)
    $drive = $winPath[0].ToString().ToLower()
    $rest  = $winPath.Substring(2) -replace '\\', '/'
    return "/mnt/$drive$rest"
}

function Invoke-Rsync([string]$rsyncBin, [string[]]$rsyncArgs) {
    if ($rsyncBin -eq "wsl") {
        wsl rsync @rsyncArgs
    } else {
        & $rsyncBin @rsyncArgs
    }
}

# ── Step 1: Verify SSH reachability ───────────────────────────────────────────

Write-Step "Verifying SSH connectivity to $SshTarget"
$testResult = ssh -o ConnectTimeout=5 -o BatchMode=yes $SshTarget "echo ok" 2>&1
if ($testResult -ne "ok") {
    Write-Error "Cannot reach $SshTarget. Check the address and that your SSH key is authorised."
}
Write-OK "Connected to $SshTarget"

# ── Step 2: Build admin UI ────────────────────────────────────────────────────

Write-Step "Admin UI"
if (-not (Test-Path $AdminDir)) {
    Write-Warn "admin/ directory not found — skipping UI build"
} elseif ($RebuildAdmin -or -not (Test-Path $AdminDist)) {
    Write-Host "  Building React admin UI..."
    Push-Location $AdminDir
    try {
        npm ci --silent
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
        Write-OK "Admin UI built → $AdminDist"
    } finally {
        Pop-Location
    }
} else {
    Write-OK "Using existing dist/ (pass -RebuildAdmin to force rebuild)"
}

# ── Step 3: Resolve .env ──────────────────────────────────────────────────────

Write-Step "Environment file"
if (Test-Path $EnvFile) {
    Write-OK "Found local .env — will deploy it"
    $DeployEnv = $true
} else {
    Write-Warn ".env not found locally. A starter .env will be created on the remote"
    Write-Warn "  from .env.example if one doesn't already exist there."
    Write-Warn "  Edit $Destination/.env on the remote to add your GOOGLE_BOOKS_API_KEY."
    Write-Warn "  (Next to docker-compose.yml — that's where Docker Compose reads it.)"
    $DeployEnv = $false
}

# ── Step 4: Prepare remote directory ─────────────────────────────────────────

Write-Step "Preparing remote directory $Destination"
Invoke-SSH "mkdir -p $Destination/server $Destination/data"
Write-OK "Remote directories ready"

# ── Step 5: Sync files ────────────────────────────────────────────────────────

Write-Step "Syncing files to $SshTarget`:$Destination"

$rsync = Find-Rsync

# Build exclusion list — never overwrite the live database or secrets
$excludes = @(
    "--exclude=.venv/"
    "--exclude=__pycache__/"
    "--exclude=*.pyc"
    "--exclude=*.pyo"
    "--exclude=.env"          # handled separately
    "--exclude=books.db"      # never overwrite production DB
    "--exclude=admin/node_modules/"
    "--exclude=admin/src/"    # dist is enough; source not needed on server
    "--exclude=*.egg-info/"
)

if ($rsync) {
    Write-Host "  Using rsync ($rsync)"

    # Build source path — WSL needs a /mnt/... path, native rsync uses the Windows path
    $srcPath = if ($rsync -eq "wsl") {
        (ConvertTo-WslPath $ScriptDir) + "/"
    } else {
        "$ScriptDir/"
    }

    $composeSrc = if ($rsync -eq "wsl") { ConvertTo-WslPath $ComposeFile } else { $ComposeFile }

    $rsyncArgs = @("-avz", "--delete") + $excludes + @($srcPath, "$SshTarget`:$Destination/server/")
    Invoke-Rsync $rsync $rsyncArgs
    if ($LASTEXITCODE -ne 0) { throw "rsync failed" }

    # Sync docker-compose.yml to destination root
    Invoke-Rsync $rsync @("-avz", $composeSrc, "$SshTarget`:$Destination/docker-compose.yml")
    if ($LASTEXITCODE -ne 0) { throw "rsync of docker-compose.yml failed" }

} else {
    Write-Warn "rsync not found — falling back to scp (no incremental sync)"
    Write-Warn "Install rsync via Git for Windows for faster future deploys."

    # scp the server directory
    scp -r "$ScriptDir" "$SshTarget`:$Destination/server_upload"
    if ($LASTEXITCODE -ne 0) { throw "scp failed" }

    # Move into place, preserving the live DB if it exists
    Invoke-SSH @"
rsync -a --exclude=books.db $Destination/server_upload/ $Destination/server/ 2>/dev/null || \
  cp -r $Destination/server_upload/. $Destination/server/
rm -rf $Destination/server_upload
"@

    # Copy docker-compose.yml
    scp $ComposeFile "$SshTarget`:$Destination/docker-compose.yml"
    if ($LASTEXITCODE -ne 0) { throw "scp of docker-compose.yml failed" }
}

Write-OK "Files synced"

# ── Step 6: Deploy .env ───────────────────────────────────────────────────────

Write-Step "Environment file on remote"
# .env lives at $Destination/.env (next to docker-compose.yml) so Docker Compose
# can read it for variable interpolation (${GOOGLE_BOOKS_API_KEY:-} etc.)
if ($DeployEnv) {
    scp $EnvFile "$SshTarget`:$Destination/.env"
    if ($LASTEXITCODE -ne 0) { throw "scp of .env failed" }
    Write-OK ".env deployed to $Destination/.env"
} else {
    # Create a starter .env from the example only if one doesn't exist yet
    $exampleContent = Get-Content $EnvExample -Raw
    $escapedContent = $exampleContent -replace "'", "'\''"
    Invoke-SSH @"
if [ ! -f $Destination/.env ]; then
  printf '%s\n' '$escapedContent' > $Destination/.env
  echo 'Created starter .env from .env.example'
else
  echo '.env already exists on remote — leaving it unchanged'
fi
"@
}

# ── Step 7: Verify Docker is available on remote ──────────────────────────────

Write-Step "Verifying Docker on remote"
$dockerVersion = ssh $SshTarget "docker --version 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker not found on $SshTarget. Install Docker and Docker Compose, then retry."
}
Write-OK $dockerVersion

# ── Step 8: Backup database ───────────────────────────────────────────────────

Write-Step "Backing up database on remote"
Invoke-SSH @"
set -e
DB_PATH=$Destination/data/books.db
if [ -f "\$DB_PATH" ]; then
  STAMP=\$(date +%Y-%m-%d_%H-%M-%S)
  BACKUP_PATH=$Destination/data/books_\${STAMP}.db
  cp "\$DB_PATH" "\$BACKUP_PATH"
  echo "  Backup created: \$BACKUP_PATH"
else
  echo "  No database found yet — skipping backup"
fi
"@
Write-OK "Database backup done"

# ── Step 9: docker compose up ─────────────────────────────────────────────────

Write-Step "Deploying on remote"
$buildFlag = if ($SkipBuild) { "" } else { "--build" }

Invoke-SSH @"
set -e
cd $Destination
echo 'Pulling latest base images...'
docker compose pull --quiet 2>/dev/null || true
echo 'Starting containers...'
docker compose up $buildFlag -d
echo 'Container status:'
docker compose ps
"@

Write-OK "Deployment complete"

# ── Done ──────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  Book Collection Scanner deployed successfully!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "  API + Admin UI  →  http://$($SshTarget.Split('@')[-1]):8000"
Write-Host "  API docs        →  http://$($SshTarget.Split('@')[-1]):8000/docs"
Write-Host "  Health check    →  http://$($SshTarget.Split('@')[-1]):8000/api/health"
Write-Host ""
Write-Host "  To stream logs:  ssh $SshTarget 'cd $Destination && docker compose logs -f'"
Write-Host ""
