# Build Desktop Electron & Installation WSL2

**Date** : 13 novembre 2026, 00:45 UTC  
**Workspace** : h:\nod_n8n

---

## 📋 Résumé des Réponses

### 1. Build Desktop Electron

**Status** : ⏸️ **REPORTÉ** (recommandé)

**Raison** : Le build complet nécessite :

- ⏱️ Temps : 1-2 heures
- 💾 Espace : ~15-20 GB dans `.local/`
- 🐳 Docker Desktop actif (consommation RAM élevée)
- 🔧 NSIS installé pour créer l'installeur Windows

**Recommandation** : Effectuer le build **APRÈS** :

1. ✅ Tests manuels frontend terminés
2. ✅ Migration vers WSL2 + Docker dans WSL2 (moins de RAM)
3. ✅ Validation complète du système

### 2. Docker Desktop Nécessaire ?

**Réponse** : ✅ **OUI**, mais seulement pour la préparation

**Détails** :

**Phase 1 : Préparation Runtime** (`pnpm run desktop:windows:prepare`)

- 🐳 **Docker REQUIS**
- Build images Linux (workspace, browser, postgres)
- Création rootfs compressé (guest.tar.gz)
- Export système de fichiers (~500 MB)
- Temps : ~30-60 minutes

**Phase 2 : Build Final** (`pnpm run desktop:windows:build`)

- 🐳 **Docker PAS requis** (si assets préparés)
- Compile transport Go (wsl-docker)
- Package Electron app
- Crée installeur NSIS
- Temps : ~30 minutes

**Conclusion** : Docker Desktop peut être arrêté APRÈS la préparation des assets.

### 3. Installation WSL2

**Status** : ✅ **INSTALLÉ** (Ubuntu 22.04 LTS)

**Ce qui a été fait** :

```bash
wsl --install -d Ubuntu-22.04
```

**Résultat** :

- ✅ Téléchargement : 100% (Ubuntu 22.04)
- ✅ Installation : 100%
- ✅ Distribution lancée : Ubuntu-22.04
- ⏸️ Configuration initiale en cours (timeout 5 min normal)

**Prochaines étapes** : Voir section "Installation WSL2" ci-dessous.

---

## 🔧 Prérequis Build Desktop

### Installés ✅

| Composant      | Version  | Status      |
| -------------- | -------- | ----------- |
| Node.js        | v24.21.0 | ✅ OK       |
| Go             | go1.23.5 | ✅ OK       |
| Docker Desktop | 29.9.3   | ✅ OK       |
| WSL2           | 2        | ✅ OK       |
| Ubuntu 22.04   | Latest   | ✅ Installé |

### À Vérifier ⚠️

| Composant     | Chemin                                     | Status              |
| ------------- | ------------------------------------------ | ------------------- |
| NSIS          | `C:\Program Files (x86)\NSIS\makensis.exe` | ❓ Non vérifié      |
| Espace disque | `.local/`                                  | ⚠️ ~15-20 GB requis |

---

## 🚀 Procédure Build Desktop (Quand Prêt)

### Étape 1 : Préparation Runtime (Docker requis)

```bash
cd h:\nod_n8n

# Préparer les assets Windows (images Linux, rootfs)
pnpm run desktop:windows:prepare

# Durée : ~30-60 minutes
# Espace : ~5-10 GB dans .local/windows-runtime-assets/
# RAM : 6-8 GB (Docker + build)
```

**Outputs attendus** :

- `.local/windows-runtime-assets/guest.tar.gz` (~500 MB)
- `.local/windows-runtime-assets/images/*.tar.zst` (3 images)
- `.local/windows-runtime-assets/manifest.json`

### Étape 2 : Build Final (Docker optionnel)

```bash
# Build l'application Electron + installeur
pnpm run desktop:windows:build

# Durée : ~30 minutes
# Espace : ~5-10 GB dans dist/windows/
```

**Outputs attendus** :

- `dist/windows/nod-Setup-x64.exe` (~300-500 MB) - Installeur
- `dist/windows/nod-Runtime-win32-x64.tar.gz` (~500 MB) - Runtime
- `dist/windows/release-win32-x64.json` - Metadata
- `dist/windows/SHA256SUMS` - Checksums

