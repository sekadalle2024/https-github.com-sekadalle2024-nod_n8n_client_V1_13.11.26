# diagnostic.ps1
# Script de diagnostic automatique pour Nod
# Date: 12 novembre 2026

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   DIAGNOSTIC SYSTEME NOD" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Fonction helper pour afficher les résultats
function Show-Result {
    param(
        [string]$Test,
        [bool]$Success,
        [string]$Message = ""
    )
    
    if ($Success) {
        Write-Host "  [OK]" -ForegroundColor Green -NoNewline
    } else {
        Write-Host "  [ERREUR]" -ForegroundColor Red -NoNewline
    }
    
    Write-Host " $Test"
    
    if ($Message) {
        Write-Host "    $Message" -ForegroundColor Gray
    }
}

# ========================================
# Test 1: Docker
# ========================================
Write-Host "[1] Verification Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Show-Result -Test "Docker installe" -Success $true -Message $dockerVersion
    } else {
        Show-Result -Test "Docker installe" -Success $false -Message "Docker non trouve dans le PATH"
    }
} catch {
    Show-Result -Test "Docker installe" -Success $false -Message $_.Exception.Message
}

# ========================================
# Test 2: Containers
# ========================================
Write-Host "`n[2] Verification Containers..." -ForegroundColor Yellow

$expectedContainers = @(
    "nod-local-postgres-1",
    "nod-workspace",
    "nod-browser",
    "nod-local-workspace-network-1"
)

try {
    $runningContainers = docker ps --filter "name=nod" --format "{{.Names}}" 2>&1
    
    if ($LASTEXITCODE -eq 0 -and $runningContainers) {
        $containerList = $runningContainers -split "`n" | Where-Object { $_ -ne "" }
        
        foreach ($expected in $expectedContainers) {
            $found = $containerList -contains $expected
            Show-Result -Test $expected -Success $found
        }
        
        # Vérifier le status des containers
        $healthStatus = docker ps --filter "name=nod" --format "{{.Names}}: {{.Status}}"
        Write-Host "`n  Status détaillé:" -ForegroundColor Gray
        $healthStatus -split "`n" | ForEach-Object {
            Write-Host "    $_" -ForegroundColor Gray
        }
    } else {
        Show-Result -Test "Containers en cours" -Success $false -Message "Aucun container Nod detecte"
    }
} catch {
    Show-Result -Test "Containers en cours" -Success $false -Message $_.Exception.Message
}

# ========================================
# Test 3: PostgreSQL
# ========================================
Write-Host "`n[3] Verification PostgreSQL..." -ForegroundColor Yellow

try {
    # Vérifier si le container postgres existe
    $postgresContainer = docker ps --filter "name=nod-local-postgres-1" --format "{{.Names}}" 2>&1
    
    if ($postgresContainer) {
        # Tester pg_isready
        $pgReady = docker exec nod-local-postgres-1 pg_isready -U nod 2>&1
        $isReady = $LASTEXITCODE -eq 0
        
        Show-Result -Test "PostgreSQL en cours" -Success $isReady -Message $pgReady
        
        # Vérifier les logs pour "ready to accept connections"
        $pgLogs = docker logs nod-local-postgres-1 --tail 50 2>&1
        $readyMessage = $pgLogs | Select-String "ready to accept connections"
        
        if ($readyMessage) {
            Show-Result -Test "PostgreSQL ready" -Success $true
        } else {
            Show-Result -Test "PostgreSQL ready" -Success $false -Message "Message 'ready to accept connections' non trouve dans les logs"
        }
        
        # Tester la connexion au port 54329
        try {
            $tcpConnection = Test-NetConnection -ComputerName 127.0.0.1 -Port 54329 -InformationLevel Quiet -WarningAction SilentlyContinue
            Show-Result -Test "Port 54329 accessible" -Success $tcpConnection
        } catch {
            Show-Result -Test "Port 54329 accessible" -Success $false
        }
    } else {
        Show-Result -Test "PostgreSQL en cours" -Success $false -Message "Container postgres non trouve"
    }
} catch {
    Show-Result -Test "PostgreSQL" -Success $false -Message $_.Exception.Message
}

# ========================================
# Test 4: Serveur Node.js
# ========================================
Write-Host "`n[4] Verification Serveur Node.js..." -ForegroundColor Yellow

try {
    # Vérifier si le port 4310 est utilisé
    $port4310 = Get-NetTCPConnection -LocalPort 4310 -ErrorAction SilentlyContinue
    
    if ($port4310) {
        $pid = $port4310.OwningProcess
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        
        Show-Result -Test "Port 4310 en ecoute" -Success $true -Message "PID: $pid ($($process.ProcessName))"
    } else {
        Show-Result -Test "Port 4310 en ecoute" -Success $false -Message "Aucun processus n'ecoute sur le port 4310"
    }
} catch {
    Show-Result -Test "Port 4310 en ecoute" -Success $false -Message $_.Exception.Message
}

# ========================================
# Test 5: Configuration .env
# ========================================
Write-Host "`n[5] Verification Configuration..." -ForegroundColor Yellow

