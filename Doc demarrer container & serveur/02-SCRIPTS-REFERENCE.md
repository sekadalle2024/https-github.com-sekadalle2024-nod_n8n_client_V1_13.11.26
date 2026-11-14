# Scripts de Démarrage - Référence Complète

## Vue d'Ensemble

Ce dossier contient tous les scripts nécessaires pour démarrer et gérer le système Nod avec persistance PostgreSQL.

---

## Scripts Disponibles

### 🌟 Script TOUT-EN-UN (Recommandé)

#### `demarrer-tout-projet.bat`

**Objectif** : Démarrer AUTOMATIQUEMENT les containers Docker ET le serveur Node.js en une seule commande

**Code complet** :

```batch
# Voir le fichier demarrer-tout-projet.bat pour le code complet
# Ce script fait tout automatiquement :
# 1. Vérifie Docker Desktop
# 2. Démarre les containers
# 3. Attend que PostgreSQL soit prêt (max 30s)
# 4. Démarre le serveur Node.js
```

**Usage** :

```powershell
cd "h:\nod_n8n\Doc demarrer container & serveur"
.\demarrer-tout-projet.bat
```

**Ce que fait ce script** :

1. Vérifie que Docker Desktop est lancé
2. Démarre les 4 containers Docker avec `docker compose up -d`
3. Attend 15 secondes pour stabilisation
4. Vérifie que PostgreSQL répond (boucle max 30s)
5. Vérifie que le fichier `.env` existe
6. Démarre le serveur Node.js avec `pnpm exec tsx src/server/index.ts`
7. Affiche l'URL d'accès avec le token

**Temps d'exécution** : ~1-2 minutes (selon la vitesse de démarrage Docker)

**Avantages** :

- ✅ Une seule commande pour tout
- ✅ Attente automatique de PostgreSQL (pas de course de condition)
- ✅ Messages de progression clairs
- ✅ Gestion d'erreurs robuste
- ✅ Le serveur tourne dans la même fenêtre (logs visibles)

**Note importante** :

- Ce script **ne ferme pas** : le serveur Node.js tourne dedans
- Pour arrêter : **Ctrl+C** dans la fenêtre du script
- Pour arrêter tout : utiliser `arreter-tout.bat`

---

### 📦 Scripts Séparés (Contrôle Granulaire)

### 1. `demarrer-tout.bat`

**Objectif** : Démarrer tous les containers Docker nécessaires

```batch
@echo off
echo ========================================
echo Demarrage des containers Docker...
echo ========================================

cd /d h:\nod_n8n

echo.
echo 1. Verification de Docker Desktop...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERREUR: Docker Desktop n'est pas demarre
    echo Veuillez lancer Docker Desktop manuellement
    pause
    exit /b 1
)

echo Docker Desktop OK
echo.
echo 2. Demarrage des containers...
docker compose up -d

echo.
echo 3. Attente du demarrage...
timeout /t 10 /nobreak

echo.
echo 4. Verification de l'etat...
docker ps

echo.
echo ========================================
echo Containers demarres avec succes!
echo ========================================
echo.
echo Vous pouvez maintenant lancer demarrer-serveur.bat
pause
```

**Usage** :

```powershell
cd "h:\nod_n8n\Doc demarrer container & serveur"
.\demarrer-tout.bat
```

**Ce que fait ce script** :

