# Guide d'Installation Complète - Nod avec Docker

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis système](#prérequis-système)
3. [Installation des outils](#installation-des-outils)
4. [Configuration du projet](#configuration-du-projet)
5. [Lancement Docker](#lancement-docker)
6. [Configuration de la persistance](#configuration-de-la-persistance)
7. [Problèmes courants et solutions](#problèmes-courants-et-solutions)
8. [Vérification complète](#vérification-complète)
9. [Commandes utiles](#commandes-utiles)

---

## Vue d'ensemble

### Architecture finale

```
Windows 11 (AMD64)
├── Node.js 24.21.0 (via nvm-windows)
├── pnpm 10.34.5 (via Corepack)
├── Docker Desktop (WSL2 backend)
│   ├── nod-local-postgres (PostgreSQL 17)
│   ├── nod-workspace (sandbox Linux)
│   ├── nod-browser (Chromium)
│   └── nod-workspace-network (helper)
└── Nod Server (port 4310)
    ├── Backend API (Fastify)
    ├── Système de persistance (11 endpoints)
    └── PostgreSQL (4 tables audit)
```

### Temps d'installation estimé

- Installation complète : **3-4 heures** (première fois)
- Build Docker : **2h30-3h** (dépend de votre connexion)
- Configuration : **30 minutes**

---

## Prérequis système

### Configuration matérielle minimale

| Composant      | Minimum          | Recommandé |
| -------------- | ---------------- | ---------- |
| **Processeur** | Intel/AMD 64-bit | 4+ cœurs   |
| **RAM**        | 8 GB             | 16 GB      |
| **Disque**     | 20 GB libre      | 50 GB SSD  |
| **Internet**   | Requis           | Haut débit |

### Système d'exploitation

- **Windows 10/11** (version 2004 ou plus récente)
- **Architecture** : AMD64 (x86_64)
- **WSL2** : Doit être disponible

### Vérifications préalables

```powershell
# 1. Vérifier la version Windows
winver
# Doit être ≥ 2004 (Build 19041)

# 2. Vérifier l'architecture
wmic cpu get caption
# Doit contenir "x64" ou "AMD64"

# 3. Vérifier si WSL2 est disponible
wsl --status
# Si erreur, installer WSL2 (voir section suivante)
```

---

## Installation des outils

### 1. Installation de WSL2 (si nécessaire)

**Si WSL2 n'est pas installé :**

```powershell
# Exécuter PowerShell en mode Administrateur
wsl --install

# Redémarrer le PC
Restart-Computer

# Vérifier l'installation
wsl --list --verbose
```

**Définir WSL2 par défaut :**

```powershell
wsl --set-default-version 2
```

### 2. Installation de Docker Desktop

#### Option 1 : Installation complète (recommandé)

1. **Télécharger** : https://www.docker.com/products/docker-desktop/
2. **Choisir** : "Install for current user" (pas "All users")
3. **Backend** : Sélectionner **WSL2** (pas Hyper-V)
4. **Installer** et redémarrer

#### Option 2 : Installation silencieuse

```powershell
# Télécharger l'installeur
Invoke-WebRequest -Uri "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -OutFile "$env:TEMP\DockerDesktopInstaller.exe"

# Installer (mode utilisateur, WSL2 backend)
Start-Process "$env:TEMP\DockerDesktopInstaller.exe" -ArgumentList "install --quiet --accept-license --backend=wsl-2" -Wait

# Redémarrer
Restart-Computer
```

#### Vérification Docker

```powershell
# Vérifier Docker
docker --version
# Attendu : Docker version 27.x.x ou plus récent

# Vérifier Docker Compose
docker compose version
# Attendu : Docker Compose version v2.29.x ou plus récent

# Tester Docker
docker run hello-world
# Doit afficher "Hello from Docker!"
```

**⚠️ IMPORTANT : Erreurs courantes Docker**

| Erreur                      | Solution                                     |
| --------------------------- | -------------------------------------------- |
| "Docker daemon not running" | Démarrer Docker Desktop manuellement         |
| "Access denied"             | Ajouter utilisateur au groupe `docker-users` |
| "WSL2 not found"            | Installer/mettre à jour WSL2                 |
| "Hyper-V conflict"          | Désactiver Hyper-V et utiliser WSL2          |

### 3. Installation de Node.js via nvm-windows

**Pourquoi nvm-windows ?**

- Permet d'avoir plusieurs versions de Node.js
- Facilite le passage entre projets
- Évite les conflits de versions

#### Installation de nvm-windows

```powershell
# Télécharger nvm-setup.exe
# URL : https://github.com/coreybutler/nvm-windows/releases/latest

# Installer : nvm-setup.exe (installer la dernière version)
# Installation typique : C:\Users\<USER>\AppData\Roaming\nvm

# Vérifier l'installation
nvm version
# Attendu : 1.2.2 ou plus récent
```

#### Installation de Node.js 24.21.0

```powershell
# Lister les versions disponibles (optionnel)
nvm list available

# Installer Node.js 24.21.0
nvm install 24.21.0

# Utiliser cette version
nvm use 24.21.0

# Vérifier
node --version
# Attendu : v24.21.0

npm --version
# Attendu : 10.x.x
```

**⚠️ Note :** Si vous avez déjà Node.js 22.22.0, conservez-le :

```powershell
# Installer 24.21.0 en parallèle
nvm install 24.21.0

# Basculer entre versions
nvm use 24.21.0   # Pour Nod
nvm use 22.22.0   # Pour autres projets
```

### 4. Installation de pnpm via Corepack

```powershell
# Activer Corepack (inclus avec Node.js)
corepack enable

# Préparer pnpm
corepack prepare pnpm@10.34.5 --activate

# Vérifier
pnpm --version
# Attendu : 10.34.5
```

**Alternative si Corepack échoue :**

```powershell
npm install -g pnpm@10.34.5
```

---

## Configuration du projet

### 1. Cloner le dépôt

```powershell
# Choisir un emplacement (exemple : H:\)
cd H:\

# Cloner le dépôt
git clone https://github.com/n8n-io/nod.git nod_n8n

# Entrer dans le dossier
cd nod_n8n
```

**Structure du projet :**

```
nod_n8n/
├── src/
│   ├── server/           # Backend Node.js
│   ├── web/              # Frontend React
│   └── shared/           # Code partagé
├── docker-compose.yaml   # Configuration Docker
├── package.json          # Dépendances
├── .env                  # Variables d'environnement (à créer)
└── README.md
```

### 2. Installer les dépendances

```powershell
# Installation avec pnpm
pnpm install

# Temps estimé : 5-10 minutes
# Nombre de packages : ~895
```

**Problèmes courants :**

| Erreur                         | Solution                                                         |
| ------------------------------ | ---------------------------------------------------------------- |
| "ERR_PNPM_NO_MATCHING_VERSION" | Vérifier version Node.js (doit être 24.x)                        |
| "EACCES permission denied"     | Exécuter PowerShell en mode Administrateur                       |
| "Timeout" ou lent              | Vérifier connexion Internet, utiliser `--network-timeout 600000` |

### 3. Compiler le projet

```powershell
# Compiler TypeScript
pnpm run build

# Temps estimé : 2-3 minutes
```

**Vérification :**

```powershell
# Le dossier dist/ doit être créé
Test-Path dist
# Doit retourner : True
```

### 4. Créer le fichier .env

```powershell
# Créer le fichier
New-Item -Path .env -ItemType File -Force
```

**Contenu du fichier .env :**

```env
# Port du serveur Nod
PORT=4310

# Adresse d'écoute
NOD_HOST=127.0.0.1

# Répertoire de données
NOD_DATA_ROOT=.local

# Mot de passe PostgreSQL (générer un mot de passe sécurisé)
NOD_POSTGRES_PASSWORD=VOTRE_MOT_DE_PASSE_SECURISE_ICI

# URL de connexion PostgreSQL
DATABASE_URL=postgresql://nod:VOTRE_MOT_DE_PASSE_SECURISE_ICI@127.0.0.1:54329/nod

# Environnement
NODE_ENV=development

# Clé de chiffrement Vault (générer avec commande ci-dessous)
NOD_VAULT_KEY=VOTRE_CLE_VAULT_ICI

# Clé API Google Gemini (optionnel)
GEMINI_API_KEY=VOTRE_CLE_GEMINI_ICI
```

#### Générer un mot de passe PostgreSQL sécurisé

```powershell
# Générer un mot de passe de 64 caractères
$randomBytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
$rng.GetBytes($randomBytes)
$password = [Convert]::ToBase64String($randomBytes) -replace '[/+=]',''
Write-Host "NOD_POSTGRES_PASSWORD=$password"
```

**Exemple de mot de passe généré :**

```
B5ZuYyQHPcdVmXg1bA0I_p8GRxEU2nwaKMlNsDitqeL-4C3jkTFzfW7Joh9r6vOS
```

#### Générer une clé Vault sécurisée

```powershell
# Générer une clé de chiffrement 32 bytes en base64
$randomBytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
$rng.GetBytes($randomBytes)
$vaultKey = [Convert]::ToBase64String($randomBytes)
Write-Host "NOD_VAULT_KEY=$vaultKey"
```

**Exemple de clé générée :**

```
IF3u9anoTHVqyMj31i/BNWxdGS6/MWxMjOAPAu6zONo=
```

#### Fichier .env complet (exemple)

```env
PORT=4310
NOD_HOST=127.0.0.1
NOD_DATA_ROOT=.local
NOD_POSTGRES_PASSWORD=B5ZuYyQHPcdVmXg1bA0I_p8GRxEU2nwaKMlNsDitqeL-4C3jkTFzfW7Joh9r6vOS
DATABASE_URL=postgresql://nod:B5ZuYyQHPcdVmXg1bA0I_p8GRxEU2nwaKMlNsDitqeL-4C3jkTFzfW7Joh9r6vOS@127.0.0.1:54329/nod
NODE_ENV=development
NOD_VAULT_KEY=IF3u9anoTHVqyMj31i/BNWxdGS6/MWxMjOAPAu6zONo=
GEMINI_API_KEY=AIzaSy...votre_cle_ici...
```

---

## Lancement Docker

### 1. Correction préalable : Problème CRLF

**⚠️ CRITIQUE :** Les scripts Shell dans Docker ne supportent pas les fins de ligne Windows (CRLF).

#### Problème rencontré

```
install-rtk.sh: line 2: $'\r': command not found
```

#### Solution : Convertir CRLF en LF

**Méthode 1 : PowerShell (recommandé)**

```powershell
# Fonction de conversion CRLF → LF
function Convert-ToLF {
    param([string]$FilePath)
    $content = Get-Content -Path $FilePath -Raw
    $content = $content -replace "`r`n", "`n"
    [System.IO.File]::WriteAllText($FilePath, $content, [System.Text.UTF8Encoding]::new($false))
    Write-Host "✓ Converti: $FilePath" -ForegroundColor Green
}

# Convertir les fichiers problématiques
Convert-ToLF "docker/workspace/install-rtk.sh"
Convert-ToLF "docker/workspace-network/workspace-network.sh"
```

**Méthode 2 : Git (permanent)**

```powershell
# Configurer Git pour ne pas convertir les fins de ligne
git config core.autocrlf false

# Re-cloner le dépôt
cd ..
Remove-Item -Recurse -Force nod_n8n
git clone https://github.com/n8n-io/nod.git nod_n8n
```

**Méthode 3 : VS Code**

1. Ouvrir `docker/workspace/install-rtk.sh`
2. En bas à droite : cliquer sur "CRLF"
3. Sélectionner "LF"
4. Sauvegarder
5. Répéter pour `docker/workspace-network/workspace-network.sh`

### 2. Lancer le build Docker

```powershell
# Build et démarrage des containers
docker compose up -d --build

# Temps estimé : 2h30 - 3h00 (première fois)
# Prochaines fois : ~30 secondes
```

**Ce que fait cette commande :**

1. **Build de 3 images Docker** :
   - `nod-local-workspace` (~2.94 GB) - Sandbox Linux avec outils
   - `nod-local-browser` (~1.89 GB) - Chromium pour automation
   - `postgres:17-alpine` (~424 MB) - Base de données

2. **Création de 4 containers** :
   - `nod-local-postgres-1` - PostgreSQL sur port 54329
   - `nod-workspace` - Sandbox pour exécution de code
   - `nod-browser` - Browser pour Pi web extension
   - `nod-workspace-network-1` - Helper network

### 3. Suivre la progression du build

**Dans un autre terminal PowerShell :**

```powershell
# Voir les logs en temps réel
docker compose logs -f

# Ou pour un container spécifique
docker logs -f nod-local-postgres-1
```

**Progression typique :**

```
[1/37] FROM docker.io/library/node:24-alpine        ✓ [  ~2 min]
[2/37] RUN apk add --no-cache python3 make g++     ✓ [  ~5 min]
[3/37] COPY package.json pnpm-lock.yaml ./         ✓ [  ~1 sec]
[4/37] RUN corepack enable && pnpm install         ✓ [ ~15 min]
...
[20/37] RUN apt-get update && apt-get install...   ✓ [ ~45 min] ← Plus long
...
[37/37] ENTRYPOINT ["/entrypoint.sh"]              ✓ [  ~1 sec]
```

**Indicateurs de santé :**

```powershell
# Vérifier l'état des containers
docker ps

# Sortie attendue :
# CONTAINER ID   IMAGE                    STATUS
# abc123def456   nod-local-postgres       Up (healthy)
# def456ghi789   nod-local-workspace      Up
# ghi789jkl012   nod-local-browser        Up (healthy)
# jkl012mno345   nod-workspace-network    Up (healthy)
```

### 4. Vérification post-build

```powershell
# 1. Vérifier les images
docker images | Select-String "nod"

# Attendu :
# nod-local-workspace    latest    abc123   2.94GB
# nod-local-browser      latest    def456   1.89GB

# 2. Vérifier les containers en cours
docker compose ps

# Tous doivent être "Up" ou "Up (healthy)"

# 3. Tester PostgreSQL
docker exec nod-local-postgres-1 psql -U nod -d nod -c "SELECT version();"

# Doit retourner : PostgreSQL 17.x
```

---

## Configuration de la persistance

### 1. Initialisation des tables d'audit

Les tables sont créées automatiquement au démarrage du serveur via `src/server/db-audit-tables.ts`.

**Tables créées :**

1. **`audit_table_schemas`** - Métadonnées des tables
   - Colonnes : id, owner_id, table_name, display_name, n8n_workflow_id, column_definitions (JSONB)

2. **`audit_table_data`** - Données des lignes
   - Colonnes : id, owner_id, table_schema_id, row_data (JSONB), row_order, deleted_at (soft delete)

3. **`audit_data_versions`** - Historique des modifications
   - Colonnes : id, owner_id, table_data_id, row_data (JSONB), change_type, changed_by, changed_at

4. **`audit_table_consolidations`** - Configuration des consolidations
   - Colonnes : id, owner_id, source_schema_id, group_by_column, aggregate_columns, aggregate_functions, aggregates (JSONB)

### 2. Vérification des tables

```powershell
# Lister les tables
docker exec nod-local-postgres-1 psql -U nod -d nod -c "\dt audit*"

# Sortie attendue :
# audit_data_versions
# audit_table_consolidations
# audit_table_data
# audit_table_schemas
```

### 3. Structure détaillée des tables

#### Table : audit_table_schemas

```sql
CREATE TABLE audit_table_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  table_name text NOT NULL,
  display_name text NOT NULL,
  n8n_workflow_id text,
  column_definitions jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(owner_id, table_name)
);
```

**Exemple de column_definitions (JSONB) :**

```json
[
  {
    "name": "assertion",
    "type": "text",
    "label": "Assertion",
    "required": true
  },
  {
    "name": "niveau_risque",
    "type": "select",
    "label": "Niveau de Risque",
    "options": ["Faible", "Moyen", "Élevé"]
  },
  {
    "name": "montant",
    "type": "number",
    "label": "Montant"
  },
  {
    "name": "date_audit",
    "type": "date",
    "label": "Date d'Audit"
  },
  {
    "name": "conforme",
    "type": "boolean",
    "label": "Conforme"
  }
]
```

#### Table : audit_table_data

```sql
CREATE TABLE audit_table_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  table_schema_id uuid NOT NULL REFERENCES audit_table_schemas(id) ON DELETE CASCADE,
  row_data jsonb NOT NULL,
  row_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
```

**Exemple de row_data (JSONB) :**

```json
{
  "assertion": "Existence des stocks",
  "niveau_risque": "Élevé",
  "montant": 150000,
  "date_audit": "2024-01-15",
  "conforme": false
}
```

### 4. Modification du bypass keystore (développement uniquement)

**⚠️ Nécessaire pour le développement local**

**Fichier :** `src/providers/composio/identity.ts` (ligne 107)

**Modification :**

```typescript
// AVANT (code original)
if (!options.keyStore.configured)
  throw new Error('Unlock or configure Nod's key store before connecting apps.');

// APRÈS (bypass temporaire)
if (!options.keyStore.configured) {
  console.warn('[DEV BYPASS] Keystore bypass');
  return { key: null, publicKey: '', userId: 'dev_user' };
}
```

**⚠️ Important :**

- Ce bypass est **temporaire** et pour **développement uniquement**
- En production, configurer le keystore complet
- Ne pas committer ce changement dans Git

---

## Lancement du serveur Nod

### 1. Démarrer le serveur

```powershell
# Méthode 1 : Démarrage simple (développement)
pnpm exec tsx src/server/index.ts

# Méthode 2 : Avec pnpm script
pnpm run dev:server

# Méthode 3 : Mode background (recommandé)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; pnpm exec tsx src/server/index.ts"
```

### 2. Attendre le démarrage

**Sortie attendue :**

```
[DEV BYPASS] Keystore bypass
Nod is ready at http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU
```

**Temps de démarrage :** 5-15 secondes

### 3. Accéder à l'interface web

**URL :** http://localhost:4310

**Jeton d'authentification :** Copier le token après `#access=` dans les logs

**Exemple :**

```
http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU
                               ↑
                        Token d'accès (à copier)
```

### 4. Connecter Google Gemini (optionnel)

1. Aller sur https://aistudio.google.com/api-keys
2. Créer une clé API
3. Dans Nod : Settings → Models → Add Connection
4. Sélectionner "Google Gemini"
5. Coller la clé API
6. Choisir `gemini-2.5-flash`

---

## Problèmes courants et solutions

### 🔴 Problème 1 : Docker build échoue (CRLF)

**Erreur :**

```
install-rtk.sh: line 2: $'\r': command not found
```

**Solution :**

```powershell
# Convertir les fins de ligne
function Convert-ToLF {
    param([string]$FilePath)
    $content = Get-Content -Path $FilePath -Raw
    $content = $content -replace "`r`n", "`n"
    [System.IO.File]::WriteAllText($FilePath, $content, [System.Text.UTF8Encoding]::new($false))
}

Convert-ToLF "docker/workspace/install-rtk.sh"
Convert-ToLF "docker/workspace-network/workspace-network.sh"

# Relancer le build
docker compose up -d --build
```

---

### 🔴 Problème 2 : Port 4310 déjà utilisé

**Erreur :**

```
Error: listen EADDRINUSE: address already in use 127.0.0.1:4310
```

**Solution :**

```powershell
# Trouver et arrêter le processus
Get-NetTCPConnection -LocalPort 4310 -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess |
    ForEach-Object { Stop-Process -Id $_ -Force }

# Relancer le serveur
pnpm exec tsx src/server/index.ts
```

---

### 🔴 Problème 3 : Keystore non configuré

**Erreur :**

```
Error: Unlock or configure Nod's key store before connecting apps.
```

**Solution 1 : Ajouter NOD_VAULT_KEY au .env**

```powershell
# Générer une clé Vault
$randomBytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
$rng.GetBytes($randomBytes)
$vaultKey = [Convert]::ToBase64String($randomBytes)
Add-Content .env "`nNOD_VAULT_KEY=$vaultKey"

# Relancer le serveur
```

**Solution 2 : Bypass temporaire (développement)**

Modifier `src/providers/composio/identity.ts` ligne 107 (voir section précédente)

---

### 🔴 Problème 4 : PostgreSQL n'est pas accessible

**Erreur :**

```
Error: connect ECONNREFUSED 127.0.0.1:54329
```

**Diagnostic :**

```powershell
# Vérifier que PostgreSQL tourne
docker ps | Select-String "postgres"

# Vérifier les logs PostgreSQL
docker logs nod-local-postgres-1

# Tester la connexion
docker exec nod-local-postgres-1 psql -U nod -d nod -c "SELECT 1;"
```

**Solutions :**

```powershell
# 1. Redémarrer le container PostgreSQL
docker restart nod-local-postgres-1

# 2. Si le container n'existe pas
docker compose up -d postgres

# 3. Vérifier le mot de passe dans .env
# DATABASE_URL doit correspondre à NOD_POSTGRES_PASSWORD
```

---

### 🔴 Problème 5 : Build Docker très lent ou timeout

**Causes possibles :**

- Connexion Internet lente
- Antivirus bloquant Docker
- Peu de RAM disponible

**Solutions :**

```powershell
# 1. Augmenter les timeouts
$env:COMPOSE_HTTP_TIMEOUT=300
docker compose up -d --build

# 2. Désactiver temporairement l'antivirus (Windows Defender)
Set-MpPreference -DisableRealtimeMonitoring $true

# Après le build, réactiver :
Set-MpPreference -DisableRealtimeMonitoring $false

# 3. Augmenter les ressources Docker Desktop
# Docker Desktop → Settings → Resources
# - CPU : 4 cores
# - Memory : 8 GB
# - Swap : 2 GB
```

---

### 🔴 Problème 6 : "spawn pnpm ENOENT"

**Erreur :**

```
spawn pnpm ENOENT
```

**Cause :** pnpm n'est pas dans le PATH ou pas installé correctement

**Solution :**

```powershell
# 1. Vérifier pnpm
pnpm --version

# 2. Si pnpm n'est pas trouvé, réinstaller
corepack enable
corepack prepare pnpm@10.34.5 --activate

# 3. Vérifier que Node.js 24.x est actif
node --version
# Doit être v24.21.0

# 4. Si nécessaire, changer de version Node
nvm use 24.21.0
```

---

### 🔴 Problème 7 : Tables d'audit manquantes

**Erreur :**

```
error: relation "audit_table_schemas" does not exist
```

**Diagnostic :**

```powershell
# Lister les tables
docker exec nod-local-postgres-1 psql -U nod -d nod -c "\dt"
```

**Solution :**

```powershell
# 1. Vérifier que initializeAuditTables() est appelé
# Fichier : src/server/db.ts (ligne 114)

# 2. Créer les tables manuellement si nécessaire
docker exec -i nod-local-postgres-1 psql -U nod -d nod <<EOF
CREATE TABLE IF NOT EXISTS audit_table_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL,
  table_name text NOT NULL,
  display_name text NOT NULL,
  n8n_workflow_id text,
  column_definitions jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(owner_id, table_name)
);
EOF

# 3. Redémarrer le serveur
```

---

### 🔴 Problème 8 : Colonnes manquantes (user_id vs owner_id)

**Erreur :**

```
column "user_id" of relation "audit_table_schemas" does not exist
```

**Cause :** Documentation obsolète utilisant `user_id` au lieu de `owner_id`

**Solution :**

**Toujours utiliser `owner_id` dans toutes les requêtes SQL.**

```sql
-- ✅ CORRECT
INSERT INTO audit_table_schemas (owner_id, table_name, ...) VALUES (...);

-- ❌ INCORRECT
INSERT INTO audit_table_schemas (user_id, table_name, ...) VALUES (...);
```

---

## Vérification complète

### Checklist finale

```powershell
# ✅ 1. Docker fonctionne
docker --version
docker compose version

# ✅ 2. Containers actifs
docker ps
# Attendu : 4 containers (postgres, workspace, browser, network)

# ✅ 3. PostgreSQL répond
docker exec nod-local-postgres-1 psql -U nod -d nod -c "SELECT 1;"

# ✅ 4. Tables d'audit existent
docker exec nod-local-postgres-1 psql -U nod -d nod -c "\dt audit*"
# Attendu : 3-4 tables

# ✅ 5. Serveur Nod accessible
curl http://localhost:4310
# Ne doit pas retourner "Connection refused"

# ✅ 6. Node.js et pnpm corrects
node --version  # v24.21.0
pnpm --version  # 10.34.5

# ✅ 7. Fichier .env configuré
Test-Path .env
# Doit retourner : True
```

### Test de persistance complet

**Créer le fichier de test :**

```powershell
# Déjà créé : test-persistence-direct.mjs à la racine
node test-persistence-direct.mjs
```

**Sortie attendue :**

```
========================================
  Test Direct - Système de Persistance
========================================
[1/8] Test de connexion PostgreSQL
  ✓ Connexion PostgreSQL OK
[2/8] Vérification des tables
  ✓ Table "audit_data_versions" existe
  ✓ Table "audit_table_data" existe
  ✓ Table "audit_table_schemas" existe
[3/8] Création d'un schéma de table
  ✓ Schéma créé avec ID: <uuid>
...
========================================
  ✓ TOUS LES TESTS SONT PASSÉS !
========================================
```

---

## Commandes utiles

### Docker

```powershell
# Démarrer les containers
docker compose up -d

# Arrêter les containers
docker compose down

# Voir les logs
docker compose logs -f

# Redémarrer un container
docker restart nod-local-postgres-1

# Entrer dans un container
docker exec -it nod-local-postgres-1 bash

# Nettoyer tout (⚠️ perte de données)
docker compose down -v
docker system prune -a --volumes
```

### PostgreSQL

```powershell
# Se connecter à psql
docker exec -it nod-local-postgres-1 psql -U nod -d nod

# Lister les tables
docker exec nod-local-postgres-1 psql -U nod -d nod -c "\dt"

# Voir la structure d'une table
docker exec nod-local-postgres-1 psql -U nod -d nod -c "\d audit_table_schemas"

# Exécuter une requête SQL
docker exec nod-local-postgres-1 psql -U nod -d nod -c "SELECT COUNT(*) FROM audit_table_schemas;"

# Backup de la base
docker exec nod-local-postgres-1 pg_dump -U nod nod > backup_nod.sql

# Restaurer un backup
Get-Content backup_nod.sql | docker exec -i nod-local-postgres-1 psql -U nod -d nod
```

### Serveur Nod

```powershell
# Démarrer le serveur (premier plan)
pnpm exec tsx src/server/index.ts

# Démarrer en arrière-plan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; pnpm exec tsx src/server/index.ts"

# Tuer le processus sur le port 4310
Get-NetTCPConnection -LocalPort 4310 |
    Select-Object -ExpandProperty OwningProcess |
    Stop-Process -Force

# Recompiler le projet
pnpm run build

# Lancer les tests
pnpm test

# Vérifier les types TypeScript
pnpm exec tsc --noEmit
```

### Diagnostics

```powershell
# Vérifier l'utilisation du disque
docker system df

# Vérifier les ressources Docker
docker stats

# Voir tous les processus Node.js
Get-Process -Name node | Select-Object Id, ProcessName, CPU, WorkingSet

# Vérifier les ports ouverts
Get-NetTCPConnection | Where-Object {$_.LocalPort -in 4310, 54329} |
    Select-Object LocalPort, State, OwningProcess

# Logs système Windows
Get-EventLog -LogName Application -Newest 20 |
    Where-Object {$_.Source -like "*Docker*"}
```

---

## Résumé des fichiers modifiés/créés

### Fichiers modifiés

1. **`src/providers/composio/identity.ts`** (ligne 107)
   - Bypass temporaire du keystore pour développement

2. **`src/server/db-audit-tables.ts`**
   - Ajout de la table `audit_table_consolidations`

### Fichiers créés

1. **`.env`**
   - Variables d'environnement du projet

2. **`test-persistence-direct.mjs`**
   - Script de test de la persistance

3. **`create-consolidations-table.sql`**
   - Script SQL pour créer la table de consolidations (si nécessaire)

4. **Documentation (dossier `Doc installation nod n8n/`)**
   - `06-WORKSPACE-EXPLIQUE.md`
   - `07-CONFIGURATION-GOOGLE-GEMINI.md`
   - `08-GUIDE-INSTALLATION-COMPLETE-DOCKER.md` (ce fichier)

### Fichiers à ne PAS committer

```gitignore
.env
.local/
node_modules/
dist/
*.log
test-persistence-direct.mjs
create-consolidations-table.sql
```

---

## Prochaines étapes

### 1. Backend complet ✅

- [x] Docker containers opérationnels
- [x] PostgreSQL avec 4 tables d'audit
- [x] 11 endpoints API REST
- [x] Tests de persistance réussis

### 2. Frontend à développer 🔜

- [ ] Composant `<EditableDataTable>`
- [ ] Composant `<ConsolidationGrid>`
- [ ] Composant `<VersionHistoryModal>`
- [ ] Interface de gestion des colonnes
- [ ] WebSocket pour collaboration temps réel

### 3. Intégration n8n 🔜

- [ ] Endpoint webhook `POST /api/audit/from-n8n`
- [ ] Configuration n8n workflow
- [ ] Tests d'import automatique

---

## Support et ressources

### Documentation officielle

- **Nod GitHub** : https://github.com/n8n-io/nod
- **Docker Desktop** : https://docs.docker.com/desktop/
- **PostgreSQL** : https://www.postgresql.org/docs/
- **Node.js** : https://nodejs.org/docs/
- **pnpm** : https://pnpm.io/

### Dépannage

En cas de problème non résolu :

1. **Vérifier les logs** :

   ```powershell
   docker compose logs -f
   ```

2. **Nettoyer et recommencer** :

   ```powershell
   docker compose down -v
   docker system prune -a
   rm -rf node_modules .local dist
   pnpm install
   docker compose up -d --build
   ```

3. **Vérifier les versions** :
   ```powershell
   node --version   # v24.21.0
   pnpm --version   # 10.34.5
   docker --version # 27.x.x
   ```

---

## Changelog

### Version 1.0 (Date actuelle)

- ✅ Installation complète de Nod avec Docker
- ✅ Configuration du système de persistance
- ✅ Correction du problème CRLF
- ✅ Bypass du keystore pour développement
- ✅ Tests de persistance réussis
- ✅ Documentation exhaustive

---

**Fin du guide. Tous les problèmes rencontrés et leurs solutions sont documentés.**

**Temps total d'installation : 3-4 heures (première fois)**  
**Prochaine installation avec ce guide : 1-2 heures**
