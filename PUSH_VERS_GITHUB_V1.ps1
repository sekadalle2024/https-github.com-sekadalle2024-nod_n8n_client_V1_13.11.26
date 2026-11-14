# Script de push vers le nouveau repository GitHub V1
# Repository: https://github.com/sekadalle2024/nod_n8n_client_V1_13.11.26.git

Set-Location "h:\nod_n8n"
$env:Path = "C:\Program Files\Git\cmd;$env:Path"

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  PUSH VERS GITHUB - NOD N8N CLIENT V1                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`n[1/4] Vérification de l'état du repository..." -ForegroundColor Yellow
git status --short
$status = $LASTEXITCODE

Write-Host "`n[2/4] Affichage des remotes configurés..." -ForegroundColor Yellow
git remote -v

Write-Host "`n[3/4] Affichage des derniers commits..." -ForegroundColor Yellow
git log -3 --oneline --graph

Write-Host "`n[4/4] Push vers le repository backup..." -ForegroundColor Yellow
Write-Host "⚠️  Assurez-vous que le repository existe sur GitHub!" -ForegroundColor Red
Write-Host "URL: https://github.com/sekadalle2024/nod_n8n_client_V1_13.11.26`n" -ForegroundColor Cyan

$confirmation = Read-Host "Voulez-vous continuer le push? (o/n)"
if ($confirmation -eq 'o' -or $confirmation -eq 'O') {
    git push -u backup main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ SUCCÈS! Le code a été poussé vers GitHub" -ForegroundColor Green
        Write-Host "Repository: https://github.com/sekadalle2024/nod_n8n_client_V1_13.11.26" -ForegroundColor Green
    } else {
        Write-Host "`n❌ ERREUR lors du push" -ForegroundColor Red
        Write-Host "Vérifiez que:" -ForegroundColor Yellow
        Write-Host "  - Le repository existe sur GitHub" -ForegroundColor Yellow
        Write-Host "  - Vous avez les permissions d'écriture" -ForegroundColor Yellow
        Write-Host "  - Votre authentification GitHub est configurée" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n⚠️  Push annulé" -ForegroundColor Yellow
}

Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
