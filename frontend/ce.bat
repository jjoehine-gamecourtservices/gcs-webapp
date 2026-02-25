@echo off
setlocal

REM Run from frontend\ (where package.json lives)
set BASE=src\pages\admin

echo Checking for existing AdminPage.tsx...
if not exist "%BASE%\AdminPage.tsx" (
  echo ERROR: "%BASE%\AdminPage.tsx" not found.
  echo Make sure you are running this from: frontend\
  echo And that this file exists: %BASE%\AdminPage.tsx
  echo.
  pause
  exit /b 1
)

echo Creating Admin sub-structure under "%BASE%" ...

REM Create folders
mkdir "%BASE%\layout" 2>nul
mkdir "%BASE%\state" 2>nul
mkdir "%BASE%\permissions" 2>nul
mkdir "%BASE%\pages" 2>nul

mkdir "%BASE%\pages\home" 2>nul
mkdir "%BASE%\pages\users" 2>nul
mkdir "%BASE%\pages\permissions" 2>nul

REM Create files (do NOT touch AdminPage.tsx)
if not exist "%BASE%\admin.types.ts" type nul > "%BASE%\admin.types.ts"
if not exist "%BASE%\admin.nav.ts" type nul > "%BASE%\admin.nav.ts"

if not exist "%BASE%\layout\AdminLayout.tsx" type nul > "%BASE%\layout\AdminLayout.tsx"

if not exist "%BASE%\state\admin.state.ts" type nul > "%BASE%\state\admin.state.ts"

if not exist "%BASE%\permissions\permissions.types.ts" type nul > "%BASE%\permissions\permissions.types.ts"
if not exist "%BASE%\permissions\permissions.guards.tsx" type nul > "%BASE%\permissions\permissions.guards.tsx"

if not exist "%BASE%\pages\home\AdminHomePage.tsx" type nul > "%BASE%\pages\home\AdminHomePage.tsx"
if not exist "%BASE%\pages\home\AdminTileGrid.tsx" type nul > "%BASE%\pages\home\AdminTileGrid.tsx"
if not exist "%BASE%\pages\home\AdminTile.tsx" type nul > "%BASE%\pages\home\AdminTile.tsx"

if not exist "%BASE%\pages\users\UsersListPage.tsx" type nul > "%BASE%\pages\users\UsersListPage.tsx"
if not exist "%BASE%\pages\users\UsersTable.tsx" type nul > "%BASE%\pages\users\UsersTable.tsx"
if not exist "%BASE%\pages\users\users.mock.ts" type nul > "%BASE%\pages\users\users.mock.ts"

if not exist "%BASE%\pages\permissions\PermissionsPage.tsx" type nul > "%BASE%\pages\permissions\PermissionsPage.tsx"

echo.
echo DONE. Admin structure created under: %BASE%
echo (AdminPage.tsx was left untouched.)
echo.
pause