@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================
REM prod-up.bat — hardened PROD entrypoint (Windows / Docker Desktop)
REM Guarantees:
REM   - ALWAYS uses: --env-file .env.prod
REM   - ALWAYS uses: -p gcs_prod -f docker-compose.yml -f docker-compose.prod.yml
REM   - Fails fast if .env.prod missing
REM   - No silent fallbacks / no version drift (version arg must match .env.prod)
REM   - exec uses -T
REM   - pyc pipes stdin into python -
REM   - Exit codes propagate
REM ============================================================

echo [prod-up] START cwd="%CD%" arg1="%~1"

REM Move to script directory (infra/)
set "HERE=%~dp0"
cd /d "%HERE%" || goto :fatal

set "PROJECT=gcs_prod"
set "ENV_FILE=%HERE%.env.prod"

REM Fail fast if env file is missing
if not exist "%ENV_FILE%" (
  echo [prod-up] ERROR: missing required env file: "%ENV_FILE%"
  exit /b 10
)

REM Compose base (ALWAYS uses env-file + project + both compose files)
set "DC=docker compose --env-file ""%ENV_FILE%"" -p %PROJECT% -f docker-compose.yml -f docker-compose.prod.yml"

REM ---- Read GCS_VERSION from .env.prod (PowerShell, no nested quotes) ----
REM Pass ENV_FILE through environment to avoid CMD quoting traps.
set "ENV_GCS_VERSION="
for /f "tokens=1,* delims==" %%A in ('findstr /b /c:"GCS_VERSION=" "%ENV_FILE%"') do set "ENV_GCS_VERSION=%%B"

if not defined ENV_GCS_VERSION (
  echo [prod-up] ERROR: GCS_VERSION is missing in "%ENV_FILE%"
  exit /b 11
)

set "ENV_GCS_VERSION=%ENV_GCS_VERSION:"=%"
set "ENV_GCS_VERSION=%ENV_GCS_VERSION:'=%"

REM Verb dispatch
if /I "%~1"=="up"      goto :cmd_up
if /I "%~1"=="down"    goto :cmd_down
if /I "%~1"=="ps"      goto :cmd_ps
if /I "%~1"=="logs"    goto :cmd_logs
if /I "%~1"=="restart" goto :cmd_restart
if /I "%~1"=="exec"    goto :cmd_exec
if /I "%~1"=="pyc"     goto :cmd_pyc
if /I "%~1"=="config"  goto :cmd_config

REM Default: treat first arg as version (legacy surface)
set "REQ_VERSION=%~1"
goto :do_up

:cmd_up
set "REQ_VERSION=%~2"
goto :do_up

:do_up
REM If caller omitted a version for "up", use env version.
if "%REQ_VERSION%"=="" set "REQ_VERSION=!ENV_GCS_VERSION!"

REM Drift prevention: caller version must match .env.prod version
if /I not "%REQ_VERSION%"=="!ENV_GCS_VERSION!" (
  echo [prod-up] ERROR: version mismatch. Refusing to run.
  echo [prod-up]        .env.prod GCS_VERSION = "!ENV_GCS_VERSION!"
  echo [prod-up]        requested version     = "%REQ_VERSION%"
  exit /b 12
)

echo [prod-up] Bringing up PROD (%PROJECT%) version "!ENV_GCS_VERSION!" using "%ENV_FILE%"

%DC% up -d || goto :compose_fail

echo.
echo [prod-up] Checking for existing database to back up

REM Ensure host backup directory exists (alongside this script)
if not exist "%HERE%backups" mkdir "%HERE%backups"

REM If DB exists inside container, copy it to host before migrations
%DC% exec -T api sh -c "test -f /data/gcs.db"
if errorlevel 1 (
  echo [prod-up] No existing database found. Skipping backup.
) else (
  for /f %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TS=%%T"
  set "BACKUP_FILE=%HERE%backups\gcs_!TS!.db"
  echo [prod-up] Backing up database to "!BACKUP_FILE!"
  %DC% cp api:/data/gcs.db "!BACKUP_FILE!"
  if errorlevel 1 (
    echo.
    echo [prod-up] ERROR: Failed to create database backup. Aborting deployment.
    exit /b 5
  )
)

echo.
echo [prod-up] Running Alembic upgrade (auto-enforced)

%DC% exec -T api alembic upgrade head
if errorlevel 1 (
  echo.
  echo [prod-up] ERROR: Alembic upgrade failed. Aborting deployment.
  exit /b 3
)

echo.
echo [prod-up] Waiting for API health (timeout 60s)

set /a WAIT_SECONDS=60
set /a ELAPSED=0

