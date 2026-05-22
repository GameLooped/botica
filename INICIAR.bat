@echo off
title Nova Salud - Sistema de Gestion
color 0A

echo.
echo  ============================================
echo    Nova Salud - Sistema de Gestion Botica
echo  ============================================
echo.

:: Start Backend
echo  [1/2] Iniciando Backend API (puerto 3001)...
start "Nova Salud - Backend" cmd /k "cd /d %~dp0backend && node server.js"

:: Wait a moment for backend to start
timeout /t 2 /nobreak >nul

:: Start Frontend
echo  [2/2] Iniciando Frontend (puerto 5173)...
start "Nova Salud - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

:: Wait for frontend to start
timeout /t 4 /nobreak >nul

:: Open browser
echo.
echo  Abriendo el navegador...
start http://localhost:5173

echo.
echo  ============================================
echo    Sistema iniciado correctamente!
echo    Abre: http://localhost:5173
echo  ============================================
echo.
pause
