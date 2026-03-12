@echo off
echo === GCS PROD STACK VERIFICATION ===
echo.

echo --- Containers ---
call prod-up.bat ps

echo.
echo --- Gateway Health ---
curl -sS http://127.0.0.1:8787/health
echo.

echo.
echo --- Direct HTTPS Checks ---
curl --ssl-no-revoke -sS -o nul -w "Web: %%{http_code}" https://gcs.local/
echo.
curl --ssl-no-revoke -sS -o nul -w "API: %%{http_code}" https://gcs.local/api/health
echo.

echo.
echo Done. Containers should be healthy, gateway should return ok=true, and both HTTPS codes should be 200.
pause