@echo off
setlocal
title Get WAV Player
set "INSTALLER=%TEMP%\get-wav-player-%RANDOM%-%RANDOM%.ps1"
set "INSTALL_URL=https://raw.githubusercontent.com/johart2030/wav-player/main/install-wav-player.ps1"

echo Downloading the WAV Player installer from GitHub...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; Invoke-WebRequest -UseBasicParsing -Uri $env:INSTALL_URL -OutFile $env:INSTALLER"
if errorlevel 1 goto failed

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%INSTALLER%" -Destination "%~dp0."
set "RESULT=%ERRORLEVEL%"
del "%INSTALLER%" >nul 2>&1
if not "%RESULT%"=="0" goto installFailed

echo.
echo WAV Player files are ready beside this file and your sound files.
echo Double-click "Run WAV Player.bat" to open the player.
pause
exit /b 0

:failed
echo.
echo Download failed. Check your internet connection and try again.
pause
exit /b 1

:installFailed
echo.
echo Installation failed. Check the message above and try again.
pause
exit /b 1
