@rem Gradle startup script for Windows - ICU-Manager APK build
@echo off

set "JAVA_HOME=C:\Program Files\Java\jdk-17"
set "GRADLE_DIR=C:\Users\Administrator\.gradle\wrapper\dists\gradle-8.14.3-all\10utluxaxniiv4wxiphsi49nj\gradle-8.14.3"

"%JAVA_HOME%\bin\java.exe" -classpath "%GRADLE_DIR%\lib\gradle-launcher-8.14.3.jar" org.gradle.launcher.GradleMain %*
