@echo off
title Fraud Detection - Backend (Port 8000)
echo ============================================
echo  Fraud Detection Backend - FastAPI
echo  API:  http://localhost:8000
echo  Docs: http://localhost:8000/docs
echo ============================================
echo.
cd /d "C:\Users\DELL\Desktop\Fraud-Detection-Realtime\backend"
".venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause