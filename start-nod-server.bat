@echo off
cd /d h:\nod_n8n
echo ========================================
echo   Demarrage du serveur Nod...
echo ========================================
echo.
pnpm exec tsx src/server/index.ts
pause
