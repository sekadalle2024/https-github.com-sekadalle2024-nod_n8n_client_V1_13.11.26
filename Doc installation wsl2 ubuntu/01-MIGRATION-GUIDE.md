# Guide de Migration: Docker Desktop → WSL2 Docker

**Date** : Novembre 2026  
**Objectif** : Migrer le projet Nod n8n de Docker Desktop vers Docker Engine dans WSL2  
**Gain attendu** : ~50% réduction RAM (2-3 GB vs 4-6 GB)  
**Durée** : 30-45 minutes

---

## 📋 Table des Matières

1. [Pourquoi migrer?](#pourquoi-migrer)
2. [Prérequis](#prérequis)
3. [Comparaison: Docker Desktop vs WSL2 Docker](#comparaison-docker-desktop-vs-wsl2-docker)
4. [Migration Pas-à-Pas](#migration-pas-à-pas)
5. [Vérification Post-Migration](#vérification-post-migration)
6. [Utilisation Quotidienne](#utilisation-quotidienne)
7. [Dépannage](#dépannage)
8. [Retour Arrière (Rollback)](#retour-arrière-rollback)

---

## 🎯 Pourquoi migrer?

### Problèmes avec Docker Desktop

- **RAM excessive** : 4-6 GB en utilisation active
- **Overhead GUI** : Interface graphique inutilisée
- **Licence Pro** : Payante pour certains usages commerciaux
- **Performance** : Couche supplémentaire entre Windows et containers

### Avantages Docker dans WSL2

✅ **Moins de RAM** : 2-3 GB en utilisation active (-50%)  
✅ **Plus rapide** : Accès direct au kernel Linux  
✅ **Gratuit** : Pas de licence requise  
✅ **Plus léger** : CLI uniquement, pas de GUI  
✅ **Plus flexible** : Shell Linux natif pour développement

---

## ✅ Prérequis

### Vérification Checklist

Avant de commencer, vérifiez que vous avez:

- [ ] **Windows 10 version 2004+** ou **Windows 11**
- [ ] **WSL2 installé** (vérifier: `wsl --version`)
- [ ] **Ubuntu-22.04 installé** dans WSL2
- [ ] **Docker Desktop actuellement fonctionnel** (pour backup)
- [ ] **Projet Nod accessible** : `h:\nod_n8n`
- [ ] **Fichiers présents** : `compose.yaml`, `.env`
- [ ] **Au moins 20 GB d'espace disque libre**
- [ ] **Droits administrateur** Windows

### Installation Ubuntu-22.04 (si nécessaire)

Si Ubuntu-22.04 n'est pas encore installé:

```powershell
# Dans PowerShell Admin
wsl --install -d Ubuntu-22.04

# Première configuration (username/password)
wsl -d Ubuntu-22.04
```

**Note** : Le script de migration vérifie automatiquement ces prérequis.

---

## 📊 Comparaison: Docker Desktop vs WSL2 Docker

### Consommation Ressources

| Métrique          | Docker Desktop | WSL2 Docker | Économie |
| ----------------- | -------------- | ----------- | -------- |
| **RAM Idle**      | ~2 GB          | ~500 MB     | **75%**  |
| **RAM avec Nod**  | 4-6 GB         | 2-3 GB      | **50%**  |
| **CPU Idle**      | 2-5%           | <1%         | **60%**  |
| **Espace Disque** | ~6 GB          | ~3 GB       | **50%**  |

### Performance

| Opération           | Docker Desktop | WSL2 Docker        | Gain   |
| ------------------- | -------------- | ------------------ | ------ |
| `docker ps`         | ~100ms         | ~50ms              | **2x** |
| `docker compose up` | Normal         | Similaire          | -      |
| `docker build`      | Normal         | 10-20% plus rapide | +15%   |
| Démarrage daemon    | ~10s           | ~2s                | **5x** |

### Fonctionnalités

| Fonctionnalité | Docker Desktop  | WSL2 Docker                         |
| -------------- | --------------- | ----------------------------------- |
| GUI Dashboard  | ✅ Oui          | ❌ Non (CLI uniquement)             |
| Docker Compose | ✅ Oui          | ✅ Oui                              |
| Kubernetes     | ✅ Intégré      | ⚠️ Manuel (non nécessaire pour Nod) |
| Auto-start     | ✅ Oui          | ✅ Oui (avec systemd)               |
| Updates        | ✅ Automatiques | ⚠️ Manuelles (`apt`)                |
| Support        | ✅ Commercial   | ⚠️ Communauté                       |

### Verdict

**Pour Nod n8n** : WSL2 Docker est **recommandé**

- Économie RAM significative
- Performance égale ou meilleure
- Pas de fonctionnalité GUI nécessaire
- Contrôle total sur l'environnement

---

## 🚀 Migration Pas-à-Pas

### Étape 1 : Préparation

#### 1.1 Vérifier l'état actuel

```powershell
# Dans PowerShell
cd h:\nod_n8n

# Vérifier Docker Desktop
docker ps
docker compose ps

# Vérifier les containers Nod
docker ps --filter "name=nod"
```

**Résultat attendu** : 4 containers nod en cours (postgres, workspace, browser, workspace-network)

#### 1.2 Backup PostgreSQL (IMPORTANT)

```powershell
# Créer un backup complet
docker exec nod-local-postgres-1 pg_dumpall -U nod > backup-nod-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql

# Vérifier le backup
Get-Item backup-nod-*.sql | Select-Object Name, Length
```

**Résultat attendu** : Fichier SQL de plusieurs MB

⚠️ **CRITIQUE** : Ne passez pas à l'étape suivante sans backup réussi !

#### 1.3 Arrêter Docker Desktop

```powershell
# Arrêter tous les containers
docker compose down

# Fermer Docker Desktop
Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue
```

**Attendre 10 secondes** pour fermeture complète.

---

### Étape 2 : Migration Automatique

#### 2.1 Lancer le script de migration

```powershell
# Dans PowerShell Admin (depuis h:\nod_n8n)
cd h:\nod_n8n

# Exécuter le script de migration
powershell -ExecutionPolicy Bypass -File ".\Doc installation wsl2 ubuntu\migrate-to-wsl2.ps1"
```

#### 2.2 Suivre la progression

Le script effectue automatiquement:

1. ✅ Vérification WSL2 et Ubuntu-22.04
2. ✅ Vérification Docker Desktop (demande arrêt si actif)
3. ✅ Backup PostgreSQL (optionnel avec `-SkipBackup`)
4. ✅ Mise à jour Ubuntu (`apt update/upgrade`)
5. ✅ Installation Docker Engine
6. ✅ Configuration auto-start (systemd)
7. ✅ Copie fichiers projet vers WSL2
8. ✅ Tests Docker (hello-world)

**Durée** : 15-20 minutes (dépend de la connexion internet)

#### 2.3 Sorties attendues

**Succès** :

```
========================================
MIGRATION TERMINEE AVEC SUCCES!
========================================

PROCHAINES ETAPES:
1. REDEMARRER WSL2 (pour activer systemd)
2. VERIFIER DOCKER
3. DEMARRER LES CONTAINERS NOD
...
```

**En cas d'erreur** : Consultez la section [Dépannage](#dépannage)

---

### Étape 3 : Redémarrage WSL2

#### 3.1 Redémarrer WSL2 (activer systemd)

```powershell
# Arrêter toutes les instances WSL2
wsl --shutdown

# Attendre 5 secondes
Start-Sleep -Seconds 5

# Relancer Ubuntu
wsl -d Ubuntu-22.04
```

#### 3.2 Vérifier Docker dans WSL2

```bash
# Dans WSL2 Ubuntu
docker --version
# Docker version 28.5.1, build ...

docker ps
# CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```

✅ **Succès** : Docker fonctionne sans `sudo`

---

### Étape 4 : Démarrer les Containers Nod

#### 4.1 Méthode 1 : Script Windows (Recommandé)

```powershell
# Dans PowerShell (depuis h:\nod_n8n)
.\Doc demarrer container & serveur\demarrer-tout-projet-wsl2.bat
```

Ce script fait tout automatiquement:

- Démarre WSL2
- Démarre Docker
- Lance les 4 containers
- Attend PostgreSQL ready (jusqu'à 120s)
- Démarre le serveur Node.js

#### 4.2 Méthode 2 : Manuelle depuis WSL2

```bash
# Dans WSL2 Ubuntu
cd /mnt/h/nod_n8n

# Lancer les containers
docker compose up -d

# Vérifier les containers
docker ps

# Attendre PostgreSQL (peut prendre 90-95s avec fsync)
docker exec nod-local-postgres-1 pg_isready -U nod

# Logs en direct
docker compose logs -f
```

#### 4.3 Démarrer le serveur Node.js (Méthode manuelle)

```powershell
# Dans PowerShell (depuis Windows)
cd h:\nod_n8n

# Démarrer le serveur
pnpm exec tsx src/server/index.ts
```

**URL d'accès** :  
http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU

---

## ✅ Vérification Post-Migration

### Test 1 : Containers en cours

```bash
# Dans WSL2
docker ps --format "table {{.Names}}\t{{.Status}}"
```

**Attendu** : 4 containers avec statut `Up` ou `Up (healthy)`

```
NAMES                           STATUS
nod-local-postgres-1            Up (healthy)
nod-workspace                   Up
nod-browser                     Up (healthy)
nod-local-workspace-network-1   Up (healthy)
```

### Test 2 : PostgreSQL connectivité

```bash
# Test de connexion
docker exec nod-local-postgres-1 psql -U nod -d nod -c "SELECT version();"

# Vérifier tables
docker exec nod-local-postgres-1 psql -U nod -d nod -c "\dt"
```

**Attendu** : Liste des tables Nod

### Test 3 : Accès depuis Windows

```powershell
# Depuis Windows, tester connexion PostgreSQL
Test-NetConnection -ComputerName localhost -Port 54329
```

**Attendu** : `TcpTestSucceeded : True`

### Test 4 : Serveur Nod accessible

**Ouvrir navigateur** :  
http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU

**Attendu** : Interface Nod charge correctement

### Test 5 : Consommation RAM

```powershell
# Voir utilisation RAM WSL2
wsl -d Ubuntu-22.04 --exec free -h

# Voir RAM totale Windows
Get-Process | Where-Object {$_.ProcessName -like "*wsl*"} | Select-Object ProcessName, WS
```

**Attendu** : WSL2 utilise 2-3 GB (vs 4-6 GB avec Docker Desktop)

---

## 💼 Utilisation Quotidienne

### Démarrage Rapide

#### Option A : Script Automatique (Recommandé)

```powershell
# Un seul script démarre tout
.\Doc demarrer container & serveur\demarrer-tout-projet-wsl2.bat
```

#### Option B : Commandes Manuelles

```powershell
# 1. Démarrer WSL2 (si arrêté)
wsl -d Ubuntu-22.04

# 2. Démarrer Docker dans WSL2
wsl -d Ubuntu-22.04 sudo service docker start

# 3. Démarrer containers
wsl -d Ubuntu-22.04 bash -c "cd /mnt/h/nod_n8n && docker compose up -d"

# 4. Démarrer serveur Node.js (dans autre terminal)
cd h:\nod_n8n
pnpm exec tsx src/server/index.ts
```

### Arrêt Complet

```powershell
# 1. Arrêter serveur Node.js (Ctrl+C dans son terminal)

# 2. Arrêter containers
wsl -d Ubuntu-22.04 bash -c "cd /mnt/h/nod_n8n && docker compose down"

# 3. (Optionnel) Arrêter WSL2 complètement
wsl --shutdown
```

### Commandes Docker Utiles depuis Windows

```powershell
# Voir containers en cours
wsl -d Ubuntu-22.04 docker ps

# Logs en temps réel
wsl -d Ubuntu-22.04 bash -c "cd /mnt/h/nod_n8n && docker compose logs -f"

# Redémarrer un container
wsl -d Ubuntu-22.04 docker restart nod-local-postgres-1

# Nettoyer images/volumes inutilisés
wsl -d Ubuntu-22.04 docker system prune -a --volumes
```

### Accès Shell WSL2

```powershell
# Entrer dans WSL2 Ubuntu
wsl -d Ubuntu-22.04

# Naviguer vers projet
cd /mnt/h/nod_n8n

# Ou vers copie WSL2
cd ~/nod
```

---

## 🐛 Dépannage

### Problème 1 : Docker ne démarre pas dans WSL2

**Symptômes** :

```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solutions** :

```bash
# Dans WSL2
# 1. Vérifier status Docker
sudo service docker status

# 2. Démarrer manuellement
sudo service docker start

# 3. Voir logs d'erreur
sudo journalctl -u docker -n 50

# 4. Si échec persistant, réinstaller
sudo apt-get purge -y docker-ce docker-ce-cli containerd.io
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

**Cause commune** : systemd pas activé → vérifier `/etc/wsl.conf`

---

### Problème 2 : Permission denied lors de `docker ps`

**Symptômes** :

```
permission denied while trying to connect to the Docker daemon socket
```

**Solutions** :

```bash
# Dans WSL2
# 1. Ajouter user au groupe docker
sudo usermod -aG docker $USER

# 2. Recharger groupes (déconnexion/reconnexion)
exit
wsl -d Ubuntu-22.04

# 3. Vérifier groupes
groups
# Doit inclure "docker"

# 4. Test
docker ps
```

---

### Problème 3 : Containers ne démarrent pas

**Symptômes** :

```
Error response from daemon: driver failed programming external connectivity
```

**Solutions** :

```bash
# 1. Vérifier ports disponibles (depuis Windows)
netstat -ano | findstr "54329"
# Si occupé, arrêter le processus ou changer le port

# 2. Vérifier compose.yaml accessible
wsl -d Ubuntu-22.04 ls -la /mnt/h/nod_n8n/compose.yaml

# 3. Vérifier .env présent
wsl -d Ubuntu-22.04 ls -la /mnt/h/nod_n8n/.env

# 4. Relancer avec logs
wsl -d Ubuntu-22.04 bash -c "cd /mnt/h/nod_n8n && docker compose up"
# (sans -d pour voir erreurs en direct)
```

---

### Problème 4 : PostgreSQL ne devient jamais "ready"

**Symptômes** :

```
Attente PostgreSQL... (120/120s)
[ERREUR] PostgreSQL ne repond pas apres 120 secondes
```

**Solutions** :

```bash
# Dans WSL2
# 1. Voir logs PostgreSQL
docker logs nod-local-postgres-1 --tail=100

# 2. Vérifier si processus tourne
docker exec nod-local-postgres-1 ps aux

# 3. Tester connexion manuelle
docker exec -it nod-local-postgres-1 psql -U nod -d nod

# 4. Si corrupted, recréer volume
docker compose down -v
docker compose up -d
# ⚠️ Cela SUPPRIME les données, restaurer backup après
```

**Cause commune** : fsync prend 90-95s au premier démarrage → c'est normal, attendre.

---

### Problème 5 : Serveur Node.js ne se connecte pas à PostgreSQL

**Symptômes** :

```
Error: connect ECONNREFUSED 127.0.0.1:54329
```

**Solutions** :

```powershell
# Depuis Windows
# 1. Vérifier port mapping
wsl -d Ubuntu-22.04 docker port nod-local-postgres-1
# Doit montrer: 5432/tcp -> 127.0.0.1:54329

# 2. Tester connexion depuis Windows
Test-NetConnection -ComputerName localhost -Port 54329

# 3. Vérifier DATABASE_URL dans .env
Get-Content h:\nod_n8n\.env | Select-String "DATABASE_URL"
# Doit être: postgresql://nod:password@localhost:54329/nod

# 4. Restart containers
wsl -d Ubuntu-22.04 bash -c "cd /mnt/h/nod_n8n && docker compose restart"
```

---

### Problème 6 : WSL2 utilise trop de RAM

**Symptômes** :
WSL2 utilise >8 GB de RAM

**Solutions** :

Créer/éditer `C:\Users\LEADER\.wslconfig` :

```ini
[wsl2]
# Limiter RAM à 4 GB
memory=4GB

# Limiter CPU à 4 cores
processors=4

# Limiter swap
swap=2GB
```

Appliquer :

```powershell
wsl --shutdown
wsl -d Ubuntu-22.04
```

---

### Problème 7 : Réseau lent dans WSL2

**Symptômes** :
`docker pull` très lent, timeouts

**Solutions** :

```bash
# Dans WSL2
# 1. Configurer DNS Google
sudo nano /etc/resolv.conf
# Remplacer contenu par:
nameserver 8.8.8.8
nameserver 8.8.4.4

# 2. Désactiver auto-generation resolv.conf
sudo nano /etc/wsl.conf
# Ajouter:
[network]
generateResolvConf = false

# 3. Redémarrer WSL2
exit
wsl --shutdown
wsl -d Ubuntu-22.04
```

---

### Problème 8 : Espace disque plein dans WSL2

**Symptômes** :

```
No space left on device
```

**Solutions** :

```bash
# Dans WSL2
# 1. Voir utilisation disque
df -h

# 2. Nettoyer Docker
docker system prune -a --volumes -f

# 3. Nettoyer apt
sudo apt-get clean
sudo apt-get autoclean
sudo apt-get autoremove -y
```

**Depuis Windows** :

```powershell
# Compacter le disque virtuel WSL2
wsl --shutdown

# Trouver le .vhdx
$vhdxPath = "$env:LOCALAPPDATA\Packages\CanonicalGroupLimited.Ubuntu22.04LTS_*\LocalState\ext4.vhdx"
$vhdx = Get-Item $vhdxPath

# Compacter (peut prendre 10+ minutes)
Optimize-VHD -Path $vhdx.FullName -Mode Full
```

---

## 🔄 Retour Arrière (Rollback)

Si WSL2 Docker ne fonctionne pas, vous pouvez revenir à Docker Desktop.

### Étape 1 : Arrêter WSL2 Docker

```powershell
# Arrêter containers dans WSL2
wsl -d Ubuntu-22.04 bash -c "cd /mnt/h/nod_n8n && docker compose down"

# Arrêter WSL2
wsl --shutdown
```

### Étape 2 : Redémarrer Docker Desktop

```powershell
# Lancer Docker Desktop (GUI)
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Attendre que Docker soit ready (icône verte)
Start-Sleep -Seconds 30
```

### Étape 3 : Restaurer Containers avec Docker Desktop

```powershell
cd h:\nod_n8n

# Lancer containers
docker compose up -d

# Attendre PostgreSQL
$count = 0
while ($count -lt 120) {
    docker exec nod-local-postgres-1 pg_isready -U nod 2>$null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 1
    $count++
}

Write-Host "PostgreSQL ready"
```

### Étape 4 : (Optionnel) Restaurer Backup

Si données perdues :

```powershell
# Trouver le backup
Get-ChildItem h:\nod_n8n\backup-nod-*.sql | Sort-Object LastWriteTime -Descending | Select-Object -First 1

# Restaurer
$backup = "h:\nod_n8n\backup-nod-YYYYMMDD-HHMMSS.sql"
Get-Content $backup | docker exec -i nod-local-postgres-1 psql -U nod -d nod
```

### Étape 5 : Utiliser l'ancien script

```powershell
# Retour au script Docker Desktop
.\Doc demarrer container & serveur\demarrer-tout-projet.bat
```

---

## 📈 Optimisations Avancées

### 1. Auto-start Containers au Boot Windows

Créer un script de démarrage :

**Fichier** : `C:\Users\LEADER\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\start-nod-wsl2.bat`

```batch
@echo off
REM Démarrer WSL2 et containers Nod en arrière-plan
start /min wsl -d Ubuntu-22.04 -- bash -c "sudo service docker start && cd /mnt/h/nod_n8n && docker compose up -d"
```

### 2. Alias PowerShell pour Commandes Rapides

Ajouter dans `$PROFILE` (PowerShell) :

```powershell
# Éditer profil
notepad $PROFILE

# Ajouter ces fonctions:
function nod-start {
    wsl -d Ubuntu-22.04 bash -c "cd /mnt/h/nod_n8n && docker compose up -d"
}

function nod-stop {
    wsl -d Ubuntu-22.04 bash -c "cd /mnt/h/nod_n8n && docker compose down"
}

function nod-logs {
    wsl -d Ubuntu-22.04 bash -c "cd /mnt/h/nod_n8n && docker compose logs -f"
}

function nod-ps {
    wsl -d Ubuntu-22.04 docker ps --filter name=nod
}
```

**Usage** :

```powershell
nod-start   # Démarrer containers
nod-stop    # Arrêter containers
nod-logs    # Voir logs
nod-ps      # Lister containers nod
```

### 3. Monitoring RAM/CPU

Script PowerShell pour monitorer :

```powershell
# Créer: h:\nod_n8n\monitor-wsl2.ps1
while ($true) {
    Clear-Host
    Write-Host "=== WSL2 RESOURCE USAGE ===" -ForegroundColor Cyan
    Write-Host ""

    # RAM
    $wslProc = Get-Process | Where-Object {$_.ProcessName -like "*wsl*"} | Measure-Object -Property WS -Sum
    $ramMB = [math]::Round($wslProc.Sum / 1MB, 2)
    Write-Host "WSL2 RAM: $ramMB MB" -ForegroundColor Green

    # Containers
    Write-Host ""
    wsl -d Ubuntu-22.04 docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

    Start-Sleep -Seconds 5
}
```

**Usage** :

```powershell
.\monitor-wsl2.ps1
```

---

## 📚 Ressources Supplémentaires

### Documentation Officielle

- **WSL2** : https://learn.microsoft.com/en-us/windows/wsl/
- **Docker Ubuntu** : https://docs.docker.com/engine/install/ubuntu/
- **Docker Compose** : https://docs.docker.com/compose/

### Fichiers du Projet

- **Script Migration** : `.\Doc installation wsl2 ubuntu\migrate-to-wsl2.ps1`
- **Script Démarrage WSL2** : `.\Doc demarrer container & serveur\demarrer-tout-projet-wsl2.bat`
- **Guide Installation WSL2** : `.\Doc installation wsl2 ubuntu\00-README-INSTALLATION-WSL2.md`

### Communauté et Support

- **WSL GitHub** : https://github.com/microsoft/WSL/issues
- **Docker Forums** : https://forums.docker.com/
- **Nod n8n** : Voir documentation projet

---

## ✅ Checklist Finale

### Migration Réussie Quand:

- [ ] WSL2 Ubuntu-22.04 opérationnel
- [ ] Docker Engine installé dans WSL2
- [ ] 4 containers Nod démarrent sans erreur
- [ ] PostgreSQL devient "ready" en <120s
- [ ] Serveur Node.js se connecte à PostgreSQL
- [ ] Interface Nod accessible sur http://localhost:4310
- [ ] RAM totale réduite de ~50% vs Docker Desktop
- [ ] Script `demarrer-tout-projet-wsl2.bat` fonctionne
- [ ] Tests backend passent (8/8)

### Post-Migration

- [ ] Utilisation quotidienne testée pendant 48h
- [ ] Performance validée (pas de ralentissement)
- [ ] Backup PostgreSQL réguliers configurés
- [ ] Docker Desktop désinstallé (optionnel)
- [ ] Documentation projet mise à jour

---

## 🎉 Conclusion

Vous avez maintenant migré avec succès vers WSL2 Docker !

**Bénéfices** :

- ✅ ~50% RAM économisée (2-3 GB vs 4-6 GB)
- ✅ Performance égale ou meilleure
- ✅ Contrôle total sur environnement Docker
- ✅ Pas de licence commerciale requise

**Prochaines étapes** :

1. Utilisez le projet normalement pendant quelques jours
2. Surveillez RAM/performance
3. Si tout fonctionne, désinstallez Docker Desktop
4. Profitez de la RAM libérée pour d'autres applications!

**Besoin d'aide ?** Consultez la section [Dépannage](#dépannage) ou ouvrez une issue.

---

**Créé** : Novembre 2026  
**Par** : Kiro AI Assistant  
**Version** : 1.0  
**Licence** : MIT
