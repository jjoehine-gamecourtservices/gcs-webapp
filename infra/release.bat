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
docker compose -p gcs_build -f docker-compose.yml -f docker-compose.dev.yml build
if errorlevel 1 exit /b 1

echo Tagging images as gcs/api:%VERSION% and gcs/web:%VERSION% ...
docker image tag gcs/api:local gcs/api:%VERSION%
if errorlevel 1 exit /b 1
docker image tag gcs/web:local gcs/web:%VERSION%
if errorlevel 1 exit /b 1

echo Done.
echo Tagged:
echo   gcs/api:%VERSION%
echo   gcs/web:%VERSION%
exit /b 0
