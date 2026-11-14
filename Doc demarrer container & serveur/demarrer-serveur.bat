@echo off
echo ========================================
echo Demarrage du serveur Nod...
echo ========================================

cd /d h:\nod_n8n

echo.
echo 1. Verification des containers Docker...
docker ps | findstr "nod-local-postgres-1" >nul
if errorlevel 1 (
    echo ERREUR: Le container PostgreSQL n'est pas demarre
    echo Veuillez lancer demarrer-tout.bat d'abord
    pause
    exit /b 1
)

echo Containers OK
echo.
echo 2. Verification du fichier .env...
if not exist .env (
    echo ERREUR: Fichier .env introuvable
    pause
    exit /b 1
)

echo Fichier .env OK
echo.
echo 3. Demarrage du serveur...
echo URL d'acces: http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.

pnpm exec tsx src/server/index.ts
