@echo off
cd /d h:\nod_n8n
echo ========================================
echo   DEMARRAGE COMPLET NOD
echo ========================================
echo.
echo [1/2] Demarrage des containers Docker...
docker compose up -d
if errorlevel 1 (
    echo ERREUR lors du demarrage des containers
    pause
    exit /b 1
)
echo.
echo Attente de 10 secondes pour PostgreSQL...
timeout /t 10 /nobreak >nul
echo.
echo [2/2] Verification des containers...
docker ps
echo.
echo ========================================
echo   CONTAINERS DEMARRES
echo ========================================
echo.
echo Maintenant, dans un autre terminal PowerShell :
echo   cd h:\nod_n8n
echo   pnpm exec tsx src/server/index.ts
echo.
pause
