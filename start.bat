@echo off
title ForeSight Launcher
echo ===================================================
echo Starting ForeSight Backend and Frontend...
echo ===================================================

:: Start backend silently in background (persists even if this window is closed)
powershell -Command "Start-Process node -ArgumentList 'server.js' -WorkingDirectory '%~dp0server' -WindowStyle Hidden"

:: Wait 2 seconds for server to initialize
timeout /t 2 /nobreak >nul

:: Open website in default browser
start "" "%~dp0ForeSight\index.html"

echo.
echo ForeSight is now running!
echo - Backend: http://localhost:5000
echo - Website opened in your browser.
echo.
echo You can safely close this terminal window.
pause