1. Vérifie que Docker Desktop est lancé
2. Démarre les 4 containers nécessaires :
   - `nod-local-postgres-1` (PostgreSQL sur port 54329)
   - `nod-workspace` (environnement d'exécution)
   - `nod-browser` (navigateur pour automation)
   - `nod-local-workspace-network-1` (réseau)
3. Attend 10 secondes pour la stabilisation
4. Affiche l'état final des containers

**Temps d'exécution** : ~15-30 secondes

---

### 2. `demarrer-serveur.bat`

**Objectif** : Démarrer le serveur Node.js Nod

```batch
@echo off
echo ========================================
echo Demarrage du serveur Nod...
echo ========================================

cd /d h:\nod_n8n

echo.
echo 1. Verification des containers Docker...
docker ps | findstr "nod-local-postgres-1" >nul
if errorlevel 1 (
    echo ERREUR: Le container PostgreSQL n'est pas demarre
    echo Veuillez lancer demarrer-tout.bat d'abord
    pause
    exit /b 1
)

echo Containers OK
echo.
echo 2. Verification du fichier .env...
if not exist .env (
    echo ERREUR: Fichier .env introuvable
    pause
    exit /b 1
)

echo Fichier .env OK
echo.
echo 3. Demarrage du serveur...
echo URL d'acces: http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.

pnpm exec tsx src/server/index.ts
```

**Usage** :

```powershell
cd "h:\nod_n8n\Doc demarrer container & serveur"
.\demarrer-serveur.bat
```

**Ce que fait ce script** :

1. Vérifie que PostgreSQL tourne
2. Vérifie que `.env` existe
3. Lance le serveur Node.js avec tsx
4. Affiche l'URL d'accès avec token d'authentification

**Temps de démarrage** : ~30-60 secondes  
**Port utilisé** : 4310  
**URL complète** : `http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU`

---

### 3. `verifier-etat.bat`

**Objectif** : Vérifier l'état de tous les services

```batch
@echo off
echo ========================================
echo Verification de l'etat des services...
echo ========================================

echo.
echo 1. Docker Desktop
docker --version
if errorlevel 1 (
    echo [X] Docker Desktop NOT RUNNING
) else (
    echo [OK] Docker Desktop RUNNING
)

echo.
echo 2. Containers Docker
docker ps
echo.
echo Containers attendus:
echo - nod-local-postgres-1 (PostgreSQL)
echo - nod-workspace
echo - nod-browser
echo - nod-local-workspace-network-1

echo.
echo 3. PostgreSQL
docker exec nod-local-postgres-1 pg_isready -U nod
if errorlevel 1 (
    echo [X] PostgreSQL NOT READY
) else (
    echo [OK] PostgreSQL READY
)

echo.
echo 4. Serveur Node.js
curl -s http://localhost:4310/api/audit/schemas >nul 2>&1
if errorlevel 1 (
    echo [X] Serveur Node.js NOT RESPONDING
) else (
    echo [OK] Serveur Node.js RESPONDING
)

echo.
echo ========================================
pause
```

**Usage** :

```powershell
cd "h:\nod_n8n\Doc demarrer container & serveur"
.\verifier-etat.bat
```

**Ce que fait ce script** :

1. Vérifie Docker Desktop
2. Liste les containers actifs
3. Teste la connexion PostgreSQL
4. Teste la réponse du serveur Node.js sur l'API audit

**Temps d'exécution** : ~5 secondes

---

## Ordre de Démarrage

### 🌟 Méthode Recommandée : Script TOUT-EN-UN

```
1. Lancer Docker Desktop manuellement
   └─> Attendre que l'icône Docker soit verte dans la barre des tâches

2. Exécuter demarrer-tout-projet.bat
   └─> Attend automatiquement PostgreSQL
   └─> Démarre automatiquement le serveur Node.js
   └─> Affiche l'URL d'accès

3. Ouvrir l'URL dans le navigateur
   └─> http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU
```

**Temps total** : ~1-2 minutes  
**Avantage** : Une seule commande, pas de risque d'erreur d'ordre

---

### 📦 Méthode Alternative : Scripts Séparés

```
1. Lancer Docker Desktop manuellement
   └─> Attendre que l'icône Docker soit verte dans la barre des tâches

2. Exécuter demarrer-tout.bat
   └─> Démarre les 4 containers Docker
   └─> Attend 10 secondes

3. Exécuter demarrer-serveur.bat
   └─> Lance le serveur Node.js sur port 4310
   └─> Affiche l'URL d'accès

4. Ouvrir l'URL dans le navigateur
   └─> http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU
```

**Temps total** : ~1-2 minutes  
**Avantage** : Contrôle granulaire de chaque étape

---

## Arrêt des Services

### Arrêt Propre

```powershell
# 1. Arrêter le serveur Node.js
# Dans le terminal où tourne demarrer-serveur.bat, appuyer sur Ctrl+C

# 2. Arrêter les containers Docker
docker compose down

# 3. (Optionnel) Arrêter Docker Desktop
# Clic droit sur l'icône Docker → Quit Docker Desktop
```

### Arrêt d'Urgence

```powershell
# Tuer tous les containers Docker
docker compose down --remove-orphans

# Tuer tous les processus Node.js
Get-Process -Name node | Stop-Process -Force
```

---

## Variables d'Environnement Critiques

### Fichier `.env` (racine du projet)

```env
# Base de données PostgreSQL
DATABASE_URL=postgresql://nod:<password>@127.0.0.1:54329/nod

# Clé de chiffrement Vault
NOD_VAULT_KEY=IF3u9anoTHVqyMj31i/BNWxdGS6/MWxMjOAPAu6zONo=

# API Google Gemini
GEMINI_API_KEY=AQ.Ab8RN6IEycTIxeVdlnx-h1a7g56ZK2uVRFvtKeLQq60kF5PidA
```

**⚠️ IMPORTANT** :

- Ne JAMAIS committer le fichier `.env` dans Git
- Ces valeurs sont générées lors de l'installation initiale
- `NOD_VAULT_KEY` chiffre les données sensibles (passwords, tokens)
- `DATABASE_URL` contient le mot de passe PostgreSQL

---

## Ports Utilisés

| Service             | Port Externe | Port Interne | Description                 |
| ------------------- | ------------ | ------------ | --------------------------- |
| **Serveur Node.js** | 4310         | 4310         | API principale + Frontend   |
| **PostgreSQL**      | 54329        | 5432         | Base de données persistante |
| **Workspace**       | -            | -            | Sandbox d'exécution         |
| **Browser**         | -            | -            | Navigateur automation       |

---

## Diagnostics Rapides

### Problème : Serveur ne démarre pas

```powershell
# Vérifier si un processus Node.js occupe déjà le port 4310
netstat -ano | findstr "4310"

# Si un processus existe, le tuer
taskkill /PID <PID> /F

# Relancer le serveur
.\demarrer-serveur.bat
```

### Problème : PostgreSQL ne répond pas

```powershell
# Vérifier l'état du container
docker ps | findstr postgres

# Voir les logs PostgreSQL
docker logs nod-local-postgres-1 --tail 50

# Redémarrer PostgreSQL
docker restart nod-local-postgres-1
```

### Problème : Docker Desktop ne démarre pas

```powershell
# Vérifier le statut du service Windows
Get-Service -Name "Docker Desktop Service"

# Redémarrer le service
Restart-Service -Name "Docker Desktop Service"

# Si ça ne fonctionne pas, redémarrer Windows
```

### Problème : Containers ne démarrent pas

```powershell
# Voir les logs de tous les containers
docker compose logs

# Supprimer et recréer les containers
docker compose down
docker compose up -d --force-recreate

# Nettoyer complètement Docker (⚠️ PERTE DE DONNÉES)
docker system prune -a --volumes
```

---

## Tests Post-Démarrage

### 1. Test de Connexion PostgreSQL

```powershell
docker exec -it nod-local-postgres-1 psql -U nod -d nod -c "SELECT version();"
```

**Résultat attendu** : Version de PostgreSQL 17.x

### 2. Test de l'API Audit Tables

```powershell
curl http://localhost:4310/api/audit/schemas
```

**Résultat attendu** : `{"schemas":[]}` (liste vide si aucune table sauvegardée)

### 3. Test de l'Application Web

Ouvrir dans le navigateur :

```
http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU
```

**Résultat attendu** : Interface Nod avec chat opérationnel

---

## Logs et Débogage

### Logs du Serveur Node.js

Directement dans le terminal où tourne `demarrer-serveur.bat`

Chercher les lignes importantes :

- `✓ Audit tables initialized` → Système de persistance OK
- `Server listening on http://localhost:4310` → Serveur prêt
- `Connected to database` → PostgreSQL connecté

### Logs Docker

```powershell
# Tous les containers
docker compose logs -f

# Un container spécifique
docker logs nod-local-postgres-1 -f

# Dernières 100 lignes
docker logs nod-local-postgres-1 --tail 100
```

### Logs PostgreSQL (requêtes SQL)

```powershell
docker exec -it nod-local-postgres-1 psql -U nod -d nod
```

Puis dans psql :

```sql
-- Voir les tables système
\dt

-- Voir les dernières tables créées
SELECT name, created_at FROM audit_table_schemas ORDER BY created_at DESC LIMIT 10;

-- Voir les erreurs PostgreSQL
SELECT * FROM pg_stat_activity WHERE state = 'idle in transaction';
```

---

## Maintenance

### Nettoyer les Données de Test

```powershell
# Vider toutes les tables audit (⚠️ PERTE DE DONNÉES)
docker exec -it nod-local-postgres-1 psql -U nod -d nod -c "
TRUNCATE TABLE
    audit_table_schemas,
    audit_table_data,
    audit_data_versions,
    audit_table_consolidations
RESTART IDENTITY CASCADE;
"
```

### Sauvegarder la Base de Données

```powershell
# Créer un dump PostgreSQL
docker exec nod-local-postgres-1 pg_dump -U nod -d nod > backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql

# Restaurer depuis un backup
Get-Content backup_20261112_143000.sql | docker exec -i nod-local-postgres-1 psql -U nod -d nod
```

### Mettre à Jour les Dependencies

```powershell
# Mettre à jour pnpm
pnpm install -g pnpm@latest

# Mettre à jour les packages du projet
cd h:\nod_n8n
pnpm update

# Rebuild après mise à jour
pnpm run build
```

---

## Checklist de Démarrage Complet

- [ ] Docker Desktop lancé (icône verte dans la barre des tâches)
- [ ] Containers démarrés avec `demarrer-tout.bat`
  - [ ] nod-local-postgres-1 (UP + healthy)
  - [ ] nod-workspace (UP)
  - [ ] nod-browser (UP + healthy)
  - [ ] nod-local-workspace-network-1 (UP + healthy)
- [ ] PostgreSQL répond : `docker exec nod-local-postgres-1 pg_isready -U nod`
- [ ] Fichier `.env` présent avec les 3 variables critiques
- [ ] Serveur Node.js démarré avec `demarrer-serveur.bat`
- [ ] API répond : `curl http://localhost:4310/api/audit/schemas`
- [ ] Application accessible : `http://localhost:4310/#access=...`

**Temps total** : ~2 minutes  
**État final** : Système opérationnel, prêt pour tests

---

## Support

Pour plus de détails :

- **Architecture complète** : `../Doc systeme de persistance/MEMO-PROGRESSIF-TACHE.md`
- **Guide de test** : `01-TEST-SYSTEME-PERSISTANCE.md`
- **Guide d'installation** : `../Doc installation nod n8n/08-GUIDE-INSTALLATION-COMPLETE-DOCKER.md`

---

**Date de création** : 2026-11-12  
**Version** : 1.0  
**Maintenance** : Scripts auto-documentés
