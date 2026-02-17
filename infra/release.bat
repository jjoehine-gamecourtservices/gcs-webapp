@echo off
setlocal enabledelayedexpansion

REM Usage:
REM   release.bat 0.1.0
REM   set GCS_VERSION=0.1.0 && release.bat

cd /d "%~dp0"

REM Preflight: Docker must be running
docker info >nul 2>&1
if errorlevel 1 (
  echo ERROR: Docker is not running or not reachable. Start Docker Desktop and try again.
  exit /b 1
)

set "VERSION=%~1"
if "%VERSION%"=="" set "VERSION=%GCS_VERSION%"

if "%VERSION%"=="" (
  echo ERROR: GCS_VERSION not set.
  echo Usage: release.bat 0.1.0
  exit /b 1
)

echo Building images (local)...
docker compose -p gcs_build -f docker-compose.yml -f docker-compose.release.yml build
if errorlevel 1 exit /b 1

echo Tagging images as gamecourt/gcs-api:%VERSION% and gamecourt/gcs-web:%VERSION% ...
docker image tag gamecourt/gcs-api:local gamecourt/gcs-api:%VERSION%
if errorlevel 1 exit /b 1
docker image tag gamecourt/gcs-web:local gamecourt/gcs-web:%VERSION%
if errorlevel 1 exit /b 1

echo Done.
echo Tagged:
echo   gamecourt/gcs-api:%VERSION%
echo   gamecourt/gcs-web:%VERSION%
exit /b 0
