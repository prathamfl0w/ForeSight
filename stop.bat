@echo off
title ForeSight Stopper
echo Stopping ForeSight backend server...

powershell -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"

echo ForeSight server on port 5000 has been stopped.
timeout /t 2 /nobreak >nul

