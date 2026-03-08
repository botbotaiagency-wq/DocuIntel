# Setup local PostgreSQL for DocuIntel (Windows)
# Run from project root: npm run setup:db  OR  .\scripts\setup-local-db.ps1

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $projectRoot "package.json"))) {
    $projectRoot = Get-Location
}
Set-Location $projectRoot

Write-Host 'DocuIntel - local DB setup' -ForegroundColor Cyan
Write-Host ''

# 1) Start Postgres: try Docker first
$useDocker = $false
try {
    $null = docker info 2>$null
    $useDocker = $true
} catch {}

if ($useDocker) {
    Write-Host 'Docker found. Starting PostgreSQL container...' -ForegroundColor Green
    $existing = docker ps -a --filter "name=docuintel-pg" --format "{{.Names}}" 2>$null
    if ($existing -eq "docuintel-pg") {
        $running = docker ps --filter "name=docuintel-pg" --format "{{.Names}}" 2>$null
        if ($running -ne "docuintel-pg") {
            docker start docuintel-pg | Out-Null
            Write-Host 'Started existing container docuintel-pg'
        } else {
            Write-Host 'Container docuintel-pg already running.'
        }
    } else {
        docker run -d --name docuintel-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=docuintel postgres:16
        Write-Host 'Created and started container docuintel-pg (postgres:16)'
    }
} else {
    Write-Host 'Docker not found. Using local PostgreSQL (if installed).' -ForegroundColor Yellow
    Write-Host ''
    Write-Host 'To install PostgreSQL on Windows, run in an elevated PowerShell:' -ForegroundColor White
    Write-Host '  winget install PostgreSQL.PostgreSQL.16' -ForegroundColor Gray
    Write-Host ''
    Write-Host "Default password is often 'postgres'. After install, ensure the service is running." -ForegroundColor Gray
    Write-Host "Then create a database named 'docuintel' (e.g. with pgAdmin or psql)." -ForegroundColor Gray
    Write-Host ''
}

# 2) Wait for port 5432
Write-Host ''
Write-Host 'Waiting for PostgreSQL on port 5432...' -ForegroundColor Cyan
$maxAttempts = 30
$attempt = 0
$connected = $false
while ($attempt -lt $maxAttempts) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", 5432)
        $tcp.Close()
        $connected = $true
        break
    } catch {
        $attempt++
        Start-Sleep -Seconds 1
    }
}
if (-not $connected) {
    Write-Host 'PostgreSQL did not become available on port 5432. Install/start it and run this script again.' -ForegroundColor Red
    exit 1
}
Write-Host 'PostgreSQL is reachable.' -ForegroundColor Green

# 3) Ensure .env has DATABASE_URL
$envPath = Join-Path $projectRoot ".env"
if (-not (Test-Path $envPath)) {
    $examplePath = Join-Path $projectRoot ".env.example"
    if (Test-Path $examplePath) {
        Copy-Item $examplePath $envPath
        Write-Host 'Created .env from .env.example'
    }
}
$envContent = Get-Content $envPath -Raw -ErrorAction SilentlyContinue
if ($envContent -notmatch "DATABASE_URL\s*=\s*postgresql") {
    $defaultUrl = "postgresql://postgres:postgres@localhost:5432/docuintel"
    if ($envContent -match "DATABASE_URL\s*=") {
        $envContent = $envContent -replace "DATABASE_URL\s*=.*", "DATABASE_URL=$defaultUrl"
    } else {
        $envContent = "DATABASE_URL=$defaultUrl`n" + $envContent
    }
    Set-Content -Path $envPath -Value $envContent.TrimEnd() -NoNewline
    Add-Content -Path $envPath -Value ""
    Write-Host "Set DATABASE_URL in .env to $defaultUrl"
}

# 4) Push schema
Write-Host ''
Write-Host 'Pushing database schema (drizzle)...' -ForegroundColor Cyan
& npm run db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host 'db:push failed. Ensure the database exists. If using local Postgres, create it with:' -ForegroundColor Red
    Write-Host '  psql -U postgres -c "CREATE DATABASE docuintel;"' -ForegroundColor Gray
    Write-Host 'Then run this script again.' -ForegroundColor Gray
    exit 1
}
Write-Host 'Schema pushed.' -ForegroundColor Green

# 5) Seed admin user
Write-Host ''
Write-Host 'Creating admin user (admin / admin123)...' -ForegroundColor Cyan
& npm run seed:admin
if ($LASTEXITCODE -ne 0) {
    Write-Host 'seed:admin failed.' -ForegroundColor Red
    exit 1
}
Write-Host 'Admin user ready.' -ForegroundColor Green

Write-Host ''
Write-Host 'Local DB setup complete.' -ForegroundColor Green
Write-Host '  Login: admin / admin123' -ForegroundColor White
Write-Host '  Run: npm run dev' -ForegroundColor White
Write-Host ''
