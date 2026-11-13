# Réinstallation Rapide - Checklist

## 🚀 Pour réinstaller rapidement le projet plus tard

**Temps estimé avec ce guide : 1-2 heures**

---

## ✅ Checklist des prérequis

```powershell
# [ ] Windows 10/11 version 2004+ (AMD64)
winver

# [ ] WSL2 installé et configuré
wsl --status

# [ ] Docker Desktop installé (WSL2 backend)
docker --version
docker compose version

# [ ] nvm-windows installé
nvm version

# [ ] Node.js 24.21.0
nvm install 24.21.0
nvm use 24.21.0

# [ ] pnpm 10.34.5
corepack enable
corepack prepare pnpm@10.34.5 --activate
```

---

## 📦 Installation en 10 étapes

### 1. Cloner le dépôt

```powershell
cd H:\
git clone https://github.com/n8n-io/nod.git nod_n8n
cd nod_n8n
```

### 2. Configurer Git pour éviter CRLF

```powershell
git config core.autocrlf false
```

### 3. Corriger les fins de ligne des scripts Shell

```powershell
function Convert-ToLF {
    param([string]$FilePath)
    $content = Get-Content -Path $FilePath -Raw
    $content = $content -replace "`r`n", "`n"
    [System.IO.File]::WriteAllText($FilePath, $content, [System.Text.UTF8Encoding]::new($false))
    Write-Host "✓ $FilePath" -ForegroundColor Green
}

Convert-ToLF "docker/workspace/install-rtk.sh"
Convert-ToLF "docker/workspace-network/workspace-network.sh"
```

### 4. Installer les dépendances

```powershell
pnpm install
# ~5-10 minutes
```

### 5. Compiler le projet

```powershell
pnpm run build
# ~2-3 minutes
```

### 6. Créer le fichier .env

```powershell
# Générer mot de passe PostgreSQL
$rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
$randomBytes = New-Object byte[] 48
$rng.GetBytes($randomBytes)
$pgPassword = [Convert]::ToBase64String($randomBytes) -replace '[/+=]',''

# Générer clé Vault
$randomBytes2 = New-Object byte[] 32
$rng.GetBytes($randomBytes2)
$vaultKey = [Convert]::ToBase64String($randomBytes2)

# Créer .env
@"
PORT=4310
NOD_HOST=127.0.0.1
NOD_DATA_ROOT=.local
NOD_POSTGRES_PASSWORD=$pgPassword
DATABASE_URL=postgresql://nod:$pgPassword@127.0.0.1:54329/nod
NODE_ENV=development
NOD_VAULT_KEY=$vaultKey
"@ | Out-File -FilePath .env -Encoding UTF8

