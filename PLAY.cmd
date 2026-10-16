@echo off
title Ashfall Ledger
cd /d "%~dp0"
echo.
echo   ASHFALL LEDGER
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
