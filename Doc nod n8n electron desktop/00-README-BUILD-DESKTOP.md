# Build Nod Desktop Electron - Guide Complet

**Date** : 13 novembre 2026  
**Plateforme** : Windows x64  
**Version Electron** : (voir package.json)  
**Workspace** : h:\nod_n8n

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Architecture Build](#architecture-build)
4. [Préparation Runtime](#préparation-runtime)
5. [Build Final](#build-final)
6. [Installation et Test](#installation-et-test)
7. [Résolution Problèmes](#résolution-problèmes)

---

## 🎯 Vue d'Ensemble

### Qu'est-ce que Nod Desktop ?

**Nod Desktop** est la version Electron de Nod (n8n AI assistant) pour Windows, macOS et Linux.

**Composants** :

- **Application Electron** : Interface graphique (React + TypeScript)
- **Runtime WSL2** : Containers Docker Linux dans WSL2 (workspace, browser, postgres)
- **Transport Go** : Binaire `wsl-docker.exe` pour communication Windows ↔ WSL2
- **Base de données** : PostgreSQL 17 dans container
- **Workspace** : Sandbox Linux isolé pour l'agent
- **Browser** : Navigateur Chromium headless pour web automation

### Différences Desktop vs Web

| Fonctionnalité   | Desktop                | Web (localhost:4310)       |
| ---------------- | ---------------------- | -------------------------- |
| **Installation** | Installeur .exe        | Serveur Node.js local      |
| **Runtime**      | WSL2 + Docker embedded | Docker Desktop séparé      |
| **Updates**      | Auto-update intégré    | Git pull manuel            |
| **Distribution** | Standalone (~500 MB)   | Nécessite Node.js + Docker |
| **Local Files**  | Accès natif Windows    | Limité sandbox             |

### Outputs du Build

**Après build complet** :

- `dist/windows/nod-Setup-x64.exe` (~300-500 MB) - **Installeur**
- `dist/windows/nod-Runtime-win32-x64.tar.gz` (~500 MB) - **Runtime Linux**
- `dist/windows/release-win32-x64.json` - Métadonnées version
- `dist/windows/SHA256SUMS` - Checksums pour vérification

---

## 🔧 Prérequis

### Vérification Automatique

```powershell
# Script de vérification
cd h:\nod_n8n
node -e "
const { execSync } = require('child_process');
const fs = require('fs');

console.log('=== Verification Prerequis Build Desktop ===\n');

// Node.js
try {
  const nodeVersion = execSync('node --version', {encoding: 'utf8'}).trim();
  console.log('[OK] Node.js:', nodeVersion);
} catch { console.log('[ERREUR] Node.js non installe'); }

// Go
try {
  const goVersion = execSync('go version', {encoding: 'utf8'}).trim().split(' ')[2];
  console.log('[OK] Go:', goVersion);
} catch { console.log('[ERREUR] Go non installe'); }

// Docker
try {
  const dockerVersion = execSync('docker --version', {encoding: 'utf8'}).trim();
  console.log('[OK] Docker:', dockerVersion);
} catch { console.log('[ERREUR] Docker non installe'); }

// NSIS
const nsisPath = 'C:\\\\Program Files (x86)\\\\NSIS\\\\makensis.exe';
if (fs.existsSync(nsisPath)) {
  console.log('[OK] NSIS: installe');
} else {
  console.log('[ATTENTION] NSIS non installe (requis pour installeur)');
}

// Espace disque
const stats = fs.statSync('.');
console.log('\n[INFO] Espace requis: ~20 GB dans .local/');
"
```

### Prérequis Obligatoires

| Composant          | Version Minimum | Vérification       | Installation                                |
| ------------------ | --------------- | ------------------ | ------------------------------------------- |
| **Node.js**        | >= 24.21.0      | `node --version`   | https://nodejs.org/                         |
| **Go**             | >= 1.21         | `go version`       | https://go.dev/dl/                          |
| **Docker Desktop** | >= 24.0         | `docker --version` | https://docker.com/products/docker-desktop/ |
| **pnpm**           | >= 9.0          | `pnpm --version`   | `npm install -g pnpm`                       |

### Prérequis Optionnels

| Composant        | Usage                    | Installation                         |
| ---------------- | ------------------------ | ------------------------------------ |
| **NSIS**         | Créer installeur Windows | https://nsis.sourceforge.io/Download |
| **Code Signing** | Signer binaires (prod)   | Certificat EV requis                 |

### Espace Disque Requis

| Phase              | Espace        | Localisation                     |
| ------------------ | ------------- | -------------------------------- |
| **Runtime Assets** | ~5-10 GB      | `.local/windows-runtime-assets/` |
| **Build Staging**  | ~5-10 GB      | `dist/windows-staging/`          |
| **Output Final**   | ~1-2 GB       | `dist/windows/`                  |
| **Total**          | **~15-20 GB** | -                                |

### RAM Requise

- **Minimum** : 8 GB RAM totale
- **Recommandé** : 16 GB RAM totale
- **Peak usage** : 6-8 GB pendant build images Docker

---

## 🏗️ Architecture Build

### Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────┐
│         PHASE 1: Préparation Runtime                    │
│  (desktop:windows:prepare - Docker REQUIS)              │
└─────────────────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────┐
    │  Build 3 Docker Images Linux (workspace,      │
    │  browser, postgres) dans Docker Desktop       │
    │  → images/*.tar.zst (~2-3 GB)                │
    └───────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────┐
    │  Build Rootfs Linux (Ubuntu 22.04) avec      │
    │  Docker + Python guest script                 │
    │  → guest.tar.gz (~500 MB)                    │
    └───────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────┐
    │  Génération manifest.json avec checksums      │
    │  SHA256 pour vérification intégrité           │
    └───────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│         PHASE 2: Build Final Application                │
│  (desktop:windows:build - Docker OPTIONNEL)             │
└─────────────────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────┐
    │  Compile Transport Go (wsl-docker.exe)        │
    │  Binaire natif Windows pour WSL2              │
    └───────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────┐
    │  Copy Engine Source (Node.js backend)         │
    │  + Dependencies (node_modules production)     │
    └───────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────┐
    │  Build Desktop UI (React + Vite)              │
    │  Frontend compilé et optimisé                 │
    └───────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────┐
    │  Package Electron (electron-packager)         │
    │  → dist/windows/Nod-win32-x64/               │
    └───────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────┐
    │  Build Installeur NSIS (nod-Setup-x64.exe)   │
    │  + Code Signing (si certificat disponible)    │
    └───────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────┐
    │  Génération checksums SHA256 et metadata      │
    │  → release-win32-x64.json                    │
    └───────────────────────────────────────────────┘
```

### Fichiers Sources Clés

**Scripts Build** :

- `desktop/scripts/prepare-windows-runtime.mjs` - Préparation runtime
- `desktop/scripts/build-windows.mjs` - Build final
- `desktop/scripts/engine-source.mjs` - Copy engine source
- `desktop/scripts/engine-dependencies.mjs` - Copy dependencies
- `desktop/scripts/build-ui.mjs` - Build UI React
- `desktop/scripts/release-tools.mjs` - Utilitaires release
- `desktop/scripts/windows-signing.mjs` - Code signing
- `desktop/scripts/windows-installer.nsi` - NSIS script

**Runtime** :

- `desktop/runtime/Dockerfile.windows` - Build rootfs Linux
- `desktop/runtime/windows-guest.py` - Script Python guest
- `desktop/runtime/wsl-docker_windows.go` - Transport Go

**Configuration** :

- `desktop/package.json` - Metadata Electron app
- `desktop/scripts/runtime-build-lock.json` - Dépendances lockées

---

## ⚙️ Préparation Runtime

### Commande

```bash
cd h:\nod_n8n

# Préparer runtime Windows (Docker requis)
pnpm run desktop:windows:prepare

# Temps estimé : 30-60 minutes
# RAM peak : 6-8 GB
```

### Ce qui se passe

#### Étape 1 : Build Images Docker (15-30 min)

```bash
# Build 3 images Linux x64
docker build --platform linux/amd64 -t nod-local-workspace:latest .
docker build --platform linux/amd64 -t nod-local-browser:latest .
docker build --platform linux/amd64 -t postgres:17 .
```

**Outputs** :

- `.local/windows-runtime-assets/images/workspace.tar.zst` (~1-2 GB)
- `.local/windows-runtime-assets/images/browser.tar.zst` (~800 MB)
- `.local/windows-runtime-assets/images/postgres.tar.zst` (~200 MB)
- `.local/windows-runtime-assets/images-manifest.json`

#### Étape 2 : Build Rootfs Linux (10-20 min)

```bash
# Build image Ubuntu 22.04 custom
docker build --platform linux/amd64 \
  --tag nod-windows-rootfs:local \
  -f desktop/runtime/Dockerfile.windows \
  .local/windows-rootfs-context/
```

**Contenu Dockerfile** :

```dockerfile
FROM ubuntu:22.04

# Install Docker CLI
ADD docker.tgz /tmp/
RUN tar -xzf /tmp/docker.tgz -C /usr/local/bin --strip-components=1

# Install Python + dependencies
RUN apt-get update && apt-get install -y python3 python3-pip

# Copy guest script
COPY windows-guest.py /usr/local/bin/nod-guest
```

#### Étape 3 : Export et Compress (5-10 min)

```bash
# Export rootfs
docker export <container-id> | gzip -6 > guest.tar.gz
```

**Output** :

- `.local/windows-runtime-assets/guest.tar.gz` (~500 MB)

#### Étape 4 : Génération Manifest

```json
{
  "version": 1,
  "platform": "win32-x64",
  "guest": {
    "file": "guest.tar.gz",
    "bytes": 524288000,
    "expandedBytes": 1572864000,
    "sha256": "abc123..."
  },
  "images": [
    {
      "name": "workspace",
      "id": "sha256:def456...",
      "file": "images/workspace.tar.zst",
      "sha256": "ghi789...",
      "size": 2147483648
    },
    ...
  ]
}
```

### Vérifications

```bash
# Vérifier assets générés
ls -lh .local/windows-runtime-assets/

# Output attendu :
# guest.tar.gz                ~500 MB
# images/workspace.tar.zst    ~1-2 GB
# images/browser.tar.zst      ~800 MB
# images/postgres.tar.zst     ~200 MB
# manifest.json               ~1 KB
# images-manifest.json        ~1 KB

# Vérifier checksums
node -e "
const fs = require('fs');
const crypto = require('crypto');
const manifest = JSON.parse(fs.readFileSync('.local/windows-runtime-assets/manifest.json'));
const guestHash = crypto.createHash('sha256').update(fs.readFileSync('.local/windows-runtime-assets/guest.tar.gz')).digest('hex');
console.log('Guest hash match:', manifest.guest.sha256 === guestHash);
"
```

### En Cas d'Erreur

**Erreur 1** : `Docker daemon not running`

```bash
# Démarrer Docker Desktop
# Attendre icône verte dans barre des tâches
```

**Erreur 2** : `No space left on device`

```bash
# Nettoyer Docker
docker system prune -a --volumes -f

# Vérifier espace
df -h
```

**Erreur 3** : `Integrity check failed`

```bash
# Supprimer assets corrompus
rm -rf .local/windows-runtime-assets/

# Relancer préparation
pnpm run desktop:windows:prepare
```

---

## 🚀 Build Final

### Commande

```bash
cd h:\nod_n8n

# Build application Electron + installeur
pnpm run desktop:windows:build

# Temps estimé : 30-45 minutes
# RAM peak : 4-6 GB
```

### Ce qui se passe

#### Étape 1 : Compilation Transport Go (2-5 min)

```bash
go build -trimpath \
  -ldflags="-s -w -H=windowsgui" \
  -o engine/windows-runtime/bin/docker.exe \
  desktop/runtime/wsl-docker_windows.go
```

**Binaire généré** : `docker.exe` (~10-15 MB)

**Fonction** : Bridge Windows ↔ WSL2 pour commandes Docker

#### Étape 2 : Copy Engine Source (1-2 min)

```bash
# Copier backend Node.js
cp -r src/server/ dist/windows-staging/engine/

# Copier dependencies production only
cp -r node_modules/ dist/windows-staging/engine/node_modules/
```

#### Étape 3 : Build UI React (5-10 min)

```bash
# Build frontend avec Vite
vite build --outDir dist/windows-staging/app/ui

# Optimisations :
# - Minification JS/CSS
# - Tree-shaking
# - Code splitting
# - Asset hashing
```

#### Étape 4 : Package Electron (10-15 min)

```bash
# Package avec electron-packager
electron-packager dist/windows-staging/app \
  --platform=win32 \
  --arch=x64 \
  --out=dist/windows \
  --name=Nod \
  --asar=false
```

**Output** : `dist/windows/Nod-win32-x64/` (~300-400 MB)

**Contenu** :

```
Nod-win32-x64/
├── nod.exe               # Executable principal
├── resources/
│   ├── app/              # Application Electron
│   │   ├── main/         # Main process
│   │   ├── preload/      # Preload scripts
│   │   ├── ui/           # Frontend React
│   │   └── package.json
│   └── engine/           # Backend Node.js
│       ├── windows-runtime/
│       │   ├── bin/docker.exe
│       │   ├── guest.tar.gz
│       │   ├── images/
│       │   └── manifest.json
│       └── src/server/
└── ... (Electron binaries)
```

#### Étape 5 : Build Installeur NSIS (5-10 min)

```bash
# Créer installeur avec NSIS
makensis.exe \
  /DAPP_DIR=dist/windows/Nod-win32-x64 \
  /DOUTPUT=dist/windows/nod-Setup-x64.exe \
  /DVERSION=0.1.0 \
  desktop/scripts/windows-installer.nsi
```

**Script NSIS** (windows-installer.nsi) :

- Installation dans Program Files
- Création raccourcis Desktop + Start Menu
- Enregistrement désinstalleur
- Association fichiers (optionnel)
- Auto-start option (optionnel)

#### Étape 6 : Code Signing (optionnel)

Si `NOD_RELEASE_BUILD=true` et certificat disponible :

```bash
# Signer binaires
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com \
  dist/windows/Nod-win32-x64/nod.exe \
  dist/windows/nod-Setup-x64.exe
```

#### Étape 7 : Génération Metadata

```json
// dist/windows/release-win32-x64.json
{
  "version": "0.1.0",
  "source": "abc123def456...", // Git commit hash
  "platform": "win32-x64",
  "signing": {
    "mode": "unsigned" // ou "artifact-signing"
  },
  "installer": {
    "file": "nod-Setup-x64.exe",
    "bytes": 524288000,
    "sha256": "abc123..."
  },
  "runtime": {
    "file": "nod-Runtime-win32-x64.tar.gz",
    "bytes": 524288000,
    "sha256": "def456..."
  }
}
```

### Vérifications

```bash
# Vérifier outputs
ls -lh dist/windows/

# Output attendu :
# nod-Setup-x64.exe              ~300-500 MB
# nod-Runtime-win32-x64.tar.gz   ~500 MB
# release-win32-x64.json         ~1 KB
# SHA256SUMS                     ~256 bytes
# Nod-win32-x64/                 ~300-400 MB (dossier)

# Vérifier checksums
cd dist/windows
sha256sum -c SHA256SUMS
# nod-Setup-x64.exe: OK
# nod-Runtime-win32-x64.tar.gz: OK
```

---

## 📦 Installation et Test

### Installation Locale

**Option 1 : Via Installeur**

```bash
# Lancer installeur
dist\windows\nod-Setup-x64.exe

# Installation interactive :
# 1. Accept License
# 2. Choose Install Location (default: C:\Program Files\Nod)
# 3. Create Desktop Shortcut (optional)
# 4. Install
# 5. Launch Nod
```

**Option 2 : Portable (sans installation)**

```bash
# Lancer directement
dist\windows\Nod-win32-x64\nod.exe

# Pas d'installation requise
# Données dans %LOCALAPPDATA%\Nod
```

### Premier Lancement

**Ce qui se passe** :

1. Installation runtime WSL2 (~2-3 min)
2. Import guest.tar.gz dans WSL2 distribution `nod-<hash>`
3. Load images Docker (workspace, browser, postgres)
4. Génération clé Vault
5. Création base de données PostgreSQL
6. Ouverture fenêtre Nod

**Temps total** : ~5-10 minutes au premier lancement

### Tests Essentiels

#### Test 1 : Vérifier Runtime WSL2

```powershell
# Lister distributions WSL2
wsl --list --verbose

# Output attendu :
# nod-<hash>      Running      2
```

#### Test 2 : Vérifier Containers

```powershell
# Dans Nod, ouvrir DevTools (Ctrl+Shift+I)
# Console → Network → WebSocket
# Vérifier connexion au backend

# Ou vérifier containers directement
wsl -d nod-<hash> docker ps

# Output attendu :
# nod-local-postgres-1    healthy
# nod-workspace           running
# nod-browser             healthy
```

#### Test 3 : Tester Chat

```
1. Ouvrir Nod
2. Dans le chat, taper : "Hello, test message"
3. Attendre réponse de l'agent
4. Vérifier aucune erreur dans logs
```

#### Test 4 : Tester Système de Persistance

```
1. Générer une table (CSV ou LLM)
2. Éditer cellule
3. Cliquer Save (💾)
4. Recharger app (Ctrl+R)
5. Vérifier table restaurée
```

### Désinstallation

**Via Installeur** :

```
Panneau de configuration → Programmes → Désinstaller Nod
```

**Manuel (portable)** :

```bash
# Supprimer dossier app
rm -rf dist\windows\Nod-win32-x64

# Supprimer données
rm -rf %LOCALAPPDATA%\Nod

# Supprimer distribution WSL2
wsl --unregister nod-<hash>
```

---

## 🐛 Résolution Problèmes

### Build Failed

#### Erreur : "Go not found"

```bash
# Installer Go
winget install GoLang.Go

# Vérifier PATH
go version
```

#### Erreur : "NSIS not found"

```bash
# Installer NSIS
winget install NSIS.NSIS

# Ou télécharger : https://nsis.sourceforge.io/Download

# Vérifier installation
"C:\Program Files (x86)\NSIS\makensis.exe" /VERSION
```

#### Erreur : "Docker images build failed"

```bash
# Vérifier Docker Desktop running
docker ps

# Nettoyer cache Docker
docker builder prune -af

# Relancer build
pnpm run desktop:windows:prepare
```

#### Erreur : "Out of memory"

```bash
# Augmenter RAM Docker Desktop
# Docker Desktop → Settings → Resources → Memory → 8 GB

# Ou fermer applications inutiles
# Relancer build
```

### Runtime Failed

#### Erreur : "WSL2 not installed"

```powershell
# Installer WSL2
wsl --install

# Redémarrer PC
# Relancer Nod
```

#### Erreur : "Cannot import guest.tar.gz"

```powershell
# Vérifier fichier existe
Test-Path "dist\windows\Nod-win32-x64\resources\engine\windows-runtime\guest.tar.gz"

# Vérifier checksum
# Comparer avec manifest.json
```

#### Erreur : "PostgreSQL container failed"

```powershell
# Vérifier logs container
wsl -d nod-<hash> docker logs nod-local-postgres-1

# Si erreur port déjà utilisé
# Changer port dans .env ou arrêter autre PostgreSQL
```

### Performance Issues

#### App lente au démarrage

**Causes** :

- Premier lancement (import runtime)
- Antivirus scan
- Disque lent (HDD vs SSD)

**Solutions** :

- Attendre premier lancement complet
- Exclure dossier Nod de l'antivirus
- Installer sur SSD

#### RAM élevée

**Causes** :

- Containers Docker actifs
- Images Docker en mémoire
- Cache Electron

**Solutions** :

- Limiter RAM WSL2 (`.wslconfig`)
- Arrêter containers inutilisés
- Redémarrer app

---

## 📊 Statistiques Build

### Temps de Build

| Phase                   | Temps          | Notes                              |
| ----------------------- | -------------- | ---------------------------------- |
| **Préparation Runtime** | 30-60 min      | Dépend connexion (download images) |
| **Build Final**         | 30-45 min      | Dépend CPU (compilation Go, Vite)  |
| **Total**               | **1-2 heures** | Premier build plus long (cache)    |

### Taille Finale

| Fichier                          | Taille      | Usage                   |
| -------------------------------- | ----------- | ----------------------- |
| **nod-Setup-x64.exe**            | ~300-500 MB | Distribution installeur |
| **nod-Runtime-win32-x64.tar.gz** | ~500 MB     | Runtime Linux embedded  |
| **Nod-win32-x64/** (dossier)     | ~300-400 MB | App portable            |

### Ressources Requises

| Ressource  | Minimum | Recommandé | Notes                         |
| ---------- | ------- | ---------- | ----------------------------- |
| **CPU**    | 4 cores | 8+ cores   | Compilation Go + build images |
| **RAM**    | 8 GB    | 16 GB      | Peak 6-8 GB pendant build     |
| **Disque** | 20 GB   | 50 GB      | Includes cache Docker         |
| **Réseau** | 10 Mbps | 50+ Mbps   | Download images Docker        |

---

## ✅ Checklist Build

### Avant de Commencer

- [ ] Node.js >= 24.21.0 installé
- [ ] Go >= 1.21 installé
- [ ] Docker Desktop running
- [ ] NSIS installé (pour installeur)
- [ ] ~20 GB espace disque libre
- [ ] Tests frontend manuels terminés
- [ ] Tous containers Nod fonctionnent

### Préparation Runtime

- [ ] Commande `pnpm run desktop:windows:prepare` lancée
- [ ] Images Docker buildées (3/3)
- [ ] Rootfs Linux exporté (guest.tar.gz)
- [ ] Manifest généré avec checksums
- [ ] Espace .local/ ~5-10 GB utilisé

### Build Final

- [ ] Commande `pnpm run desktop:windows:build` lancée
- [ ] Transport Go compilé (docker.exe)
- [ ] Engine source copié
- [ ] UI React buildé
- [ ] App Electron packageé
- [ ] Installeur NSIS créé
- [ ] Metadata généré (release-win32-x64.json)

### Test Installation

- [ ] Installeur lance sans erreur
- [ ] App démarre (premier lancement ~5-10 min)
- [ ] Runtime WSL2 installé (`wsl --list`)
- [ ] Containers Docker running
- [ ] Chat fonctionne
- [ ] Système de persistance fonctionne

### Distribution

- [ ] Checksums vérifiés (SHA256SUMS)
- [ ] Binaires signés (si prod)
- [ ] Documentation utilisateur créée
- [ ] Release notes rédigées

---

## 🚀 Prochaines Étapes

### Après Build Réussi

1. **Tests Approfondis** (1-2 jours)
   - Tous scénarios utilisateur
   - Performance sous charge
   - Stabilité long terme

2. **Distribution Beta** (optionnel)
   - Partager avec testeurs
   - Collecter feedback
   - Corriger bugs identifiés

3. **Release Production**
   - Code signing avec certificat EV
   - Upload sur CDN/GitHub Releases
   - Annonce release

4. **Auto-Update** (si configuré)
   - Configurer `updateSourceUrl`
   - Serveur releases (GitHub/S3)
   - Tester update flow

---

## 📚 Ressources

### Documentation Officielle

- **Electron** : https://www.electronjs.org/docs
- **electron-packager** : https://github.com/electron/packager
- **NSIS** : https://nsis.sourceforge.io/Docs/

### Code Source

- **Build Scripts** : `desktop/scripts/`
- **Runtime** : `desktop/runtime/`
- **Main Process** : `desktop/main/`
- **Preload** : `desktop/preload/`

### Troubleshooting

- **Electron Issues** : https://github.com/electron/electron/issues
- **WSL2 Issues** : https://github.com/microsoft/WSL/issues

---

**Créé** : 13 novembre 2026, 01:15 UTC  
**Par** : Kiro (Assistant IA)  
**Status** : Documentation complète, build à lancer  
**Prochaine étape** : Lancer `pnpm run desktop:windows:prepare`
