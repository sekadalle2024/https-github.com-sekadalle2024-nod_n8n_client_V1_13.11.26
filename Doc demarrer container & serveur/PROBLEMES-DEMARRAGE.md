# Problèmes de Démarrage - Solutions

**Date**: 12 novembre 2026  
**Version**: Système de Persistance v2b

---

## 🚨 Problème #1 : PostgreSQL prend trop de temps à démarrer

### Symptômes

```
[ERREUR] PostgreSQL ne repond pas apres 30 secondes
Verifiez les logs: docker logs nod-local-postgres-1
```

### Cause Identifiée

Le container PostgreSQL effectue un **fsync (synchronisation disque)** qui peut prendre **90+ secondes** lors du premier démarrage ou après un arrêt brutal.

**Logs observés** :

```
2026-11-13 16:01:05.411 UTC [270] LOG:  database system was not properly shut down; automatic recovery in progress
2026-11-13 16:01:06.155 UTC [270] LOG:  redo starts at 0/2814458
2026-11-13 16:01:07.044 UTC [1] LOG:  database system is ready to accept connections
```

Durée totale observée : **~95 secondes** (de 15:59:52 à 16:01:07)

### Solution Temporaire

**Ne pas paniquer** quand le script affiche l'erreur après 30s. PostgreSQL continue de démarrer en arrière-plan.

**Commandes de vérification** :

```bash
# Vérifier les logs en direct
docker logs nod-local-postgres-1 --follow

# Attendre ce message :
# "database system is ready to accept connections"

# Vérifier le statut
docker ps --filter "name=nod-local-postgres-1" --format "table {{.Names}}\t{{.Status}}"

# Résultat attendu : (healthy) dans la colonne Status
```

### Solution Permanente

Modifier le script `demarrer-tout-projet.bat` pour augmenter le timeout :

**Ligne à modifier** (vers ligne 85) :

```batch
REM Ancienne valeur
set /a MAX_WAIT=30

REM Nouvelle valeur recommandée
set /a MAX_WAIT=120
```

**Fichier complet à mettre à jour** :

- `h:\nod_n8n\Doc demarrer container & serveur\demarrer-tout-projet.bat`
- `h:\nod_n8n\Doc demarrer container & serveur\demarrer-tout.bat`

---

## 🚨 Problème #2 : Serveur Node.js ne démarre pas (`pnpm run dev` échoue)

### Symptômes

```
> nod@0.1.0 dev H:\nod_n8n
> node scripts/start.mjs
spawn pnpm ENOENT
 ELIFECYCLE  Command failed with exit code 1.
```

### Cause Identifiée

Le script `scripts/start.mjs` lance `pnpm` en sous-processus, mais `pnpm` n'est pas trouvé dans le PATH du sous-processus.

**Erreur** : `spawn pnpm ENOENT` (Error NO ENTry = fichier non trouvé)

### Solution de Contournement

**Ne pas utiliser** `pnpm run dev`. À la place, lancer directement :

```bash
cd h:\nod_n8n
pnpm exec tsx src/server/index.ts
```

**Ou dans PowerShell** :

```powershell
cd h:\nod_n8n
pnpm exec tsx src/server/index.ts
```

### Vérification du Démarrage

Le serveur doit afficher :

```
🚀 Server running on http://localhost:4310
📊 Database connected (PostgreSQL)
✅ Audit tables initialized
```

**Temps de démarrage attendu** : 5-15 secondes

---

## 🚨 Problème #3 : Les containers ne démarrent pas

### Symptômes

```
Error response from daemon: Cannot connect to the Docker daemon
```

OU

```
docker: command not found
```

### Causes Possibles

#### Cause A : Docker Desktop n'est pas lancé

**Solution** :

1. Ouvrir **Docker Desktop** depuis le menu Démarrer Windows
2. Attendre que l'icône Docker dans la barre des tâches devienne **verte**
3. Vérifier dans Docker Desktop : "Docker is running"
4. Relancer les scripts

#### Cause B : Docker Desktop est lancé mais WSL2 n'est pas configuré

**Solution** :

1. Ouvrir Docker Desktop → Settings (⚙️)
2. Aller dans **General**
3. Cocher **Use the WSL 2 based engine**
4. Cliquer **Apply & Restart**
5. Attendre le redémarrage complet
6. Relancer les scripts

#### Cause C : Containers bloqués en état "Recreating"

**Symptômes** :

```
 - Container nod-workspace Recreate                                        10.0s
 - Container nod-workspace Recreate                                        11.0s
 - Container nod-workspace Recreate                                        12.0s
...
```

**Solution** :

```bash
# Arrêter tous les containers Nod
docker stop $(docker ps -q --filter "name=nod")

# Supprimer tous les containers Nod
docker rm $(docker ps -aq --filter "name=nod")

# Nettoyer les réseaux
docker network prune -f

# Relancer
cd "h:\nod_n8n\Doc demarrer container & serveur"
.\demarrer-tout.bat
```

---

## 🚨 Problème #4 : Port 54329 déjà utilisé

### Symptômes

