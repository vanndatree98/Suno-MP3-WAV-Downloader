@echo off
title Suno Downloader Full HD
cd /d "%~dp0"

echo [INFO] Starting Suno MP3 and WAV Downloader...
powershell -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue"

start "" powershell -Command "Start-Sleep -Seconds 2; if (Test-Path 'C:\Program Files\Google\Chrome\Application\chrome.exe') { Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList '--window-size=1920,1080','http://localhost:3000' } else { Start-Process 'http://localhost:3000' }"

call npm.cmd run dev
pause
