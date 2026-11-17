$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$sourceDb = Join-Path $projectRoot 'backend\college.db'
$dockerDataDir = Join-Path $projectRoot 'docker-data'
$dockerDb = Join-Path $dockerDataDir 'college.db'

if (-not (Test-Path -LiteralPath $sourceDb -PathType Leaf)) {
    throw "Source SQLite database not found: $sourceDb"
}
New-Item -ItemType Directory -Path $dockerDataDir -Force | Out-Null
if (-not (Test-Path -LiteralPath $dockerDb -PathType Leaf)) {
    Copy-Item -LiteralPath $sourceDb -Destination $dockerDb
    Write-Host "Created Docker's private database copy at $dockerDb"
} else {
    Write-Host "Keeping existing Docker database copy at $dockerDb"
}

docker compose -f (Join-Path $projectRoot 'docker-compose.desktop.yml') up --build -d
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose failed. Check that Docker Desktop is running.' }
Write-Host 'App URL: http://localhost:8080'
