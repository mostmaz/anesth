@echo off
echo Waiting for device...
C:\Users\Administrator\AppData\Local\Android\Sdk\platform-tools\adb.exe wait-for-device
:loop
C:\Users\Administrator\AppData\Local\Android\Sdk\platform-tools\adb.exe shell getprop sys.boot_completed | findstr "1" > nul
if %errorlevel% neq 0 (
  timeout /t 2 /nobreak > nul
  goto loop
)
echo Boot completed!
