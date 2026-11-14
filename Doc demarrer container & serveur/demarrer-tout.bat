@echo off
echo ========================================
echo Demarrage des containers Docker...
echo ========================================

cd /d h:\nod_n8n

echo.
echo 1. Verification de Docker Desktop...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERREUR: Docker Desktop n'est pas demarre
    echo Veuillez lancer Docker Desktop manuellement
    pause
    exit /b 1
)

echo Docker Desktop OK
echo.
echo 2. Demarrage des containers...
docker compose up -d

echo.
echo 3. Attente du demarrage...
timeout /t 10 /nobreak

echo.
echo 4. Verification de l'etat...
docker ps

echo.
echo ========================================
echo Containers demarres avec succes!
echo ========================================
echo.
echo Vous pouvez maintenant lancer demarrer-serveur.bat
pause