Write-Host "✓ Fichier .env créé" -ForegroundColor Green
```

### 7. Modifier le bypass keystore (développement)

**Fichier :** `src/providers/composio/identity.ts` (ligne 107)

```typescript
// Remplacer :
if (!options.keyStore.configured)
  throw new Error('Unlock or configure Nod's key store before connecting apps.');

// Par :
if (!options.keyStore.configured) {
  console.warn('[DEV BYPASS] Keystore bypass');
  return { key: null, publicKey: '', userId: 'dev_user' };
}
```

**Automatisation PowerShell :**

```powershell
$file = "src\providers\composio\identity.ts"
$lines = Get-Content $file
$lines[106] = "  if (!options.keyStore.configured) { console.warn('[DEV BYPASS] Keystore bypass'); return { key: null, publicKey: '', userId: 'dev_user' }; }"
$lines | Set-Content $file
Write-Host "✓ Bypass keystore activé" -ForegroundColor Green
```

### 8. Lancer Docker build

```powershell
docker compose up -d --build
# ~2h30-3h (première fois)
# ~30 secondes (fois suivantes)
```

**Suivre la progression dans un autre terminal :**

```powershell
docker compose logs -f
```

### 9. Démarrer le serveur Nod

```powershell
# Attendre que Docker soit prêt (tous containers "Up")
docker ps

# Démarrer Nod
pnpm exec tsx src/server/index.ts
```

**Sortie attendue :**

```
Nod is ready at http://localhost:4310/#access=<TOKEN>
```

### 10. Vérifier la persistance

```powershell
node test-persistence-direct.mjs
```

**Résultat attendu :**

```
✓ TOUS LES TESTS SONT PASSÉS !
```

---

## 🐛 Dépannage rapide

### Erreur CRLF

```powershell
# Reconvertir les scripts
Convert-ToLF "docker/workspace/install-rtk.sh"
Convert-ToLF "docker/workspace-network/workspace-network.sh"
docker compose up -d --build
```

### Port 4310 occupé

```powershell
Get-NetTCPConnection -LocalPort 4310 -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess |
    Stop-Process -Force
```

### PostgreSQL inaccessible

```powershell
docker restart nod-local-postgres-1
docker logs nod-local-postgres-1
```

### Tables manquantes

```powershell
# Vérifier
docker exec nod-local-postgres-1 psql -U nod -d nod -c "\dt audit*"

# Si manquantes, redémarrer le serveur Nod
# Les tables sont créées automatiquement au démarrage
```

### Build Docker lent

```powershell
# Augmenter timeout
$env:COMPOSE_HTTP_TIMEOUT=300

# Augmenter ressources Docker Desktop
# Settings → Resources → Memory: 8GB, CPU: 4 cores
```

---

## 📋 Vérification finale

```powershell
# ✅ Docker
docker ps
# Attendu : 4 containers actifs

# ✅ PostgreSQL
docker exec nod-local-postgres-1 psql -U nod -d nod -c "SELECT 1;"

# ✅ Tables
docker exec nod-local-postgres-1 psql -U nod -d nod -c "\dt audit*"
# Attendu : 3-4 tables

# ✅ Serveur
curl http://localhost:4310
# Ne doit pas retourner "Connection refused"

# ✅ Persistance
node test-persistence-direct.mjs
# Doit afficher "TOUS LES TESTS SONT PASSÉS"
```

---

## 📚 Fichiers importants

### À sauvegarder

- **`.env`** - Variables d'environnement (ne pas committer)
- **`test-persistence-direct.mjs`** - Tests de persistance
- **Données PostgreSQL** - Dans le volume Docker `nod_nod-data`

### À conserver

```powershell
# Backup base de données
docker exec nod-local-postgres-1 pg_dump -U nod nod > backup_nod_$(Get-Date -Format "yyyyMMdd_HHmmss").sql

# Restaurer un backup
Get-Content backup_nod_20241115_143000.sql | docker exec -i nod-local-postgres-1 psql -U nod -d nod
```

---

## 🎯 Accès rapides

### URLs

- **Interface Nod** : http://localhost:4310
- **PostgreSQL** : localhost:54329 (user: nod, db: nod)

### Commandes fréquentes

```powershell
# Démarrer tout
docker compose up -d
pnpm exec tsx src/server/index.ts

# Arrêter tout
docker compose down
# Ctrl+C dans le terminal du serveur

# Nettoyer et recommencer
docker compose down -v
Remove-Item -Recurse -Force node_modules, .local, dist
pnpm install
docker compose up -d --build
```

---

## ⏱️ Temps estimés

| Tâche                          | Première fois | Réinstallation |
| ------------------------------ | ------------- | -------------- |
| Cloner + installer dépendances | 15 min        | 10 min         |
| Build Docker                   | 2h30-3h       | 30 sec         |
| Configuration                  | 10 min        | 5 min          |
| Tests                          | 5 min         | 2 min          |
| **TOTAL**                      | **~3h**       | **~20 min**    |

---

## 📞 En cas de problème

Consultez le guide complet : `08-GUIDE-INSTALLATION-COMPLETE-DOCKER.md`

Sections utiles :

- Problèmes courants et solutions (page 15)
- Vérification complète (page 18)
- Commandes utiles (page 19)
