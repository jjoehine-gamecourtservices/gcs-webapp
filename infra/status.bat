@echo off
setlocal

echo === PROD ===
docker compose -p gcs_prod -f docker-compose.yml ps

echo(

echo === DEV ===
docker compose -p gcs_dev -f docker-compose.yml -f docker-compose.dev.yml ps

endlocal
