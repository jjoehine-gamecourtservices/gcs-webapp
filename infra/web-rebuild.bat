@echo off
setlocal EnableDelayedExpansion

REM =========================================
REM   GCS Web Rebuild Script (Prod-Synced)
REM =========================================

REM Move to repo root (script assumed in infra\)
cd /d "%~dp0\.."

REM ---- Load GCS_VERSION from infra\.env.prod ----
set ENV_FILE=infra\.env.prod

if not exist "%ENV_FILE%" (
    echo.
    echo ERROR: %ENV_FILE% not found.
    exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
    if /I "%%A"=="GCS_VERSION" (
        set VERSION=%%B
    )
)

if "%VERSION%"=="" (
    echo.
    echo ERROR: GCS_VERSION not found in %ENV_FILE%.
    exit /b 1
)

set IMAGE=gamecourt/gcs-web:%VERSION%

echo.
echo =========================================
echo   Rebuilding GCS Web Image %VERSION%
echo =========================================
echo.

echo.
echo [1/4] Building web image (no cache)...
docker build --no-cache -t %IMAGE% -f frontend/Dockerfile frontend
if errorlevel 1 goto :error

echo.
echo [2/4] Recreating web container via prod wrapper...
cd infra
call prod-up.bat up -d
if errorlevel 1 goto :error

echo.
echo [3/4] Verifying running containers...
call prod-up.bat ps

echo.
echo =========================================
echo   Web rebuild complete.
echo =========================================
echo.
exit /b 0

:error
echo.
echo *** ERROR during rebuild ***
exit /b 1