```
Error starting userland proxy: listen tcp4 127.0.0.1:54329: bind: address already in use
```

### Solution

Un autre processus utilise le port PostgreSQL.

**Identifier le processus** :

```powershell
# Trouver le processus utilisant le port 54329
Get-NetTCPConnection -LocalPort 54329 | Select-Object LocalAddress, LocalPort, State, OwningProcess

# Noter le PID (OwningProcess)
# Arrêter le processus
Stop-Process -Id <PID> -Force
```

**Alternative** : Modifier le port dans `docker-compose.yml` :

```yaml
services:
  postgres:
    ports:
      - '54330:5432' # Changer 54329 → 54330
```

**Attention** : Si vous changez le port, mettre à jour `.env` :

```
DATABASE_URL=postgresql://nod:...@127.0.0.1:54330/nod
```

---

## 🚨 Problème #5 : Erreur 401 Unauthorized sur /api/audit/*

### Symptômes

Dans la console navigateur (DevTools → Console) :

```
GET http://localhost:4310/api/audit/schemas 401 (Unauthorized)
```

### Cause

Le cookie `access` n'est pas envoyé avec les requêtes fetch.

### Solution Appliquée

**Déjà corrigé** dans le workflow v2a. Toutes les requêtes fetch incluent maintenant :

```typescript
credentials: 'include';
```

**Fichiers concernés** :

- `src/web/components/editable-table.tsx` (5 fetch corrigés)

### Vérification

Ouvrir DevTools → Network → Cliquer sur une requête `/api/audit/*` → Onglet **Headers** :

```
Cookie: access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU
```

Si le cookie n'apparaît pas, vérifier l'URL d'accès contient `#access=...`

---

## 🚨 Problème #6 : Serveur démarre mais ne répond pas

### Symptômes

```bash
curl http://localhost:4310/api/health
# Timeout ou "Impossible de se connecter"
```

### Causes Possibles

#### Cause A : Firewall Windows bloque le port 4310

**Solution** :

1. Ouvrir **Pare-feu Windows avec fonctions avancées de sécurité**
2. Règles de trafic entrant → Nouvelle règle
3. Type : Port
4. TCP, Port 4310
5. Autoriser la connexion
6. Appliquer à tous les profils
7. Nom : "Nod Server Port 4310"
8. Terminer

#### Cause B : Le serveur a crashé au démarrage

**Vérifier les logs** :

```bash
# Si lancé avec control_pwsh_process
get_process_output terminalId=<ID>

# Si lancé dans terminal visible
# Lire directement la fenêtre PowerShell
```

**Erreurs courantes** :

- `Error: Cannot find module '...'` → Réinstaller dépendances : `pnpm install`
- `ECONNREFUSED 127.0.0.1:54329` → PostgreSQL non démarré
- `Vault key not found` → Vérifier `.env` contient `NOD_VAULT_KEY=...`

#### Cause C : Mauvaise configuration .env

**Vérifier** :

```bash
Get-Content "h:\nod_n8n\.env" | Select-String -Pattern "NOD_VAULT_KEY|DATABASE_URL|GEMINI_API_KEY"
```

**Valeurs obligatoires** :

```env
NOD_VAULT_KEY=IF3u9anoTHVqyMj31i/BNWxdGS6/MWxMjOAPAu6zONo=
DATABASE_URL=postgresql://nod:...@127.0.0.1:54329/nod
GEMINI_API_KEY=...
```

---

## 🚨 Problème #7 : Table ne s'affiche pas dans le chat

### Symptômes

Le message contient une table, mais elle n'est pas rendue en composant `EditableTable`.

### Causes Possibles

#### Cause A : Format de données incorrect

Le composant attend des données au format :

```typescript
{
  name: string;
  category?: 'accounting' | 'compliance' | 'risk' | 'general';
  columns: Array<{name: string; type: string}>;
  rows: Array<Record<string, any>>;
}
```

**Vérifier dans DevTools → Console** :

```javascript
// Le composant doit logger (si debug activé) :
console.log('EditableTable data:', data);
```

#### Cause B : Composant non intégré dans attachment-data.tsx

**Vérifier** que `src/web/components/attachment-data.tsx` contient :

```typescript
import { EditableTable } from './editable-table';

// Dans le render :
if (attachment.data.type === 'table' && attachment.data.content) {
  return <EditableTable data={attachment.data.content} />;
}
```

**Ligne exacte** : `src/web/components/attachment-data.tsx` ligne ~150

#### Cause C : CSS non chargé

**Vérifier** que `src/web/styles.css` contient :

```css
@import './styles/editable-table.css';
```

**Recompiler** si nécessaire :

```bash
cd h:\nod_n8n
pnpm run build
```

---

## 📋 Checklist de Diagnostic Rapide

Avant de créer un nouveau ticket ou demander de l'aide, exécuter cette checklist :

### 1. Docker

```bash
# Docker Desktop lancé ?
docker --version
# Résultat attendu : "Docker version 24.x.x"

# Containers running ?
docker ps --filter "name=nod"
# Résultat attendu : 4 containers (postgres, workspace, browser, network)

# PostgreSQL ready ?
docker logs nod-local-postgres-1 --tail 5
# Résultat attendu : "database system is ready to accept connections"
```

