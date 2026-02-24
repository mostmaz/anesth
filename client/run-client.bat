@echo off
title ICU-Manager-Frontend

:loop
echo.
echo ==================================================
echo Starting Frontend Client (npm run dev)...
echo ==================================================
call npm run dev

echo.
echo ==================================================
echo Client stopped or crashed with exit code %errorlevel%.
echo Restarting in 5 seconds...
echo ==================================================
timeout /t 5
goto loop