:health_loop
for /f %%H in ('docker inspect %PROJECT%-api-1 --format "{{.State.Health.Status}}" 2^>NUL') do set "STATUS=%%H"

if /I "!STATUS!"=="healthy" goto :health_ok

timeout /t 2 >nul
set /a ELAPSED+=2

if !ELAPSED! GEQ !WAIT_SECONDS! (
  echo.
  echo [prod-up] ERROR: API did not become healthy within !WAIT_SECONDS! seconds.
  exit /b 4
)

goto :health_loop

:health_ok
echo [prod-up] API is healthy.

echo.
echo [prod-up] PROD status
%DC% ps
exit /b 0

:cmd_down
%DC% down
exit /b %ERRORLEVEL%

:cmd_ps
%DC% ps
exit /b %ERRORLEVEL%

:cmd_config
%DC% config
exit /b %ERRORLEVEL%

:cmd_logs
shift
if "%~1"=="" goto :usage
set "SVC=%~1"
shift

set "TAIL="
:logs_tail_loop
if "%~1"=="" goto :logs_tail_done
set "TAIL=!TAIL! %~1"
shift
goto :logs_tail_loop
:logs_tail_done
if defined TAIL set "TAIL=!TAIL:~1!"

%DC% logs %SVC% %TAIL%
exit /b %ERRORLEVEL%

:cmd_restart
shift
if "%~1"=="" goto :usage
set "SVC=%~1"
shift

set "TAIL="
:restart_tail_loop
if "%~1"=="" goto :restart_tail_done
set "TAIL=!TAIL! %~1"
shift
goto :restart_tail_loop
:restart_tail_done
if defined TAIL set "TAIL=!TAIL:~1!"

%DC% restart %SVC% %TAIL%
exit /b %ERRORLEVEL%

:cmd_exec
shift
if "%~1"=="" goto :usage
set "SVC=%~1"
shift
if "%~1"=="" goto :usage

REM Guardrail: python -c is NOT reliable via CMD quoting.
REM Force users to use pyc for embedded code.
if /I "%~1"=="python" (
  if /I "%~2"=="-c" (
    echo [prod-up] ERROR: python -c is not supported via exec on Windows CMD.
    echo [prod-up]        Use: prod-up.bat pyc %SVC% "^<python code^>" [args...]
    exit /b 2
  )
)

set "TAIL="
:exec_tail_loop
if "%~1"=="" goto :exec_tail_done
set "TAIL=!TAIL! %~1"
shift
goto :exec_tail_loop
:exec_tail_done
if defined TAIL set "TAIL=!TAIL:~1!"

REM exec is non-interactive by default (CI-safe)
%DC% exec -T %SVC% %TAIL%
exit /b %ERRORLEVEL%

REM NOTE: This block is quote-sensitive. Do not refactor without running the pyc verification tests.
:cmd_pyc
REM prod-up.bat pyc <service> "<python code>" [args...]
shift
if "%~1"=="" goto :usage
set "SVC=%~1"
shift
if "%~1"=="" goto :usage

set "PYC_CODE=%~1"
shift

set "TAIL="
:pyc_tail_loop
if "%~1"=="" goto :pyc_tail_done
set "ARG=%1"
if not "!ARG!"=="!ARG: =!" set "ARG=""!ARG!"""
set "TAIL=!TAIL! !ARG!"
shift
goto :pyc_tail_loop
:pyc_tail_done
if defined TAIL set "TAIL=!TAIL:~1!"

REM Pipe code via stdin to python - using PowerShell argument-safe invocation
REM (no CMD quoting of docker compose args)
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; $code=$env:PYC_CODE; if([string]::IsNullOrEmpty($code)){ exit 2 }; $envFile=$env:ENV_FILE; $code | & docker compose --env-file $envFile -p '%PROJECT%' -f docker-compose.yml -f docker-compose.prod.yml exec -T '%SVC%' python - %TAIL%; exit $LASTEXITCODE"
exit /b %ERRORLEVEL%


:compose_fail
echo [prod-up] ERROR: docker compose failed
exit /b 1

:usage
echo Usage:
echo   prod-up.bat ^<version^>               ^(must match .env.prod GCS_VERSION^)
echo   prod-up.bat up [version]             ^(version optional; must match .env.prod^)
echo   prod-up.bat down
echo   prod-up.bat ps
echo   prod-up.bat logs ^<service^> [args...]
echo   prod-up.bat restart ^<service^> [args...]
echo   prod-up.bat exec ^<service^> ^<command...^>
echo   prod-up.bat pyc ^<service^> "^<python code^>" [args...]
echo   prod-up.bat config
exit /b 1

:fatal
echo [prod-up] FATAL: could not change directory
exit /b 1
