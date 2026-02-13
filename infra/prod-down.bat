@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

REM Usage:
REM   prod-down.bat
REM   prod-down.bat 0.1.0

set "VERSION=%~1"

REM If no arg provided, try to infer from running containers
if "%VERSION%"=="" (
  for /f "usebackq delims=" %%i in (`docker compose -p gcs_prod ps --format "{{.Image}}" 2^>nul ^| findstr /i "gcs/api:"`) do (
    set "IMG=%%i"
    goto :GOT_IMG
  )
)

:GOT_IMG
if "%VERSION%"=="" (
  if defined IMG (
    REM IMG example: gcs/api:0.1.0
    for /f "tokens=2 delims=:" %%v in ("!IMG!") do set "VERSION=%%v"
  )
)

REM If still empty, fall back to env var if user set it
if "%VERSION%"=="" (
  set "VERSION=%GCS_VERSION%"
)

if "%VERSION%"=="" (
  echo ERROR: Could not determine GCS_VERSION.
  echo If containers are running, this script should infer it automatically.
  echo Otherwise run: prod-down.bat 0.1.0
  exit /b 1
)

set "GCS_VERSION=%VERSION%"

echo === Stopping PROD gcs_prod version %GCS_VERSION% ===

docker compose -p gcs_prod -f docker-compose.yml -f docker-compose.prod.yml down --remove-orphans
if errorlevel 1 (
  echo ERROR: docker compose down failed.
  exit /b 1
)

echo === PROD stopped ===
endlocal
