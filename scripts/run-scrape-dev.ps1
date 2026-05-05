$ErrorActionPreference = 'Stop'

Write-Host "[0/2] Stop existing scraper-run containers..."
$running = docker ps --filter "name=pokemon-arbitrage-scraper-run" --format "{{.ID}}"
if ($running) {
  $running | ForEach-Object { docker rm -f $_ | Out-Null }
}

Write-Host "[1/2] Start db service..."
docker-compose up -d db

Write-Host "[2/2] Run scraper against local dev web API..."
docker-compose run --rm -e API_BASE=http://host.docker.internal:3001/api scraper python daily_scan.py
