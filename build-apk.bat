@echo off
set "ANDROID_HOME=C:\Users\Administrator\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=C:\Users\Administrator\AppData\Local\Android\Sdk"
set "JAVA_HOME=C:\Program Files\Java\jdk-17"
set "GRADLE_HOME=C:\Users\Administrator\.gradle\wrapper\dists\gradle-8.9-bin\90cnw93cvbtalezasaz0blq0a\gradle-8.9"
set "PATH=%GRADLE_HOME%\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin;%JAVA_HOME%\bin;%PATH%"

echo === Environment ===
echo ANDROID_HOME=%ANDROID_HOME%
echo JAVA_HOME=%JAVA_HOME%
echo GRADLE_HOME=%GRADLE_HOME%
echo.
echo === Starting Cordova Android build ===
cd /d "c:\Users\Administrator\Documents\d\ICU-Manager\android-apk"
"C:\Users\Administrator\AppData\Local\npm-cache\_npx\ff682b76deb22764\node_modules\cordova\bin\cordova.cmd" build android
