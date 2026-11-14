@echo off
echo ========================================
echo Verification de l'etat des services...
echo ========================================

echo.
echo 1. Docker Desktop
docker --version
if errorlevel 1 (
    echo [X] Docker Desktop NOT RUNNING
) else (
    echo [OK] Docker Desktop RUNNING
)

echo.
echo 2. Containers Docker
docker ps
echo.
echo Containers attendus:
echo - nod-local-postgres-1 (PostgreSQL)
echo - nod-workspace
echo - nod-browser
echo - nod-local-workspace-network-1

echo.
echo 3. PostgreSQL
docker exec nod-local-postgres-1 pg_isready -U nod
if errorlevel 1 (
    echo [X] PostgreSQL NOT READY
) else (
    echo [OK] PostgreSQL READY
)

echo.
echo 4. Serveur Node.js
curl -s http://localhost:4310/api/audit/schemas >nul 2>&1
if errorlevel 1 (
    echo [X] Serveur Node.js NOT RESPONDING
) else (
    echo [OK] Serveur Node.js RESPONDING
)

echo.
echo ========================================
pause
