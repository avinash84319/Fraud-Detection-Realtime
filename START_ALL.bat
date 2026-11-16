@echo off
title Fraud Detection - Full Launcher
echo ============================================
echo  Fraud Detection System - Full Launcher
echo ============================================
echo.
echo Starting Backend in new window...
start "Fraud Backend" cmd /k "C:\Users\DELL\Desktop\Fraud-Detection-Realtime\START_BACKEND.bat"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak

echo Starting Frontend in new window...
start "Fraud Frontend" cmd /k "C:\Users\DELL\Desktop\Fraud-Detection-Realtime\START_FRONTEND.bat"

echo Waiting 5 seconds for frontend to start...
timeout /t 5 /nobreak

echo Opening browser tabs...
start "" "http://localhost:3000/transactor"
timeout /t 1 /nobreak
start "" "http://localhost:3000/admin"
timeout /t 1 /nobreak
start "" "http://localhost:3000/banker"

echo.
echo Done! Two terminal windows are running the servers.
echo Close them to stop the servers.
pause