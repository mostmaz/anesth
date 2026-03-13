@rem Gradle startup script for Windows - ICU-Manager APK build
@echo off

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "GRADLE_USER_HOME=C:\gradle"
set "GRADLE_DIR=C:\Users\Administrator\.gradle\wrapper\dists\gradle-8.14.3-all\10utluxaxniiv4wxiphsi49nj\gradle-8.14.3"
set "SCRIPT_DIR=%~dp0"

"%JAVA_HOME%\bin\java.exe" --patch-module java.base="%SCRIPT_DIR%gradle-patch" -Dgradle.user.home=C:\gradle -classpath "%GRADLE_DIR%\lib\gradle-launcher-8.14.3.jar" org.gradle.launcher.GradleMain %*
