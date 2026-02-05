@echo off
setlocal

REM Start the Career Scout server (dev mode) in this window.
REM Repo root is two levels up from this script.
for %%I in ("%~dp0..\..") do set "ROOT=%%~fI"
pushd "%ROOT%" >nul

title Career Scout Server
echo Starting Career Scout server from: "%ROOT%"
echo.

npm run dev

popd >nul
endlocal
