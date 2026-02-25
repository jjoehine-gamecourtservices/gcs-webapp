@echo off
cd /d "%~dp0"

echo.
echo =============================
echo GCS Git Save Utility
echo =============================
echo.

git status
if errorlevel 1 goto :error

echo.
set /p msg=Enter commit message (leave blank for auto message): 

if "%msg%"=="" (
    for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set ts=%%i
    set msg=Auto save %ts%
)

echo.
echo Staging changes...
git add .
if errorlevel 1 goto :error

echo.
echo Committing...
git commit -m "%msg%"
if errorlevel 1 goto :error

echo.
echo Pushing...
git push
if errorlevel 1 goto :error

echo.
echo =============================
echo Git save successful.
echo =============================
timeout /t 1 >nul
exit /b 0


:error
echo.
echo =============================
echo ERROR occurred.
echo Fix the issue above.
echo =============================
echo.
pause
exit /b 1