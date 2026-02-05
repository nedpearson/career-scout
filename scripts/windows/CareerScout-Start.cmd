@echo off
setlocal

REM Starts the server in a new window (minimized).
for %%I in ("%~dp0..\..") do set "ROOT=%%~fI"

REM Start server in its own visible console window.
start "Career Scout Server" /min cmd /k ""%ROOT%\scripts\windows\CareerScout-Server.cmd""

endlocal
