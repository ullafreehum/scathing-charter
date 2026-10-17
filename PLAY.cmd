@echo off
title The Scathing Charter
cd /d "%~dp0"
echo.
echo   THE SCATHING CHARTER
echo   ==============
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo   Node.js is not installed yet.
  echo   Your browser will open the Node.js download page.
  echo   Install the "LTS" version, then double-click PLAY.cmd again.
  start "" https://nodejs.org/en/download
  echo.
  pause
  exit /b 1
)
rem A copy with the bundled offline edition plays from it: no internet, no npm install.
if not exist node_modules for %%Z in ("download\AshGame-offline-*.zip") do set "OFFZIP=%%~fZ"
if defined OFFZIP (
  echo   Unpacking the offline game, no internet needed...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Force -LiteralPath $env:OFFZIP -DestinationPath ."
  call "AshGame\Play The Scathing Charter.cmd"
  exit /b
)
if not exist node_modules (
  echo   First launch: downloading the game's parts. This takes 1-3 minutes.
  echo   Warnings in yellow are normal. Please wait...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo   Something went wrong while installing. See "If something goes wrong" in README.md.
    pause
    exit /b 1
  )
)
echo.
echo   Starting the game. Your browser will open in a few seconds.
echo   KEEP THIS WINDOW OPEN while you play. Close it when you are done.
echo   If the browser does not open, go to:  http://localhost:5173
echo.
call npm start
pause
