@echo off
setlocal EnableExtensions DisableDelayedExpansion

REM --- Prod bring-up (image-only, version required) ---
REM Usage:
REM   prod-up.bat 0.1.0
REM   prod-up.bat                    (reads .env.prod if present)
REM   set GCS_VERSION=0.1.0 && prod-up.bat
REM
REM Deterministic commands:
REM   prod-up.bat ps
REM   prod-up.bat logs caddy --tail 120
REM   prod-up.bat restart caddy
REM   prod-up.bat exec api <command...>
REM   prod-up.bat config
REM   prod-up.bat health

cd /d "%~dp0"

set "PROJECT=gcs_prod"
set "ENV_FILE=.env.prod"
set "BASE_COMPOSE=docker-compose.yml"
set "PROD_COMPOSE=docker-compose.prod.yml"

if not exist "%BASE_COMPOSE%" (
  echo ERROR: Missing %BASE_COMPOSE% in %CD%
  exit /b 1
)
if not exist "%PROD_COMPOSE%" (
  echo ERROR: Missing %PROD_COMPOSE% in %CD%
  exit /b 1
)

if /i "%~1"=="help"   goto :help
if /i "%~1"=="/?"     goto :help
if /i "%~1"=="-h"     goto :help
if /i "%~1"=="--help" goto :help

REM --------------------------
REM Determine whether %1 is a compose verb (CMD) or a version (UP)
REM --------------------------
set "ARG1=%~1"
set "MODE=UP"

if /i "%ARG1%"=="up"      set "MODE=CMD"
if /i "%ARG1%"=="down"    set "MODE=CMD"
if /i "%ARG1%"=="restart" set "MODE=CMD"
if /i "%ARG1%"=="stop"    set "MODE=CMD"
if /i "%ARG1%"=="start"   set "MODE=CMD"
if /i "%ARG1%"=="ps"      set "MODE=CMD"
if /i "%ARG1%"=="logs"    set "MODE=CMD"
if /i "%ARG1%"=="config"  set "MODE=CMD"
if /i "%ARG1%"=="exec"    set "MODE=CMD"
if /i "%ARG1%"=="health"  set "MODE=CMD"

REM --------------------------
REM Resolve VERSION (strict)
REM --------------------------
set "VERSION="

REM In UP mode, first arg may be the version
if /i "%MODE%"=="UP" set "VERSION=%~1"

REM If no CLI version, try .env.prod
if "%VERSION%"=="" (
  if exist "%ENV_FILE%" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
      if /i "%%A"=="GCS_VERSION" set "VERSION=%%B"
    )
  )
)

REM If still empty, fall back to env var
if "%VERSION%"=="" set "VERSION=%GCS_VERSION%"

REM Trim whitespace (spaces + tabs)
for /f "tokens=* delims= " %%V in ("%VERSION%") do set "VERSION=%%V"
for /f "tokens=* delims=        " %%V in ("%VERSION%") do set "VERSION=%%V"

if "%VERSION%"=="" (
  echo ERROR: GCS_VERSION not set.
  echo Provide a version:
  echo   prod-up.bat 0.1.0
  echo Or create %ENV_FILE% with:
  echo   GCS_VERSION=0.1.0
  exit /b 1
)

set "GCS_VERSION=%VERSION%"

REM --------------------------
REM Compose options (deterministic env injection)
REM --------------------------
set "DC_OPTS=-p %PROJECT% -f %BASE_COMPOSE% -f %PROD_COMPOSE%"
if exist "%ENV_FILE%" set "DC_OPTS=--env-file %ENV_FILE% -p %PROJECT% -f %BASE_COMPOSE% -f %PROD_COMPOSE%"

REM Preflight: MUST evaluate prod override (fails if GCS_VERSION missing)
docker compose %DC_OPTS% config >nul
if errorlevel 1 (
  echo ERROR: docker compose config failed. Check GCS_VERSION and compose files.
  exit /b 1
)

if /i "%MODE%"=="CMD" goto :dispatch

REM =========================
REM Bring-up mode (original behavior)
REM =========================

echo === Bringing up PROD (%PROJECT%) with version %GCS_VERSION% ===

docker image inspect "gcs/api:%GCS_VERSION%" >nul 2>nul
if errorlevel 1 goto :missing_api
echo Found image: gcs/api:%GCS_VERSION%

docker image inspect "gcs/web:%GCS_VERSION%" >nul 2>nul
if errorlevel 1 goto :missing_web
echo Found image: gcs/web:%GCS_VERSION%

docker image inspect "caddy:2" >nul 2>nul
if errorlevel 1 goto :missing_caddy
echo Found image: caddy:2

docker compose %DC_OPTS% up -d --remove-orphans
if errorlevel 1 (
  echo ERROR: docker compose up failed.
  exit /b 1
)

