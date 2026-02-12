@echo off
setlocal
docker compose -p gcs_dev -f docker-compose.yml -f docker-compose.dev.yml down --remove-orphans
endlocal
