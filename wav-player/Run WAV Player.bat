@echo off
title WAV Player
cd /d "%~dp0"
py -3 server.py
if errorlevel 1 (
    echo.
    echo Could not start WAV Player. Make sure Python 3 is installed.
    pause
)
