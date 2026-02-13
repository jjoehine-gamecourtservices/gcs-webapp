@echo off
setlocal EnableExtensions

REM Always run from infra\ so relative paths are stable
cd /d "%~dp0"

REM --- Required defaults / portability guards ---
REM If GCS_VERSION isn't already set, default to current deployed version.
if "%GCS_VERSION%"=="" set "GCS_VERSION=0.1.2"

REM Compose project name (controls container/network/volume names)
set "COMPOSE_PROJECT_NAME=gcs_prod"

REM Compose files
set "COMPOSE_BASE=docker-compose.yml"
set "COMPOSE_PROD=docker-compose.prod.yml"
set "ENV_FILE=.env.prod"

REM --- Run ---
docker compose -p "%COMPOSE_PROJECT_NAME%" ^
  -f "%COMPOSE_BASE%" ^
  -f "%COMPOSE_PROD%" ^
  --env-file "%ENV_FILE%" %*

endlocal
