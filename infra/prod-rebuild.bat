@echo off
setlocal enabledelayedexpansion

echo.
echo ================================================
echo   GCS PROD FULL REBUILD
echo ================================================
echo.

REM Always run relative to this script's folder
cd /d "%~dp0"

REM -----------------------------
REM STEP 1 - Bring stack down
REM -----------------------------
echo [1/2] Running prod-up.bat down ...
call prod-up.bat down
if errorlevel 1 (
    echo.
    echo ERROR: prod-up.bat down failed.
    echo.
    pause
    exit /b 1
)

REM -----------------------------
REM STEP 2 - Rebuild web image
REM -----------------------------
echo.
echo [2/2] Running web-rebuild.bat ...
call web-rebuild.bat
if errorlevel 1 (
    echo.
    echo ERROR: web-rebuild.bat failed.
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================
echo   REBUILD COMPLETE
echo ================================================
echo.

REM Success: auto close
endlocal
exit /b 0