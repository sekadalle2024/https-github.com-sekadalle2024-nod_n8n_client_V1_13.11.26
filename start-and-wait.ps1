# Script de démarrage du serveur Nod avec attente
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEMARRAGE SERVEUR NOD" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Arrêter les anciens processus
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Démarrer le serveur
Write-Host "🚀 Lancement du serveur..." -ForegroundColor Yellow
cd h:\nod_n8n
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd h:\nod_n8n ; pnpm exec tsx src/server/index.ts"

# Attendre que le port soit ouvert
Write-Host ""
Write-Host "⏳ Attente du démarrage..." -ForegroundColor Yellow
$ready = $false
for ($i=1; $i -le 30; $i++) {
    Start-Sleep -Seconds 2
    $listening = netstat -ano | findstr ":4310" | findstr "LISTENING"
    if ($listening) {
        $ready = $true
        Write-Host ""
        Write-Host "✅ SERVEUR PRÊT !" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Ouverture de l'application..." -ForegroundColor Cyan
        Start-Sleep -Seconds 1
        Start-Process "http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU"
        Write-Host ""
        Write-Host "📊 Cherchez 'Audit Tables' dans la sidebar" -ForegroundColor White
        break
    }
    Write-Host "  Tentative $i/30..." -ForegroundColor Gray
}

if (-not $ready) {
    Write-Host ""
    Write-Host "❌ Le serveur n'a pas démarré dans les 60 secondes" -ForegroundColor Red
    Write-Host "Vérifiez la fenêtre PowerShell du serveur pour les erreurs" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Appuyez sur une touche pour fermer..."
$null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
