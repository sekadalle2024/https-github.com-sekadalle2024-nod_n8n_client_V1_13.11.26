#!/usr/bin/env pwsh
# Script de push final vers GitHub V1
# Exécutez ce script dans votre terminal PowerShell normal

Set-Location "h:\nod_n8n"

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      PUSH VERS GITHUB - NOD N8N CLIENT V1                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "Repository cible:" -ForegroundColor Yellow
Write-Host "https://github.com/sekadalle2024/https-github.com-sekadalle2024-nod_n8n_client_V1_13.11.26`n" -ForegroundColor White

Write-Host "[INFO] Une fenêtre d'authentification GitHub peut s'ouvrir..." -ForegroundColor Cyan
Write-Host "[INFO] Connectez-vous avec votre compte GitHub`n" -ForegroundColor Cyan

# Push vers le nouveau repository
git push -u backup main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                    ✅ SUCCÈS !                            ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host "`nVotre code a été poussé vers GitHub avec succès!" -ForegroundColor Green
    Write-Host "URL: https://github.com/sekadalle2024/https-github.com-sekadalle2024-nod_n8n_client_V1_13.11.26`n" -ForegroundColor Cyan
} else {
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║                    ❌ ERREUR                              ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host "`nLe push a échoué. Vérifiez:" -ForegroundColor Yellow
    Write-Host "  • Votre authentification GitHub" -ForegroundColor Yellow
    Write-Host "  • Vos permissions sur le repository" -ForegroundColor Yellow
    Write-Host "  • Que le repository existe bien sur GitHub`n" -ForegroundColor Yellow
}

Read-Host "Appuyez sur Entrée pour fermer"
