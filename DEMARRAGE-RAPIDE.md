# 🚀 Démarrage Rapide - Système Persistance Tables Nod

## Problème : ECONNREFUSED 127.0.0.1:54329

**Cause** : PostgreSQL n'est pas démarré car Docker Desktop n'est pas lancé.

---

## ✅ Solution en 3 étapes

### Étape 1 : Démarrer Docker Desktop

1. **Ouvrez Docker Desktop** depuis le menu Démarrer Windows
2. **Attendez** que l'icône Docker dans la barre des tâches devienne verte
3. **Vérifiez** que Docker est prêt :
   ```powershell
   docker ps
   ```
   Si ça affiche une liste (même vide), Docker est prêt ✅

---

### Étape 2 : Démarrer les containers Nod

```powershell
cd h:\nod_n8n
docker compose up -d
```

**Attendu** :

```
[+] Running 4/4
 ✔ Container nod-local-postgres-1        Started
 ✔ Container nod-workspace              Started
 ✔ Container nod-browser                Started
 ✔ Container nod-workspace-network-1    Started
```

**Vérification** :

```powershell
docker ps
```

Vous devriez voir 4 containers avec status "Up" :

- nod-local-postgres-1 (healthy)
- nod-workspace
- nod-browser
- nod-workspace-network-1

---

### Étape 3 : Démarrer le serveur Nod

```powershell
cd h:\nod_n8n
pnpm exec tsx src/server/index.ts
```

**Attendu après ~30 secondes** :

```
Nod is ready at http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU
```

✅ **Le serveur est prêt !**

---

## 🧪 Tester le menu contextuel

### 1. Ouvrir l'application

```
http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU
```

### 2. Créer un fichier CSV de test

Créez `test.csv` :

```csv
nom,age,ville,actif
Alice,25,Paris,true
Bob,30,Lyon,false
Charlie,28,Marseille,true
```

### 3. Tester dans Nod

1. **Uploadez** `test.csv` dans le chat
2. La table s'affiche automatiquement
3. **Clic droit** sur la table
4. Menu contextuel apparaît avec "Save to Audit Table"
5. **Cliquez** "Save to Audit Table"
6. Dialog de configuration s'ouvre
7. **Configurez** :
   - Nom : "Utilisateurs" (ou autre)
   - Headers : Coché ✅
   - Colonnes : types auto-détectés
8. **Cliquez** "Save Table"
9. ✅ Message de succès !

### 4. Vérifier la persistance

```powershell
docker exec nod-local-postgres-1 psql -U nod -d nod -c "SELECT id, display_name, owner_id FROM audit_table_schemas;"
```

Vous devriez voir votre table "Utilisateurs" !

---

## 🐛 Dépannage

### Erreur : "Docker Desktop n'est pas démarré"

**Solution** : Lancez Docker Desktop et attendez qu'il soit prêt (icône verte).

---

### Erreur : "Port 54329 déjà utilisé"

```powershell
# Voir qui utilise le port
netstat -ano | findstr ":54329"

# Arrêter le processus
taskkill /PID <PID> /F

# Ou redémarrer les containers
docker compose down
docker compose up -d
```

---

### Erreur : "Cannot find module 'pg'"

```powershell
# Réinstaller les dépendances
cd h:\nod_n8n
pnpm install
```

---

### Serveur trop lent à démarrer

**Normal** : Le premier démarrage peut prendre 1-2 minutes.

**Surveillance** :

- Logs du serveur affichent la progression
- Attendez "Nod is ready at..."

---

## 📋 Checklist de démarrage

Avant de démarrer Nod, vérifiez :

- [ ] Docker Desktop lancé (icône verte dans barre des tâches)
- [ ] `docker ps` fonctionne
- [ ] `docker compose up -d` réussi
- [ ] 4 containers "Up"
- [ ] nod-local-postgres-1 "healthy"
- [ ] Port 4310 libre (`netstat -ano | findstr ":4310"` vide)
- [ ] Navigateur prêt

✅ Tout est OK ? Lancez `pnpm exec tsx src/server/index.ts` !

---

## 🚀 Script automatique (optionnel)

Créez `start-nod-complet.bat` :

```batch
@echo off
echo ========================================
echo   DEMARRAGE COMPLET NOD
echo ========================================
echo.
echo [1/3] Verification Docker...
docker ps >nul 2>&1
if errorlevel 1 (
    echo ERREUR: Docker Desktop n est pas demarre
    echo Lancez Docker Desktop et reessayez
    pause
    exit /b 1
)
echo OK - Docker actif
echo.
echo [2/3] Demarrage containers...
cd /d h:\nod_n8n
docker compose up -d
if errorlevel 1 (
    echo ERREUR: Echec demarrage containers
    pause
    exit /b 1
)
echo OK - Containers demarres
echo.
echo [3/3] Demarrage serveur Nod...
echo Attendez environ 30 secondes...
echo.
start "Serveur Nod" cmd /k "cd /d h:\nod_n8n && pnpm exec tsx src/server/index.ts"
echo.
echo ========================================
echo   SERVEUR EN COURS DE DEMARRAGE
echo ========================================
echo.
echo Une nouvelle fenetre s est ouverte
echo Attendez le message "Nod is ready at..."
echo Puis ouvrez : http://localhost:4310/#access=...
echo.
pause
```

**Utilisation** : Double-clic sur `start-nod-complet.bat` → tout démarre automatiquement !

---

## 💡 Commandes utiles

```powershell
# Voir l'état des containers
docker ps

# Voir les logs PostgreSQL
docker logs nod-local-postgres-1

# Redémarrer PostgreSQL uniquement
docker restart nod-local-postgres-1

# Arrêter tout
docker compose down

# Démarrer tout
docker compose up -d

# Nettoyer les tables de test
docker exec nod-local-postgres-1 psql -U nod -d nod -c "DELETE FROM audit_table_schemas WHERE owner_id='test_user_001';"
```

---

**Document créé le 13 novembre 2026**  
**Pour démarrer rapidement le système de persistance des tables Nod** 🚀
