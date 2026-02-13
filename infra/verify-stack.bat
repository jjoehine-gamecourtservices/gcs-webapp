@echo off
echo === GCS PROD STACK VERIFICATION ===
echo.

echo --- Containers ---
prod-up.bat ps

echo.
echo --- Health Checks ---
prod-up.bat health

echo.
echo --- Direct HTTPS Checks ---
curl --ssl-no-revoke -sS -o nul -w "Web: %{http_code}" https://gcs.local/ & echo.
curl --ssl-no-revoke -sS -o nul -w "API: %{http_code}" https://gcs.local/api/health & echo.

echo.
echo Done. All codes should be 200.
pause