echo(
echo === PROD status ===
docker compose %DC_OPTS% ps

echo(
echo === Verifying restart policy (must be unless-stopped) ===

call :assert_restart_policy api
if errorlevel 1 exit /b 1

call :assert_restart_policy web
if errorlevel 1 exit /b 1

call :assert_restart_policy caddy
if errorlevel 1 exit /b 1

echo OK: restart policy verified for api, web, caddy.

endlocal
exit /b 0


:dispatch
if /i "%ARG1%"=="health" goto :health

set "VERB=%ARG1%"

REM --- THE ONLY SHIFT IN THE ENTIRE FILE ---
shift

REM IMPORTANT:
REM - SHIFT updates %1..%9 but NOT %*
REM - So we forward ONLY numbered args.

if /i "%VERB%"=="config" goto :cmd_config
if /i "%VERB%"=="exec"   goto :cmd_exec

docker compose %DC_OPTS% %VERB% %1 %2 %3 %4 %5 %6 %7 %8 %9
exit /b %errorlevel%

:cmd_config
docker compose %DC_OPTS% config
exit /b %errorlevel%

:cmd_exec
docker compose %DC_OPTS% exec %1 %2 %3 %4 %5 %6 %7 %8 %9
exit /b %errorlevel%


:health
echo(
echo === PROD health (project: %PROJECT%, version: %GCS_VERSION%) ===

echo(
echo --- Containers ---
docker compose %DC_OPTS% ps
if errorlevel 1 goto :health_compose_fail

where curl >nul 2>nul
if errorlevel 1 goto :health_no_curl

echo(
echo --- HTTPS web (must return 200) ---
REM Windows curl uses Schannel; internal CA often triggers revocation-check failures.
REM For this internal LAN endpoint, we explicitly disable revocation check for curl only.
for /f "usebackq delims=" %%S in (`curl --ssl-no-revoke -sS -o nul -w "%%{http_code}" https://gcs.local/`) do set "WEB_CODE=%%S"
echo https://gcs.local/ -> %WEB_CODE%
if not "%WEB_CODE%"=="200" goto :health_https_web_fail

echo(
echo --- HTTPS API through proxy (must return 200) ---
for /f "usebackq delims=" %%S in (`curl --ssl-no-revoke -sS -o nul -w "%%{http_code}" https://gcs.local/api/health`) do set "API_CODE=%%S"
echo https://gcs.local/api/health -> %API_CODE%
if not "%API_CODE%"=="200" goto :health_https_api_fail

echo(
echo OK: health checks passed.
exit /b 0

:health_compose_fail
echo ERROR: compose ps failed.
exit /b 1

:health_no_curl
echo ERROR: curl not found on PATH.
exit /b 1

:health_https_web_fail
echo(
echo ERROR: HTTPS web check failed. Expected 200 from https://gcs.local/
exit /b 1

:health_https_api_fail
echo(
echo ERROR: HTTPS API check failed. Expected 200 from https://gcs.local/api/health
exit /b 1


:assert_restart_policy
setlocal EnableDelayedExpansion
set "SVC=%~1"
set "CID="
set "RP="

for /f "usebackq delims=" %%I in (`docker compose %DC_OPTS% ps -q %SVC%`) do set "CID=%%I"

if "!CID!"=="" (
  echo ERROR: Could not find container ID for service "%SVC%". Is it running?
  endlocal & exit /b 1
)

for /f "usebackq delims=" %%R in (`docker inspect -f "{{.HostConfig.RestartPolicy.Name}}" !CID!`) do set "RP=%%R"

echo %SVC%: reported restart policy = "!RP!"

if /i "!RP!"=="unless-stopped" (
  endlocal & exit /b 0
)

echo ERROR: Service "%SVC%" restart policy is NOT "unless-stopped".
echo Fix: Ensure docker-compose.prod.yml includes:
echo   services:
echo     %SVC%:
echo       restart: unless-stopped
echo Debug:
docker inspect -f "{{.Name}} -> {{json .HostConfig.RestartPolicy}}" !CID!
endlocal & exit /b 1


:missing_api
echo ERROR: Required image not found locally: gcs/api:%GCS_VERSION%
echo This prod deploy is image-only. Build/tag it first (release.bat / prod-release.bat).
exit /b 1

:missing_web
echo ERROR: Required image not found locally: gcs/web:%GCS_VERSION%
echo This prod deploy is image-only. Build/tag it first (release.bat / prod-release.bat).
exit /b 1

:missing_caddy
echo ERROR: Required image not found locally: caddy:2
echo Pull it once with:
echo   docker pull caddy:2
exit /b 1


:help
echo(
echo PROD ENTRYPOINT
echo(
echo Bring up prod:
echo   prod-up.bat 0.1.0
echo   prod-up.bat
echo(
echo Deterministic commands:
echo   prod-up.bat ps
echo   prod-up.bat logs caddy --tail 120
echo   prod-up.bat restart caddy
echo   prod-up.bat exec api ^<command...^>
echo   prod-up.bat config
echo   prod-up.bat health
echo(
exit /b 0