try {
    $envPath = "h:\nod_n8n\.env"
    
    if (Test-Path $envPath) {
        Show-Result -Test "Fichier .env existe" -Success $true
        
        $envContent = Get-Content $envPath -Raw
        
        # Vérifier les clés requises
        $requiredKeys = @(
            @{Name = "NOD_VAULT_KEY"; Pattern = "NOD_VAULT_KEY="},
            @{Name = "DATABASE_URL"; Pattern = "DATABASE_URL=postgresql://"},
            @{Name = "GEMINI_API_KEY"; Pattern = "GEMINI_API_KEY="}
        )
        
        foreach ($key in $requiredKeys) {
            $found = $envContent -match $key.Pattern
            Show-Result -Test $key.Name -Success $found
        }
    } else {
        Show-Result -Test "Fichier .env existe" -Success $false -Message "Fichier non trouve: $envPath"
    }
} catch {
    Show-Result -Test "Configuration .env" -Success $false -Message $_.Exception.Message
}

# ========================================
# Test 6: node_modules
# ========================================
Write-Host "`n[6] Verification Dependencies..." -ForegroundColor Yellow

try {
    $nodeModulesPath = "h:\nod_n8n\node_modules"
    $nodeModulesExists = Test-Path $nodeModulesPath
    
    Show-Result -Test "node_modules installe" -Success $nodeModulesExists
    
    if ($nodeModulesExists) {
        $moduleCount = (Get-ChildItem $nodeModulesPath -Directory).Count
        Write-Host "    Modules installes: $moduleCount" -ForegroundColor Gray
    } else {
        Write-Host "    Executez: pnpm install" -ForegroundColor Yellow
    }
} catch {
    Show-Result -Test "node_modules" -Success $false -Message $_.Exception.Message
}

# ========================================
# Test 7: API Health Check
# ========================================
Write-Host "`n[7] Test API..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:4310/api/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    
    Show-Result -Test "API repond" -Success $true -Message "Status: $($response.status)"
} catch {
    if ($_.Exception.Message -match "Unable to connect") {
        Show-Result -Test "API repond" -Success $false -Message "Serveur non accessible (connexion refusee)"
    } elseif ($_.Exception.Message -match "timed out") {
        Show-Result -Test "API repond" -Success $false -Message "Timeout (serveur ne repond pas)"
    } else {
        Show-Result -Test "API repond" -Success $false -Message $_.Exception.Message
    }
}

# ========================================
# Test 8: Audit Tables API
# ========================================
Write-Host "`n[8] Test Audit Tables API..." -ForegroundColor Yellow

try {
    $headers = @{
        "Cookie" = "access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU"
    }
    
    $response = Invoke-RestMethod -Uri "http://localhost:4310/api/audit/schemas" -Method GET -Headers $headers -TimeoutSec 5 -ErrorAction Stop
    
    Show-Result -Test "API Audit Tables" -Success $true -Message "Schemas disponibles: $($response.Count)"
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Show-Result -Test "API Audit Tables" -Success $false -Message "401 Unauthorized (cookie manquant)"
    } elseif ($_.Exception.Message -match "Unable to connect") {
        Show-Result -Test "API Audit Tables" -Success $false -Message "Serveur non accessible"
    } else {
        Show-Result -Test "API Audit Tables" -Success $false -Message $_.Exception.Message
    }
}

# ========================================
# Résumé et Recommandations
# ========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   RESUME" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Prochaines etapes recommandees:" -ForegroundColor Yellow
Write-Host ""

# Compteur de problèmes
$issueCount = 0

# Docker
try {
    docker --version 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "1. Demarrer Docker Desktop" -ForegroundColor Red
        $issueCount++
    }
} catch {}

# Containers
try {
    $containers = docker ps --filter "name=nod" --format "{{.Names}}" 2>&1
    if (-not $containers -or $containers.Count -lt 4) {
        Write-Host "2. Demarrer les containers: cd 'h:\nod_n8n\Doc demarrer container & serveur'; .\demarrer-tout.bat" -ForegroundColor Red
        $issueCount++
    }
} catch {}

# PostgreSQL
try {
    docker exec nod-local-postgres-1 pg_isready -U nod 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "3. Attendre PostgreSQL (peut prendre 2 minutes)" -ForegroundColor Yellow
        $issueCount++
    }
} catch {}

# Port 4310
$port = Get-NetTCPConnection -LocalPort 4310 -ErrorAction SilentlyContinue
if (-not $port) {
    Write-Host "4. Demarrer le serveur: cd h:\nod_n8n; pnpm exec tsx src/server/index.ts" -ForegroundColor Red
    $issueCount++
}

# node_modules
if (-not (Test-Path "h:\nod_n8n\node_modules")) {
    Write-Host "5. Installer les dependances: pnpm install" -ForegroundColor Red
    $issueCount++
}

if ($issueCount -eq 0) {
    Write-Host "Systeme operationnel!" -ForegroundColor Green
    Write-Host ""
    Write-Host "URL d'acces:" -ForegroundColor Cyan
    Write-Host "http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Total: $issueCount probleme(s) detecte(s)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Pour plus de details, consultez:" -ForegroundColor Gray
Write-Host "  h:\nod_n8n\Doc demarrer container & serveur\PROBLEMES-DEMARRAGE.md" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
