@echo off
setlocal enabledelayedexpansion

REM =========================================================
REM restart-api.bat
REM Rebuild + recreate ONLY the API service for PROD stack.
REM - Auto-detects repo root based on script location
REM - Reads GCS_VERSION from infra\.env.prod
REM - Builds image directly
REM - Force-recreates container so new image is used
REM =========================================================

set FAILED=0

REM --- Move to repo root (parent of infra folder) ---
cd /d "%~dp0"
if exist "infra" (
    REM Script is in repo root
) else (
    REM Script likely inside infra folder
    cd ..
)

REM --- Validate expected structure ---
if not exist "backend\Dockerfile" (
    echo [ERROR] Could not locate backend\Dockerfile
    set FAILED=1
    goto :END
)

if not exist "infra\.env.prod" (
    echo [ERROR] infra\.env.prod not found.
    set FAILED=1
    goto :END
)

REM --- Load GCS_VERSION from .env.prod ---
for /f "tokens=1,2 delims==" %%A in (infra\.env.prod) do (
    if "%%A"=="GCS_VERSION" set VERSION=%%B
)

if "%VERSION%"=="" (
    echo [ERROR] GCS_VERSION not found in infra\.env.prod
    set FAILED=1
    goto :END
)

set IMAGE=gamecourt/gcs-api:%VERSION%

echo.
echo =========================================
echo   GCS PROD: Rebuild + Recreate API
echo   Version: %VERSION%
echo =========================================
echo.

echo [1/3] Building API image (no cache)...
docker build --no-cache -t %IMAGE% -f backend\Dockerfile backend
if errorlevel 1 (
    echo.
    echo [ERROR] Docker build failed.
    set FAILED=1
    goto :END
)

echo.
echo [2/3] Recreating API container...
cd infra
docker compose --env-file .env.prod -p gcs_prod -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --force-recreate api
if errorlevel 1 (
    echo.
    echo [ERROR] Container recreate failed.
    set FAILED=1
    goto :END
)

echo.
echo [3/3] SUCCESS.
echo API rebuilt and container recreated.
echo.

:END
if %FAILED%==1 (
    echo.
    echo =========================================
    echo   FAILED - Window will remain open.
    echo =========================================
    echo.
    pause
    exit /b 1
) else (
    echo =========================================
    echo   DONE - Closing window.
    echo =========================================
    timeout /t 2 >nul
    exit /b 0
)