@echo off
title MarkU Server (Port 3001)
cd /d "%~dp0"
cls
echo ====================================================================
echo   MARK U LOYALTY PLATFORM - PRODUCTION SERVER (PORT 3001)
echo ====================================================================
echo.
echo Starting MarkU server...
echo Local Portal : http://localhost:3001
echo Owner Login  : http://localhost:3001/owner/login.html
echo Customer Pass: http://localhost:3001/scan.html
echo.
node server.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Server stopped with error.
    pause
)
