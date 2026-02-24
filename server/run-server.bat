@echo off
title ICU-Manager-Backend
echo Stopping existing node processes...
taskkill /F /IM node.exe >nul 2>&1

:loop
echo.
echo ==================================================
echo Starting Backend Server (npm run dev)...
echo ==================================================
call npm run dev

echo.
echo ==================================================
echo Server stopped or crashed with exit code %errorlevel%.
echo Restarting in 5 seconds...
echo ==================================================
timeout /t 5
goto loop
