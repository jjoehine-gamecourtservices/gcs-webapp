@echo off
setlocal enabledelayedexpansion

REM --- Prod bring-up (base compose only) ---
REM Must NOT include docker-compose.dev.yml

cd /d "%~dp0"

echo === Bringing up PROD (gcs_prod) ===

REM Preflight: show resolved config (fails fast if compose files are wrong)
docker compose -p gcs_prod -f docker-compose.yml config >nul
if errorlevel 1 (
  echo ERROR: docker compose config failed. Fix compose files before continuing.
  exit /b 1
)

REM Build + start
docker compose -p gcs_prod -f docker-compose.yml up -d --build
if errorlevel 1 (
  echo ERROR: docker compose up failed.
  exit /b 1
)

echo(
echo === PROD status ===
docker compose -p gcs_prod -f docker-compose.yml ps

endlocal
