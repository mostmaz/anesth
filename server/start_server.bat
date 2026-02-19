@echo off
title ICU Manager Server
:loop
cls
echo ----------------------------------------------------------------------
echo ICU Manager Server - Auto-Restart Mode
echo Press Ctrl+C to Stop
echo ----------------------------------------------------------------------
echo Starting server at %TIME%...
echo.
echo [LOG] Server started at %DATE% %TIME% >> error.log

:: Run the server and append stderr/stdout to error.log while also showing in console?
:: CMD cannot easily tee. We will let it run and redirect connection errors effectively.
:: For now, we run it. If it crashes, error.log will be appended if we use redirection,
:: but user wants to see it working too.
:: Let's use generic redirection for errors.

call npm start 2>> error.log

echo.
echo ----------------------------------------------------------------------
echo Server CRASHED or STOPPED! 
echo Check error.log for details.
echo Restarting in 5 seconds...
echo [LOG] Server crashed at %DATE% %TIME% >> error.log
echo ----------------------------------------------------------------------
timeout /t 5 >nul
goto loop
