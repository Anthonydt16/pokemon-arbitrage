$ErrorActionPreference = 'Stop'

Write-Host "[0/5] Stop existing scraper-run containers..."
$running = docker ps --filter "name=pokemon-arbitrage-scraper-run" --format "{{.ID}}"
if ($running) {
	$running | ForEach-Object { docker rm -f $_ | Out-Null }
}

Write-Host "[1/5] Clean old containers..."
docker-compose down --remove-orphans

Write-Host "[2/5] Build images (web + scraper)..."
docker-compose build web scraper

Write-Host "[3/5] Start db + web..."
docker-compose up -d db web

Write-Host "[4/5] Sync Prisma schema to PostgreSQL..."
docker-compose run --rm web npx prisma db push --accept-data-loss

Write-Host "[5/5] Start daily scraper run..."
# Force scraper API target to internal compose network.
docker-compose run --rm -e API_BASE=http://web:3001/api scraper python daily_scan.py