### Étape 3 : Test Local

```bash
# Installer l'app
dist\windows\nod-Setup-x64.exe

# Ou lancer sans installer
dist\windows\Nod-win32-x64\nod.exe
```

---

## 🐧 Installation WSL2 Complète

### État Actuel

**Distributions installées** :

```
NAME                STATE           VERSION
docker-desktop      Running         2
nod-1fcc0aaaa064    Installing      2
Ubuntu-22.04        Stopped         2       ← NOUVEAU
```

### Configuration Initiale Ubuntu

Ouvrez un nouveau terminal PowerShell et lancez :

```bash
# Lancer Ubuntu pour la première fois
wsl -d Ubuntu-22.04

# Vous serez invité à créer :
# - Username (ex: leader)
# - Password (à définir)
```

### Installation Docker dans WSL2

Une fois Ubuntu configuré :

```bash
# Dans WSL2 Ubuntu
sudo apt update
sudo apt install -y ca-certificates curl gnupg

# Ajouter clé GPG Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Ajouter repository Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installer Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Ajouter user au groupe docker
sudo usermod -aG docker $USER

# Démarrer Docker
sudo service docker start

# Vérifier
docker --version
docker ps
```

### Migration des Containers

Une fois Docker dans WSL2 opérationnel :

```bash
# 1. Exporter les données PostgreSQL depuis Docker Desktop
docker exec nod-local-postgres-1 pg_dumpall -U nod > backup-nod.sql

# 2. Copier docker-compose.yml dans WSL2
# Dans PowerShell :
wsl -d Ubuntu-22.04 -- mkdir -p /home/leader/nod
Copy-Item h:\nod_n8n\docker-compose.yml \\wsl$\Ubuntu-22.04\home\leader\nod\

# 3. Dans WSL2 Ubuntu
cd ~/nod
docker compose up -d

# 4. Restaurer données PostgreSQL
docker exec -i nod-local-postgres-1 psql -U nod -d nod < backup-nod.sql
```

### Comparaison RAM

| Solution             | RAM Idle | RAM Active | Notes                  |
| -------------------- | -------- | ---------- | ---------------------- |
| **Docker Desktop**   | ~2 GB    | ~4-6 GB    | Hyper-V + WSL2 backend |
| **Docker dans WSL2** | ~500 MB  | ~2-3 GB    | ✅ **50% moins**       |

### Avantages Docker dans WSL2

✅ **Moins de RAM** : ~2-3 GB vs 4-6 GB  
✅ **Plus rapide** : Accès direct au kernel Linux  
✅ **Plus flexible** : Accès shell Linux natif  
✅ **Gratuit** : Pas de licence Docker Desktop Pro  
✅ **Léger** : Pas de GUI Docker Desktop

### Désavantages

❌ **Pas de GUI** : Gestion containers en CLI uniquement  
❌ **Setup manuel** : Configuration initiale plus longue  
❌ **Auto-start** : Docker ne démarre pas automatiquement

---

## 📊 Recommandations Finales

### Ordre des Actions Recommandé

**Aujourd'hui (Immédiat)** :

1. ✅ **Finir configuration Ubuntu 22.04**

   ```bash
   wsl -d Ubuntu-22.04
   # Créer username/password
   ```

2. ✅ **Tester serveur Nod actuel**

   ```
   http://localhost:4310/#access=...
   Effectuer tests manuels frontend (10 tests)
   ```

