@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   REVA Acoustic - Website Launcher
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js was not found on this computer.
    echo Please install it from https://nodejs.org and run this file again.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing dependencies - this only happens once...
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install failed. See the messages above.
        pause
        exit /b 1
    )
    echo.
)

echo Starting the REVA Acoustic server...
echo   Site:   http://localhost:3000
echo   Admin:  http://localhost:3000/admin
echo   Press Ctrl+C in this window to stop the server.
echo.

start "" "http://localhost:3000"

call npm start

pause
