@echo off
setlocal
docker compose -p gcs_prod -f docker-compose.yml down --remove-orphans
endlocal