3. ⏸️ **Garder Docker Desktop actif** (pour l'instant)

**Cette Semaine** :

1. 🐳 **Installer Docker dans WSL2** (2-3h)
2. 🔄 **Migrer containers vers WSL2** (1h)
3. 📊 **Valider consommation RAM** (~50% réduction attendue)
4. ❌ **Désinstaller Docker Desktop** (libère 4-6 GB RAM)

**Quand Migration WSL2 Terminée** :

1. 🏗️ **Build Desktop Electron** (2-3h total)
2. 🧪 **Tester app Electron locale**
3. 📦 **Distribuer si validation OK**

---

## 🔍 Vérifications Importantes

### Avant Build Desktop

**Checklist** :

- [ ] Tests frontend manuels terminés (10/10)
- [ ] Bugs frontend corrigés
- [ ] NSIS installé (`makensis.exe` disponible)
- [ ] ~20 GB espace disque libre sur `h:\`
- [ ] Docker Desktop actif (pour préparation)
- [ ] Temps disponible : 2-3 heures

### Avant Migration WSL2

**Checklist** :

- [ ] Backup données PostgreSQL (`pg_dumpall`)
- [ ] Backup .env et configurations Nod
- [ ] Temps disponible : 2-3 heures
- [ ] Docker Desktop peut rester actif pendant migration
- [ ] Tests effectués pour valider après migration

---

## 📝 Commandes Rapides

### WSL2

```bash
# Lister distributions
wsl --list --verbose

# Lancer Ubuntu
wsl -d Ubuntu-22.04

# Arrêter toutes distributions
wsl --shutdown

# Définir Ubuntu comme défaut
wsl --set-default Ubuntu-22.04

# Mettre à jour WSL
wsl --update
```

### Docker Desktop vs WSL2

```bash
# Voir RAM Docker Desktop
docker stats --no-stream

# Dans WSL2, voir RAM globale
wsl -d Ubuntu-22.04 -- free -h

# Voir processus WSL2
Get-Process vmmem
```

### Build Desktop

```bash
# Préparer runtime (Docker requis)
pnpm run desktop:windows:prepare

# Build final
pnpm run desktop:windows:build

# Build complet (prepare + build)
pnpm run desktop:windows:prepare && pnpm run desktop:windows:build
```

---

## ⚠️ Problèmes Connus

### Build Desktop

**Problème 1** : Erreur "NSIS not found"  
**Solution** : Installer NSIS depuis https://nsis.sourceforge.io/Download

**Problème 2** : Espace disque insuffisant  
**Solution** : Nettoyer `.local/` ou changer `NOD_RUNTIME_ASSETS`

**Problème 3** : Timeout Docker build  
**Solution** : Augmenter RAM Docker Desktop (Settings → Resources)

### WSL2

**Problème 1** : Ubuntu ne démarre pas  
**Solution** : `wsl --shutdown` puis `wsl -d Ubuntu-22.04`

**Problème 2** : Docker ne démarre pas dans WSL2  
**Solution** : `sudo service docker start` manuellement

**Problème 3** : Accès réseau lent  
**Solution** : Configurer DNS dans `/etc/resolv.conf`

---

## 📚 Documentation Référence

### Build Desktop

- Script préparation : `desktop/scripts/prepare-windows-runtime.mjs`
- Script build : `desktop/scripts/build-windows.mjs`
- Dockerfile : `desktop/runtime/Dockerfile.windows`
- Transport Go : `desktop/runtime/wsl-docker_windows.go`

### WSL2

- Documentation Microsoft : https://learn.microsoft.com/en-us/windows/wsl/
- Docker dans WSL2 : https://docs.docker.com/desktop/wsl/
- Ubuntu WSL : https://ubuntu.com/wsl

---

## 🎯 Résumé Statut

| Composant            | Status        | Action Requise                        |
| -------------------- | ------------- | ------------------------------------- |
| **Build Desktop**    | ⏸️ Reporté    | Après tests frontend + migration WSL2 |
| **Docker Desktop**   | ✅ Actif      | Garder pour l'instant                 |
| **WSL2**             | ✅ Installé   | Configurer Ubuntu 22.04               |
| **Ubuntu 22.04**     | ⏸️ Config     | Créer user/password                   |
| **Docker dans WSL2** | ⏸️ À faire    | Installer après config Ubuntu         |
| **Tests Frontend**   | ⏸️ En attente | 10 tests manuels dans navigateur      |

---

**Créé** : 13 novembre 2026, 00:45 UTC  
**Par** : Kiro (Assistant IA)  
**Prochaine étape** : Configurer Ubuntu 22.04 (`wsl -d Ubuntu-22.04`)
