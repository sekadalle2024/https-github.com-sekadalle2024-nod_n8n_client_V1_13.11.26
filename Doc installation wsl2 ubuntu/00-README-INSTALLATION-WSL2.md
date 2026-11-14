# Installation WSL2 + Ubuntu 22.04 - Guide Complet

**Date** : 13 novembre 2026  
**Système** : Windows AMD64  
**Distribution** : Ubuntu 22.04 LTS  
**Objectif** : Remplacer Docker Desktop par Docker dans WSL2 (économie RAM ~50%)

---

## 📋 Table des Matières

1. [État Initial](#état-initial)
2. [Installation WSL2](#installation-wsl2)
3. [Configuration Ubuntu](#configuration-ubuntu)
4. [Installation Docker dans WSL2](#installation-docker-dans-wsl2)
5. [Migration Containers](#migration-containers)
6. [Optimisations](#optimisations)
7. [Résolution Problèmes](#résolution-problèmes)

---

## 🎯 État Initial

### Avant Installation

**Docker Desktop** :

- RAM Idle : ~2 GB
- RAM Active : ~4-6 GB
- Backend : WSL2 (docker-desktop distribution)

**Objectif** :

- Installer Ubuntu 22.04 dans WSL2
- Installer Docker directement dans Ubuntu
- Migrer containers Nod vers Docker dans WSL2
- Désinstaller Docker Desktop
- **Gain RAM attendu** : ~50% (2-3 GB vs 4-6 GB)

### Distributions WSL2 Existantes

```bash
wsl --list --verbose
```

**Avant** :

```
NAME                STATE           VERSION
docker-desktop      Running         2
nod-1fcc0aaaa064    Installing      2
```

**Après installation Ubuntu** :

```
NAME                STATE           VERSION
docker-desktop      Running         2
Ubuntu-22.04        Stopped         2        ← NOUVEAU
nod-1fcc0aaaa064    Installing      2
```

---

## 🚀 Installation WSL2

### Étape 1 : Vérifier WSL2 Installé

```powershell
# Vérifier version WSL
wsl --version

# Vérifier status
wsl --status
```

**Résultat attendu** :

```
Version par défaut : 2
```

✅ **WSL2 déjà installé** (utilisé par Docker Desktop)

### Étape 2 : Installer Ubuntu 22.04

```powershell
# Installer Ubuntu 22.04 LTS
wsl --install -d Ubuntu-22.04
```

**Progression** :

```
Téléchargement : Ubuntu 22.04 LTS
[==========================100.0%==========================]

Installation : Ubuntu 22.04 LTS
[==========================100.0%==========================]

La distribution a été installée.
Il peut être lancé via 'wsl.exe -d Ubuntu-22.04'
```

**Temps** : ~5-10 minutes (dépend de la connexion)  
**Taille** : ~500 MB téléchargé, ~2 GB installé

✅ **Installation réussie** le 13 novembre 2026, 00:45 UTC

### Étape 3 : Vérifier Installation

```powershell
# Lister distributions
wsl --list --verbose

# Vérifier Ubuntu installé
wsl -d Ubuntu-22.04 --exec cat /etc/os-release
```

**Résultat attendu** :

```
NAME="Ubuntu"
VERSION="22.04.3 LTS (Jammy Jellyfish)"
```

---

## ⚙️ Configuration Ubuntu

### Première Configuration

```powershell
# Lancer Ubuntu pour première fois
wsl -d Ubuntu-22.04
```

**Prompts attendus** :

```
Installing, this may take a few minutes...
Please create a default UNIX user account.
The username does not need to match your Windows username.
For more information visit: https://aka.ms/wslusers

Enter new UNIX username:
```

**À définir** :

- **Username** : `leader` (ou votre choix)
- **Password** : [votre mot de passe]
- **Confirm password** : [répéter]

**Sortie** :

```
Installation successful!
To run a command as administrator (user "root"), use "sudo <command>".
See "man sudo_root" for details.

leader@HOSTNAME:~$
```

✅ **Configuration terminée**

### Vérifications Post-Installation

```bash
# Dans WSL2 Ubuntu
whoami              # Affiche: leader
pwd                 # Affiche: /home/leader
uname -a            # Affiche: Linux ... x86_64 GNU/Linux
lsb_release -a      # Affiche: Ubuntu 22.04.3 LTS
```

### Mise à Jour Système

```bash
# Mettre à jour packages
sudo apt update
sudo apt upgrade -y

# Installer outils essentiels
sudo apt install -y \
  build-essential \
  curl \
  wget \
  git \
  vim \
  ca-certificates \
  gnupg \
  lsb-release
```

**Temps** : ~5-10 minutes

---

## 🐳 Installation Docker dans WSL2

### Méthode Officielle Docker

**Référence** : https://docs.docker.com/engine/install/ubuntu/

### Étape 1 : Désinstaller Anciennes Versions

```bash
# Supprimer anciennes installations
sudo apt-get remove -y docker docker-engine docker.io containerd runc
```

### Étape 2 : Ajouter Repository Docker

```bash
# Installer prérequis
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Créer dossier keyrings
sudo mkdir -p /etc/apt/keyrings

# Télécharger clé GPG Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Définir permissions
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Ajouter repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### Étape 3 : Installer Docker Engine

```bash
# Mettre à jour index packages
sudo apt-get update

# Installer Docker
sudo apt-get install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin
```

**Temps** : ~5 minutes

### Étape 4 : Configuration Post-Installation

```bash
# Ajouter user au groupe docker
sudo usermod -aG docker $USER

# Activer auto-start Docker (optionnel)
sudo systemctl enable docker

# Démarrer Docker
sudo service docker start

# Vérifier status
sudo service docker status
```

**Sortie attendue** :

```
 * Docker is running
```

### Étape 5 : Tester Installation

```bash
# Vérifier version
docker --version
# Docker version 28.5.1, build ...

# Test hello-world
docker run hello-world
```

**Sortie attendue** :

```
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

✅ **Docker installé et fonctionnel dans WSL2**

### Étape 6 : Redémarrer Session

```bash
# Sortir de WSL2
exit

# Relancer (pour appliquer groupe docker)
wsl -d Ubuntu-22.04
```

Maintenant `docker ps` fonctionne **sans sudo**.

---

## 🔄 Migration Containers Nod

### Préparation

**IMPORTANT** : Effectuer backup AVANT migration

### Étape 1 : Backup Données PostgreSQL

```bash
# Dans PowerShell (avec Docker Desktop actif)
docker exec nod-local-postgres-1 pg_dumpall -U nod > h:\nod_n8n\backup-nod-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql
```

**Fichier créé** : `backup-nod-20261113-004500.sql`

### Étape 2 : Copier Fichiers vers WSL2

```powershell
# Créer dossier dans WSL2
wsl -d Ubuntu-22.04 -- mkdir -p /home/leader/nod

# Copier docker-compose.yml
Copy-Item "h:\nod_n8n\docker-compose.yml" "\\wsl$\Ubuntu-22.04\home\leader\nod\"

# Copier .env
Copy-Item "h:\nod_n8n\.env" "\\wsl$\Ubuntu-22.04\home\leader\nod\"

# Copier backup SQL
Copy-Item "h:\nod_n8n\backup-nod-*.sql" "\\wsl$\Ubuntu-22.04\home\leader\nod\"
```

### Étape 3 : Arrêter Containers Docker Desktop

```powershell
# Arrêter tous containers Nod
docker stop $(docker ps -q --filter "name=nod")

# Optionnel : supprimer containers (garde volumes)
docker rm $(docker ps -aq --filter "name=nod")
```

### Étape 4 : Démarrer Containers dans WSL2

```bash
# Dans WSL2 Ubuntu
cd ~/nod

# Vérifier fichiers
ls -la
# docker-compose.yml
# .env
# backup-nod-*.sql

# Lancer containers
docker compose up -d

# Vérifier status
docker ps
```

**Résultat attendu** :

```
CONTAINER ID   IMAGE                    STATUS
xxxx           postgres:17              Up 5 seconds (healthy)
xxxx           nod-local-workspace      Up 5 seconds
xxxx           nod-local-browser        Up 5 seconds (healthy)
```

### Étape 5 : Restaurer Données PostgreSQL

```bash
# Attendre que PostgreSQL soit ready
docker logs nod-local-postgres-1 --follow
# Attendre : "database system is ready to accept connections"

# Restaurer backup
docker exec -i nod-local-postgres-1 psql -U nod -d nod < backup-nod-*.sql
```

**Sortie attendue** :

```
SET
SET
CREATE TABLE
...
```

### Étape 6 : Vérifier Migration

```bash
# Vérifier tables
docker exec nod-local-postgres-1 psql -U nod -d nod -c "\dt"

# Vérifier données audit tables
docker exec nod-local-postgres-1 psql -U nod -d nod -c "SELECT COUNT(*) FROM audit_table_schemas;"
```

✅ **Migration réussie si données présentes**

---

## 🔧 Optimisations

### Limiter RAM WSL2

Par défaut, WSL2 peut utiliser jusqu'à 50% de la RAM totale.

**Créer** : `C:\Users\LEADER\.wslconfig`

```ini
[wsl2]
# Limiter RAM à 4 GB
memory=4GB

# Limiter CPU à 4 cores
processors=4

# Limiter swap
swap=2GB

# Désactiver localhost forwarding (optionnel)
localhostForwarding=true
```

**Appliquer** :

```powershell
wsl --shutdown
wsl -d Ubuntu-22.04
```

### Auto-Start Docker dans WSL2

**Méthode 1 : systemd (Ubuntu 22.04+)**

```bash
# Activer systemd dans WSL2
sudo nano /etc/wsl.conf
```

Ajouter :

```ini
[boot]
systemd=true
```

```bash
# Redémarrer WSL2
exit
wsl --shutdown
wsl -d Ubuntu-22.04

# Docker démarrera automatiquement
docker ps
```

**Méthode 2 : Script Manuel**

```bash
# Ajouter dans ~/.bashrc
echo 'if ! pgrep -x dockerd > /dev/null; then sudo service docker start > /dev/null 2>&1; fi' >> ~/.bashrc

# Recharger
source ~/.bashrc
```

### Accès Rapide depuis Windows

**Créer** : `h:\nod_n8n\Doc installation wsl2 ubuntu\wsl-docker.bat`

```batch
@echo off
wsl -d Ubuntu-22.04 -- docker %*
```

**Usage** :

```powershell
# Utiliser docker depuis PowerShell via WSL2
.\wsl-docker.bat ps
.\wsl-docker.bat compose up -d
```

---

## 🐛 Résolution Problèmes

### Problème 1 : Ubuntu ne démarre pas

**Symptômes** :

```
Catastrophic failure
```

**Solutions** :

```powershell
# 1. Redémarrer WSL
wsl --shutdown
wsl -d Ubuntu-22.04

# 2. Réenregistrer distribution
wsl --unregister Ubuntu-22.04
wsl --install -d Ubuntu-22.04

# 3. Vérifier Hyper-V activé
Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All
```

### Problème 2 : Docker ne démarre pas

**Symptômes** :

```
Cannot connect to the Docker daemon
```

**Solutions** :

```bash
# 1. Démarrer manuellement
sudo service docker start

# 2. Vérifier logs
sudo journalctl -u docker -n 50

# 3. Réinstaller Docker
sudo apt-get purge -y docker-ce docker-ce-cli containerd.io
sudo apt-get install -y docker-ce docker-ce-cli containerd.io
```

### Problème 3 : Permissions denied

**Symptômes** :

```
permission denied while trying to connect to the Docker daemon socket
```

**Solutions** :

```bash
# 1. Ajouter user au groupe docker
sudo usermod -aG docker $USER

# 2. Redémarrer session
exit
wsl -d Ubuntu-22.04

# 3. Vérifier groupes
groups
# Doit inclure "docker"
```

### Problème 4 : Réseau lent

**Symptômes** :

- `docker pull` très lent
- `apt update` timeout

**Solutions** :

```bash
# 1. Configurer DNS
sudo nano /etc/resolv.conf

# Remplacer par :
nameserver 8.8.8.8
nameserver 8.8.4.4

# 2. Désactiver generatedResolvConf
sudo nano /etc/wsl.conf

# Ajouter :
[network]
generateResolvConf = false

# 3. Redémarrer WSL
exit
wsl --shutdown
wsl -d Ubuntu-22.04
```

### Problème 5 : Espace disque WSL2

**Symptômes** :

```
No space left on device
```

**Solutions** :

```powershell
# 1. Compacter disque virtuel WSL2
wsl --shutdown
Optimize-VHD -Path "$env:LOCALAPPDATA\Packages\CanonicalGroupLimited.Ubuntu22.04LTS_*\LocalState\ext4.vhdx" -Mode Full

# 2. Agrandir disque (si nécessaire)
wsl -d Ubuntu-22.04
sudo apt-get clean
sudo apt-get autoclean
docker system prune -a --volumes -f
```

---

## 📊 Comparaison Avant/Après

### Consommation RAM

| Scénario                   | Docker Desktop | Docker WSL2 | Économie |
| -------------------------- | -------------- | ----------- | -------- |
| **Idle (aucun container)** | ~2 GB          | ~500 MB     | **75%**  |
| **4 containers Nod**       | ~4-6 GB        | ~2-3 GB     | **50%**  |
| **Build images**           | ~6-8 GB        | ~3-4 GB     | **50%**  |

### Performance

| Opération           | Docker Desktop | Docker WSL2            | Différence         |
| ------------------- | -------------- | ---------------------- | ------------------ |
| `docker ps`         | ~100ms         | ~50ms                  | **2x plus rapide** |
| `docker build`      | Normal         | Légèrement plus rapide | +10-20%            |
| `docker compose up` | Normal         | Identique              | -                  |

### Avantages Docker dans WSL2

✅ **Moins de RAM** : ~50% réduction  
✅ **Plus rapide** : Accès direct kernel Linux  
✅ **Plus flexible** : Shell Linux natif  
✅ **Gratuit** : Pas de licence Docker Desktop Pro  
✅ **Léger** : Pas de GUI

### Inconvénients

❌ **Pas de GUI** : Gestion CLI uniquement  
❌ **Setup manuel** : Configuration plus longue  
❌ **Auto-start** : Nécessite configuration systemd  
❌ **Support** : Pas de support officiel Docker Desktop

---

## 📝 Commandes Utiles

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

# Désinstaller distribution
wsl --unregister Ubuntu-22.04

# Exporter distribution (backup)
wsl --export Ubuntu-22.04 ubuntu-backup.tar

# Importer distribution (restore)
wsl --import Ubuntu-22.04 C:\WSL\Ubuntu-22.04 ubuntu-backup.tar
```

### Docker dans WSL2

```bash
# Démarrer Docker
sudo service docker start

# Arrêter Docker
sudo service docker stop

# Status Docker
sudo service docker status

# Logs Docker
sudo journalctl -u docker -n 100

# Nettoyer Docker
docker system prune -a --volumes -f

# Voir RAM utilisée
free -h
```

### Containers Nod

```bash
# Lancer tous containers
cd ~/nod
docker compose up -d

# Arrêter containers
docker compose down

# Voir logs
docker compose logs -f

# Rebuild images
docker compose build --no-cache
```

---

## ✅ Checklist Installation

### Avant Migration

- [ ] Backup PostgreSQL effectué
- [ ] Fichiers `.env` et `docker-compose.yml` copiés
- [ ] Docker Desktop fonctionne
- [ ] Containers Nod testés et opérationnels

### Installation WSL2

- [ ] WSL2 installé (`wsl --version`)
- [ ] Ubuntu 22.04 installé (`wsl -d Ubuntu-22.04`)
- [ ] User créé et configuré
- [ ] Système mis à jour (`sudo apt update && sudo apt upgrade`)

### Installation Docker

- [ ] Repository Docker ajouté
- [ ] Docker Engine installé
- [ ] User ajouté au groupe docker
- [ ] Docker démarre sans erreur
- [ ] Test `docker run hello-world` réussi

### Migration Containers

- [ ] Fichiers copiés dans WSL2
- [ ] Containers lancés dans WSL2
- [ ] PostgreSQL ready
- [ ] Données restaurées
- [ ] Tables audit vérifiées
- [ ] Serveur Nod fonctionne (port 4310)

### Optimisations

- [ ] `.wslconfig` créé (limite RAM)
- [ ] systemd activé (auto-start Docker)
- [ ] DNS configuré (si nécessaire)

### Validation Finale

- [ ] RAM consommation réduite (~50%)
- [ ] Containers Nod opérationnels
- [ ] Tests backend réussis (8/8)
- [ ] API accessible
- [ ] Docker Desktop peut être désinstallé

---

## 🎯 Prochaines Étapes

### Après Installation Réussie

1. **Tester pendant 24-48h**
   - Vérifier stabilité
   - Monitorer RAM
   - Valider performance

2. **Désinstaller Docker Desktop**
   - Panneau de configuration → Désinstaller
   - Libère 4-6 GB RAM
   - Garde distributions WSL2

3. **Configurer Auto-Start**
   - systemd dans WSL2
   - Script démarrage Windows (optionnel)

4. **Documenter Configuration**
   - Noter settings `.wslconfig`
   - Sauvegarder scripts
   - Mettre à jour documentation projet

---

## 📚 Ressources

### Documentation Officielle

- **WSL2** : https://learn.microsoft.com/en-us/windows/wsl/
- **Docker Ubuntu** : https://docs.docker.com/engine/install/ubuntu/
- **Docker Compose** : https://docs.docker.com/compose/

### Communauté

- **WSL GitHub** : https://github.com/microsoft/WSL
- **Docker Forums** : https://forums.docker.com/
- **Ubuntu WSL** : https://ubuntu.com/wsl

### Troubleshooting

- **WSL Issues** : https://github.com/microsoft/WSL/issues
- **Docker Issues** : https://github.com/docker/for-win/issues

---

---

## 🚀 Migration Complete - Prochaines Étapes

### Scripts de Migration Disponibles

Le projet dispose maintenant de **scripts automatisés** pour faciliter la migration de Docker Desktop vers Docker dans WSL2.

#### 1️⃣ Script de Migration Automatique

**Fichier** : `h:\nod_n8n\Doc installation wsl2 ubuntu\migrate-to-wsl2.ps1`

Ce script PowerShell effectue automatiquement:

- ✅ Vérification WSL2 et Ubuntu-22.04
- ✅ Installation Docker Engine dans WSL2
- ✅ Configuration auto-start avec systemd
- ✅ Copie des fichiers projet
- ✅ Tests de l'installation

**Usage** :

```powershell
# Depuis h:\nod_n8n
powershell -ExecutionPolicy Bypass -File ".\Doc installation wsl2 ubuntu\migrate-to-wsl2.ps1"
```

**Durée** : 15-20 minutes

#### 2️⃣ Script de Démarrage WSL2

**Fichier** : `h:\nod_n8n\Doc demarrer container & serveur\demarrer-tout-projet-wsl2.bat`

Ce script batch remplace l'ancien `demarrer-tout-projet.bat` pour utiliser Docker dans WSL2:

- ✅ Démarre WSL2 Ubuntu-22.04
- ✅ Démarre Docker daemon
- ✅ Lance les 4 containers Nod
- ✅ Attend PostgreSQL ready (jusqu'à 120s)
- ✅ Démarre le serveur Node.js
- ✅ Ouvre le navigateur

**Usage** :

```powershell
# Depuis h:\nod_n8n
.\Doc demarrer container & serveur\demarrer-tout-projet-wsl2.bat
```

#### 3️⃣ Guide de Migration Complet

**Fichier** : `h:\nod_n8n\Doc installation wsl2 ubuntu\01-MIGRATION-GUIDE.md`

Guide détaillé avec:

- ✅ Prérequis et checklist
- ✅ Comparaison Docker Desktop vs WSL2 Docker
- ✅ Instructions pas-à-pas
- ✅ Vérifications post-migration
- ✅ Dépannage complet (8 problèmes courants)
- ✅ Instructions de rollback
- ✅ Optimisations avancées

**Consultez ce guide** avant de migrer !

### Économie RAM Attendue

| Scénario                    | Docker Desktop | WSL2 Docker | Économie |
| --------------------------- | -------------- | ----------- | -------- |
| **Idle**                    | ~2 GB          | ~500 MB     | **75%**  |
| **Avec Nod (4 containers)** | 4-6 GB         | 2-3 GB      | **50%**  |

### Migration Rapide - 3 Commandes

```powershell
# 1. Arrêter Docker Desktop
Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue

# 2. Migrer vers WSL2
powershell -ExecutionPolicy Bypass -File ".\Doc installation wsl2 ubuntu\migrate-to-wsl2.ps1"

# 3. Redémarrer WSL2 et démarrer Nod
wsl --shutdown
.\Doc demarrer container & serveur\demarrer-tout-projet-wsl2.bat
```

### Vérification Post-Migration

```powershell
# Dans WSL2
wsl -d Ubuntu-22.04

# Vérifier Docker
docker --version
docker ps

# Vérifier containers Nod
docker ps --filter name=nod
# Attendu: 4 containers
```

### Rollback (Retour Docker Desktop)

Si problème, retour simple:

```powershell
# 1. Arrêter WSL2
wsl --shutdown

# 2. Relancer Docker Desktop
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# 3. Utiliser ancien script
.\Doc demarrer container & serveur\demarrer-tout-projet.bat
```

### Fichiers Projet dans WSL2

Après migration, les fichiers sont accessibles à **trois emplacements** :

1. **Windows natif** : `h:\nod_n8n\` (recommandé pour développement)
2. **WSL2 mount** : `/mnt/h/nod_n8n` (utilisé par Docker)
3. **WSL2 copie** : `/home/<user>/nod/` (backup configuration)

Les containers Docker utilisent `/mnt/h/nod_n8n` pour accéder aux fichiers Windows.

### Commandes Utiles

```powershell
# Voir containers depuis Windows
wsl -d Ubuntu-22.04 docker ps

# Logs en temps réel
wsl -d Ubuntu-22.04 bash -c "cd /mnt/h/nod_n8n && docker compose logs -f"

# Entrer dans WSL2
wsl -d Ubuntu-22.04

# Arrêter containers
wsl -d Ubuntu-22.04 bash -c "cd /mnt/h/nod_n8n && docker compose down"
```

### Support et Dépannage

Consultez le **guide de migration** pour dépannage détaillé:

- ✅ Docker ne démarre pas
- ✅ Permission denied
- ✅ Containers ne démarrent pas
- ✅ PostgreSQL timeout
- ✅ Réseau lent
- ✅ Espace disque plein
- ✅ RAM excessive
- ✅ Et plus...

**Fichier** : `.\Doc installation wsl2 ubuntu\01-MIGRATION-GUIDE.md`

---

**Créé** : 13 novembre 2026, 01:00 UTC  
**Mis à jour** : Novembre 2026 (ajout scripts migration)  
**Par** : Kiro (Assistant IA)  
**Status** : ✅ Scripts de migration prêts  
**Prochaine étape** : Exécuter `migrate-to-wsl2.ps1` puis `demarrer-tout-projet-wsl2.bat`