### 2. Serveur Node.js

```bash
# Serveur lancé ?
# Vérifier terminal visible ou process output

# Port écoute ?
netstat -an | findstr "4310"
# Résultat attendu : "127.0.0.1:4310 ... LISTENING"

# API répond ?
curl http://localhost:4310/api/health
# Résultat attendu : {"status":"ok"}
```

### 3. Configuration

```bash
# .env complet ?
Get-Content .env | Select-String "NOD_VAULT_KEY|DATABASE_URL|GEMINI_API_KEY"

# node_modules installés ?
Test-Path "node_modules"
# Résultat attendu : True
```

### 4. Application Web

```
# Navigateur ouvert sur :
http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU

# DevTools Console (F12) : pas d'erreurs rouges ?
# DevTools Network : requêtes API retournent 200 OK ?
```

---

## 🔧 Scripts de Diagnostic Automatique

Créer un fichier `diagnostic.ps1` :

```powershell
# diagnostic.ps1
Write-Host "=== DIAGNOSTIC NOD ===" -ForegroundColor Cyan

Write-Host "`n[1] Verification Docker..." -ForegroundColor Yellow
$dockerVersion = docker --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Docker: $dockerVersion" -ForegroundColor Green
} else {
    Write-Host "  [ERREUR] Docker non trouve" -ForegroundColor Red
}

Write-Host "`n[2] Verification Containers..." -ForegroundColor Yellow
$containers = docker ps --filter "name=nod" --format "{{.Names}}: {{.Status}}"
if ($containers) {
    Write-Host "  [OK] Containers:" -ForegroundColor Green
    $containers | ForEach-Object { Write-Host "    $_" }
} else {
    Write-Host "  [ERREUR] Aucun container en cours" -ForegroundColor Red
}

Write-Host "`n[3] Verification PostgreSQL..." -ForegroundColor Yellow
$pgReady = docker logs nod-local-postgres-1 --tail 50 2>&1 | Select-String "ready to accept connections"
if ($pgReady) {
    Write-Host "  [OK] PostgreSQL ready" -ForegroundColor Green
} else {
    Write-Host "  [ERREUR] PostgreSQL non pret" -ForegroundColor Red
}

Write-Host "`n[4] Verification Port 4310..." -ForegroundColor Yellow
$port = Get-NetTCPConnection -LocalPort 4310 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "  [OK] Port 4310 en ecoute (PID: $($port.OwningProcess))" -ForegroundColor Green
} else {
    Write-Host "  [ERREUR] Port 4310 non utilise" -ForegroundColor Red
}

Write-Host "`n[5] Verification .env..." -ForegroundColor Yellow
$envKeys = Get-Content ".env" -ErrorAction SilentlyContinue | Select-String "NOD_VAULT_KEY|DATABASE_URL|GEMINI_API_KEY"
if ($envKeys.Count -ge 3) {
    Write-Host "  [OK] .env contient les cles requises" -ForegroundColor Green
} else {
    Write-Host "  [ERREUR] .env incomplet" -ForegroundColor Red
}

Write-Host "`n[6] Test API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4310/api/health" -TimeoutSec 5
    Write-Host "  [OK] API repond: $($response.status)" -ForegroundColor Green
} catch {
    Write-Host "  [ERREUR] API ne repond pas" -ForegroundColor Red
}

Write-Host "`n=== FIN DIAGNOSTIC ===" -ForegroundColor Cyan
```

**Utilisation** :

```powershell
cd h:\nod_n8n
.\diagnostic.ps1
```

---

## 📞 Obtenir de l'Aide

Si les problèmes persistent après avoir essayé toutes les solutions ci-dessus :

### Informations à Fournir

1. **Logs Docker** :

   ```bash
   docker logs nod-local-postgres-1 > postgres-logs.txt
   docker logs nod-workspace > workspace-logs.txt
   docker logs nod-browser > browser-logs.txt
   ```

2. **Logs Serveur Node.js** :
   - Copier tout le contenu du terminal où `pnpm exec tsx src/server/index.ts` tourne

3. **Informations Système** :

   ```powershell
   $PSVersionTable > system-info.txt
   docker --version >> system-info.txt
   node --version >> system-info.txt
   pnpm --version >> system-info.txt
   ```

4. **Screenshots** :
   - Capture d'écran de Docker Desktop (containers running)
   - Capture d'écran DevTools Console (erreurs navigateur)
   - Capture d'écran DevTools Network (requêtes API)

### Ressources

- **Documentation** : `Doc systeme de persistance/00-README-V2.md`
- **Architecture** : `Doc systeme de persistance/ARCHITECTURE-V2-INLINE-EDITING.md`
- **État actuel** : `Doc systeme de persistance/ETAT-ACTUEL-12NOV-2026.md`
- **Tests** : `Doc systeme de persistance/CHECKLIST-TESTS-MANUELS.md`

---

**Dernière mise à jour** : 12 novembre 2026  
**Auteur** : Kiro (Assistant IA)
