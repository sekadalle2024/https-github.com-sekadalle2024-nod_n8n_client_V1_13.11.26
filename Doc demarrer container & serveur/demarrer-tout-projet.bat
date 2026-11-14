@echo off
echo ========================================
echo DEMARRAGE COMPLET DU PROJET NOD
echo ========================================
echo.
echo Ce script va demarrer:
echo 1. Les containers Docker (postgres, workspace, browser)
echo 2. Le serveur Node.js (port 4310)
echo.
echo Appuyez sur une touche pour continuer...
pause >nul

cd /d h:\nod_n8n

REM ========================================
REM ETAPE 1: Verification Docker Desktop
REM ========================================
echo.
echo [1/4] Verification de Docker Desktop...
docker --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERREUR] Docker Desktop n'est pas demarre
    echo.
    echo ACTION REQUISE:
    echo 1. Lancez Docker Desktop manuellement
    echo 2. Attendez que l'icone Docker soit VERTE dans la barre des taches
    echo 3. Relancez ce script
    echo.
    pause
    exit /b 1
)
echo [OK] Docker Desktop est lance

REM ========================================
REM ETAPE 2: Demarrage des containers
REM ========================================
echo.
echo [2/4] Demarrage des containers Docker...
docker compose up -d

if errorlevel 1 (
    echo.
    echo [ERREUR] Echec du demarrage des containers
    echo Consultez les logs avec: docker compose logs
    echo.
    pause
    exit /b 1
)

echo [OK] Containers demarres
echo.
echo Attente de la stabilisation (15 secondes)...
timeout /t 15 /nobreak >nul

REM ========================================
REM ETAPE 3: Verification PostgreSQL
REM ========================================
echo.
echo [3/4] Verification de PostgreSQL...

REM Attendre que PostgreSQL soit pret (max 120 secondes, fsync peut prendre 90s+)
set /a count=0
:wait_postgres
docker exec nod-local-postgres-1 pg_isready -U nod >nul 2>&1
if errorlevel 1 (
    set /a count+=1
    if %count% LSS 120 (
        echo Attente de PostgreSQL... (%count%/120s^)
        timeout /t 1 /nobreak >nul
        goto wait_postgres
    ) else (
        echo.
        echo [ERREUR] PostgreSQL ne repond pas apres 120 secondes
        echo Verifiez les logs: docker logs nod-local-postgres-1
        echo.
        echo ASTUCE: PostgreSQL peut prendre jusqu'a 2 minutes lors du premier demarrage
        echo         Si les containers tournent, attendez encore 30s et reessayez
        echo.
        pause
        exit /b 1
    )
)

echo [OK] PostgreSQL est pret

REM ========================================
REM ETAPE 4: Demarrage du serveur Node.js
REM ========================================
echo.
echo [4/4] Demarrage du serveur Node.js...

REM Verification du fichier .env
if not exist .env (
    echo.
    echo [ERREUR] Fichier .env introuvable
    echo Le fichier .env doit contenir:
    echo - DATABASE_URL
    echo - NOD_VAULT_KEY
    echo - GEMINI_API_KEY
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo SYSTEME DEMARRE AVEC SUCCES!
echo ========================================
echo.
echo URL d'acces:
echo http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU
echo.
echo Le serveur Node.js va maintenant demarrer...
echo Temps de demarrage estime: 30-60 secondes
echo.
echo IMPORTANT:
echo - NE FERMEZ PAS cette fenetre (le serveur y tourne)
echo - Pour arreter le serveur: Ctrl+C
echo - Pour arreter tout le systeme: arreter-tout.bat
echo.
echo ========================================
echo LOGS DU SERVEUR (en temps reel):
echo ========================================
echo.

REM Demarrer le serveur Node.js
pnpm exec tsx src/server/index.ts

REM Si le serveur s'arrete
echo.
echo ========================================
echo Le serveur s'est arrete
echo ========================================
echo.
pause
