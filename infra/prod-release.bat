@echo off
setlocal

cd /d "%~dp0"

REM Usage:
REM   prod-release.bat 0.1.2

set "VERSION=%~1"
if "%VERSION%"=="" (
  echo ERROR: Version required.
  echo Usage: prod-release.bat 0.1.2
  exit /b 1
)

echo === RELEASE + DEPLOY %VERSION% ===

REM Build + tag
call release.bat %VERSION%
if errorlevel 1 exit /b 1

REM Update .env.prod to make this the current prod version
echo GCS_VERSION=%VERSION% > .env.prod

REM Deploy
call prod-up.bat %VERSION%
if errorlevel 1 exit /b 1

echo === DONE: PROD running %VERSION% ===
endlocal
