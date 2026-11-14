@echo off
echo ========================================
echo Arret de tous les services Nod...
echo ========================================

cd /d h:\nod_n8n

echo.
echo 1. Arret du serveur Node.js...
echo NOTE: Appuyez sur Ctrl+C dans le terminal du serveur
echo       ou tuez le processus manuellement
timeout /t 3 /nobreak

echo.
echo 2. Arret des containers Docker...
docker compose down

echo.
echo 3. Verification...
docker ps

echo.
echo ========================================
echo Services arretes avec succes!
echo ========================================
echo.
echo Pour redemarrer, lancez demarrer-tout.bat
pause
