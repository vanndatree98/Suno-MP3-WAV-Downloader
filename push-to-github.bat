@echo off
title Push Suno Downloader to GitHub
cd /d "%~dp0"

echo ========================================================
echo    Push Suno Downloader to GitHub (vanndatree98)
echo ========================================================
echo.

git status
echo.
echo [1/3] Adding changes...
git add .

echo [2/3] Committing changes...
git commit -m "Update Suno MP3 and WAV Downloader"

echo [3/3] Pushing to GitHub (main branch)...
git push -u origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [NOTICE] If repository is not yet created on GitHub:
    echo Opening https://github.com/new?name=Suno-MP3-WAV-Downloader ...
    echo Please click "Create repository" on GitHub, then run this file again!
    start "" "https://github.com/new?name=Suno-MP3-WAV-Downloader"
) else (
    echo.
    echo ========================================================
    echo    SUCCESSFULLY PUSHED TO GITHUB!
    echo    https://github.com/vanndatree98/Suno-MP3-WAV-Downloader
    echo ========================================================
)

pause
