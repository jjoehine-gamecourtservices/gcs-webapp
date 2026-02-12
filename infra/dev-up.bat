@echo off
setlocal

cd /d "%~dp0"

echo === Bringing up DEV (gcs_dev) ===

REM Preflight: ensure the combined config is valid
docker compose -p gcs_dev -f docker-compose.yml -f docker-compose.dev.yml config >nul
if errorlevel 1 (
  echo ERROR: docker compose config failed.
  exit /b 1
)

REM Build + start
docker compose -p gcs_dev -f docker-compose.yml -f docker-compose.dev.yml up -d --build
if errorlevel 1 (
  echo ERROR: docker compose up failed.
  exit /b 1
)

echo(
echo === DEV status ===
docker compose -p gcs_dev -f docker-compose.yml -f docker-compose.dev.yml ps

endlocal
