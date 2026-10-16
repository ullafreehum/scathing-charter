@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$d=[Environment]::GetFolderPath('Desktop'); $s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $d 'Ashfall Ledger.lnk')); $s.TargetPath=(Join-Path '%~dp0' 'Play Ashfall Ledger.cmd'); $s.WorkingDirectory='%~dp0'; $s.WindowStyle=7; $s.Description='Ashfall Ledger (offline)'; $s.Save()"
if errorlevel 1 (echo Could not create the shortcut. & pause & exit /b 1)
echo.
echo   Done. There is now an "Ashfall Ledger" shortcut on your desktop.
echo.
pause
