# 📚 Index de la Documentation Nod

## Vue d'ensemble

Cette documentation complète couvre l'installation, la configuration et le dépannage de Nod (n8n-io/nod) avec Docker sur Windows.

**Version :** 1.0  
**Date :** Novembre 2024  
**Système :** Windows 10/11 AMD64, Docker Desktop, WSL2

---

## 📖 Documents disponibles

### 🚀 Installation et démarrage

| Fichier                                                                                  | Description                                     | Audience                  | Durée lecture |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------- | ------------- |
| **[REINSTALLATION-RAPIDE.md](REINSTALLATION-RAPIDE.md)**                                 | Checklist condensée pour réinstaller rapidement | Utilisateurs expérimentés | 5 min         |
| **[08-GUIDE-INSTALLATION-COMPLETE-DOCKER.md](08-GUIDE-INSTALLATION-COMPLETE-DOCKER.md)** | Guide exhaustif d'installation avec Docker      | Tous niveaux              | 30 min        |

**Recommandation :**

- Première installation : Lire le guide complet
- Réinstallation : Utiliser la checklist rapide

---

### 🔧 Configuration

| Fichier                                                                    | Description                              | Prérequis             |
| -------------------------------------------------------------------------- | ---------------------------------------- | --------------------- |
| **[07-CONFIGURATION-GOOGLE-GEMINI.md](07-CONFIGURATION-GOOGLE-GEMINI.md)** | Configurer Google Gemini (API AI Studio) | Serveur Nod démarré   |
| **[06-WORKSPACE-EXPLIQUE.md](06-WORKSPACE-EXPLIQUE.md)**                   | Comprendre le système de workspace Nod   | Installation terminée |

---

### 🐛 Dépannage

| Fichier                                          | Description                                          | Quand l'utiliser |
| ------------------------------------------------ | ---------------------------------------------------- | ---------------- |
| **[PROBLEMES-RESOLUS.md](PROBLEMES-RESOLUS.md)** | Catalogue des 13 problèmes rencontrés avec solutions | En cas d'erreur  |

**Problèmes couverts :**

- ❌ CRLF dans scripts Shell Docker
- ❌ Keystore Composio non configuré
- ❌ Port 4310 occupé
- ❌ Table consolidations manquante
- ❌ Colonne user_id vs owner_id
- ❌ Docker build très lent
- ❌ Tests HTTP échouent (auth)
- ❌ Package pg timeout
- Et 5 problèmes mineurs

---

### 📊 Architecture et conception

| Fichier                                                                                                                        | Description                               | Public cible   |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | -------------- |
| **[../Doc systeme de persistance/README.md](../Doc%20systeme%20de%20persistance/README.md)**                                   | Architecture du système de persistance    | Développeurs   |
| **[../Doc workspace team/00-README-WORKSPACE-COLLABORATIF.md](../Doc%20workspace%20team/00-README-WORKSPACE-COLLABORATIF.md)** | Workspace collaboratif (comme NotebookLM) | Product owners |

---

## 🗺️ Parcours d'installation recommandés

### Parcours 1 : Installation complète (première fois)

```
1. [08-GUIDE-INSTALLATION-COMPLETE-DOCKER.md]
   ↓ Lire sections 1-4 (prérequis, installation outils)

2. Installer Docker, Node.js, pnpm
   ↓

3. [08-GUIDE-INSTALLATION-COMPLETE-DOCKER.md]
   ↓ Lire section 5 (configuration projet)

4. Cloner repo, installer dépendances
   ↓

5. [08-GUIDE-INSTALLATION-COMPLETE-DOCKER.md]
   ↓ Lire section 6 (lancement Docker)

6. Corriger CRLF, build Docker (2h30)
   ↓

7. [08-GUIDE-INSTALLATION-COMPLETE-DOCKER.md]
   ↓ Lire section 7 (configuration persistance)

8. Bypass keystore, démarrer serveur
   ↓

9. ✅ Vérifier avec test-persistence-direct.mjs

10. [07-CONFIGURATION-GOOGLE-GEMINI.md] (optionnel)
    ↓

11. ✅ Installation terminée
```

**Durée totale :** 3-4 heures

---

### Parcours 2 : Réinstallation rapide

```
1. [REINSTALLATION-RAPIDE.md]
   ↓ Suivre la checklist 10 étapes

2. [PROBLEMES-RESOLUS.md]
   ↓ Consulter si problème

3. ✅ Installation terminée en ~20 minutes
```

**Durée totale :** 20 minutes (si Docker images déjà en cache)

---

### Parcours 3 : Dépannage uniquement

```
1. Problème rencontré
   ↓

2. [PROBLEMES-RESOLUS.md]
   ↓ Chercher le symptôme

3. Appliquer la solution
   ↓

4. [08-GUIDE-INSTALLATION-COMPLETE-DOCKER.md]
   ↓ Section "Problèmes courants" si non trouvé

5. ✅ Problème résolu
```

---

## 📋 Checklist par situation

### Situation 1 : Première installation sur nouveau PC

- [ ] Lire `08-GUIDE-INSTALLATION-COMPLETE-DOCKER.md` sections 1-2
- [ ] Installer WSL2
- [ ] Installer Docker Desktop (WSL2 backend)
- [ ] Installer nvm-windows
- [ ] Installer Node.js 24.21.0
- [ ] Installer pnpm 10.34.5
- [ ] Lire `08-GUIDE-INSTALLATION-COMPLETE-DOCKER.md` sections 3-6
- [ ] Cloner le repo, configurer, build Docker
- [ ] Lire `08-GUIDE-INSTALLATION-COMPLETE-DOCKER.md` section 7
- [ ] Démarrer serveur, tester persistance
- [ ] (Optionnel) Lire `07-CONFIGURATION-GOOGLE-GEMINI.md`

---

### Situation 2 : Réinstallation après formatage

- [ ] Vérifier prérequis (Docker, Node.js déjà installés)
- [ ] Suivre `REINSTALLATION-RAPIDE.md` étapes 1-10
- [ ] Si problème : consulter `PROBLEMES-RESOLUS.md`

---

### Situation 3 : Installation sur PC d'un collègue

- [ ] Envoyer `REINSTALLATION-RAPIDE.md`
- [ ] Envoyer `PROBLEMES-RESOLUS.md` (référence)
- [ ] Partager le fichier `.env` (sécurisé, hors Git)
- [ ] Guider via les 10 étapes de la checklist rapide

---

### Situation 4 : Erreur pendant l'utilisation

- [ ] Noter le message d'erreur exact
- [ ] Consulter `PROBLEMES-RESOLUS.md` (chercher le symptôme)
- [ ] Si non trouvé : `08-GUIDE-INSTALLATION-COMPLETE-DOCKER.md` section 8
- [ ] Appliquer la solution
- [ ] Documenter si nouveau problème

---

## 🔍 Recherche rapide

### Par symptôme

| Symptôme                                       | Document             | Section     |
| ---------------------------------------------- | -------------------- | ----------- |
| `$'\r': command not found`                     | PROBLEMES-RESOLUS.md | Problème 1  |
| `EADDRINUSE: address already in use`           | PROBLEMES-RESOLUS.md | Problème 3  |
| `keystore before connecting apps`              | PROBLEMES-RESOLUS.md | Problème 2  |
| `duplicate key value violates`                 | PROBLEMES-RESOLUS.md | Problème 12 |
| `spawn pnpm ENOENT`                            | PROBLEMES-RESOLUS.md | Problème 10 |
| `column "user_id" does not exist`              | PROBLEMES-RESOLUS.md | Problème 5  |
| `Table "audit_table_consolidations" manquante` | PROBLEMES-RESOLUS.md | Problème 4  |
| `Connection refused PostgreSQL`                | GUIDE-COMPLET.md     | Problème 4  |
| Build Docker lent                              | PROBLEMES-RESOLUS.md | Problème 6  |
| Tests HTTP échouent                            | PROBLEMES-RESOLUS.md | Problème 7  |

---

### Par tâche

| Tâche              | Document                          | Page/Section |
| ------------------ | --------------------------------- | ------------ |
| Installer Docker   | GUIDE-COMPLET.md                  | Section 2.2  |
| Installer Node.js  | GUIDE-COMPLET.md                  | Section 2.3  |
| Créer .env         | GUIDE-COMPLET.md                  | Section 3.4  |
| Corriger CRLF      | GUIDE-COMPLET.md                  | Section 6.1  |
| Build Docker       | GUIDE-COMPLET.md                  | Section 6.2  |
| Bypass keystore    | GUIDE-COMPLET.md                  | Section 7    |
| Configurer Gemini  | 07-CONFIGURATION-GOOGLE-GEMINI.md | Tout         |
| Tester persistance | GUIDE-COMPLET.md                  | Section 9    |
| Libérer port 4310  | PROBLEMES-RESOLUS.md              | Problème 3   |
| Nettoyer Docker    | GUIDE-COMPLET.md                  | Section 10   |

---

## 📊 Métriques d'installation

### Temps estimés

| Activité              | Première fois | Réinstallation         |
| --------------------- | ------------- | ---------------------- |
| Lecture documentation | 30 min        | 5 min                  |
| Installation outils   | 30 min        | 0 min (déjà installés) |
| Configuration projet  | 15 min        | 10 min                 |
| Build Docker          | 2h30          | 30 sec                 |
| Configuration serveur | 15 min        | 5 min                  |
| Tests et vérification | 10 min        | 5 min                  |
| **TOTAL**             | **~3h30**     | **~20 min**            |

### Tailles des fichiers

| Élément          | Taille        |
| ---------------- | ------------- |
| Images Docker    | ~5 GB         |
| node_modules     | ~890 MB       |
| Repo cloné       | ~50 MB        |
| Base PostgreSQL  | ~20 MB (vide) |
| **TOTAL disque** | **~6 GB**     |

---

## 🎯 Points clés à retenir

### ✅ Ce qui fonctionne bien

1. **Architecture Docker** - Isolation complète, reproductible
2. **PostgreSQL 17** - Base de données robuste, JSONB performant
3. **Système de persistance** - 3 tables + versioning automatique
4. **Tests directs PostgreSQL** - Pas de dépendance HTTP
5. **Documentation exhaustive** - Tous les problèmes documentés

### ⚠️ Points d'attention

1. **CRLF Windows** - Toujours convertir en LF avant build Docker
2. **Ressources Docker** - Minimum 8 GB RAM, 4 CPU cores
3. **Build Docker long** - 2h30 première fois (normal)
4. **Keystore bypass** - Temporaire, à remplacer en production
5. **Colonnes owner_id** - Ne pas confondre avec user_id

### 🔮 Améliorations futures

1. **Script d'installation automatisé** - `install-nod.ps1`
2. **Table consolidations** - À finaliser avec routes API
3. **Frontend React** - Composants EditableTable, Consolidation
4. **WebSocket** - Collaboration temps réel
5. **Intégration n8n** - Webhook automatique

---

## 📞 Aide et support

### En cas de problème

1. **Identifier le symptôme exact**

   ```powershell
   # Capturer l'erreur complète
   command 2>&1 | Tee-Object error.log
   ```

2. **Consulter la documentation**
   - PROBLEMES-RESOLUS.md (13 problèmes courants)
   - GUIDE-COMPLET.md section 8 (dépannage)

3. **Vérifier les logs**

   ```powershell
   docker compose logs -f
   docker logs nod-local-postgres-1
   ```

4. **Nettoyer et recommencer** (dernier recours)
   ```powershell
   docker compose down -v
   Remove-Item -Recurse -Force node_modules, .local, dist
   pnpm install
   docker compose up -d --build
   ```

### Ressources externes

- **Nod GitHub** : https://github.com/n8n-io/nod
- **Docker Docs** : https://docs.docker.com/
- **PostgreSQL Docs** : https://www.postgresql.org/docs/
- **Node.js Docs** : https://nodejs.org/docs/

---

## 📝 Historique des versions

### Version 1.0 (Novembre 2024)

- ✅ Installation complète Docker sur Windows
- ✅ Système de persistance (3 tables + versioning)
- ✅ Tests de persistance fonctionnels
- ✅ Documentation exhaustive (4 documents principaux)
- ✅ 13 problèmes identifiés et résolus
- ✅ Configuration Google Gemini
- ✅ Guide de réinstallation rapide

---

## 🗂️ Structure des documents

```
Doc installation nod n8n/
├── 00-INDEX-DOCUMENTATION.md              (Ce fichier - navigation)
├── REINSTALLATION-RAPIDE.md               (Checklist condensée)
├── 08-GUIDE-INSTALLATION-COMPLETE-DOCKER.md (Guide exhaustif)
├── 07-CONFIGURATION-GOOGLE-GEMINI.md      (Config Gemini)
├── 06-WORKSPACE-EXPLIQUE.md               (Workspace Nod)
└── PROBLEMES-RESOLUS.md                   (13 problèmes + solutions)

Doc systeme de persistance/
├── README.md                               (Architecture persistance)
├── 01-SCHEMA-BASE-DONNEES.md
├── 02-PLAN-IMPLEMENTATION.md
└── tests-audit-tables/                     (Scripts de test)
    ├── run-tests.mjs
    ├── test-all-tables.mjs
    └── table-*.json                        (5 exemples de tables)

Doc workspace team/
├── 00-README-WORKSPACE-COLLABORATIF.md    (Collaboration)
└── 05-CAS-USAGE-SUIVI-RECOMMANDATIONS.md  (Cas d'usage audit)

Racine projet/
├── test-persistence-direct.mjs            (Test PostgreSQL direct)
├── GUIDE-RAPIDE-GEMINI.md                 (Mini guide Gemini)
├── STATUS-ACTUEL.md                       (État système)
└── ETAPES-SUIVANTES.md                    (Roadmap)
```

---

## 🚀 Commencer maintenant

### Première installation

```powershell
# 1. Ouvrir le guide complet
start 08-GUIDE-INSTALLATION-COMPLETE-DOCKER.md

# 2. Suivre sections 1-6 (installation + configuration)
# 3. Lancer Docker build
# 4. Tester la persistance
```

### Réinstallation

```powershell
# 1. Ouvrir la checklist rapide
start REINSTALLATION-RAPIDE.md

# 2. Suivre les 10 étapes
# 3. En cas de problème : PROBLEMES-RESOLUS.md
```

### Dépannage

```powershell
# 1. Identifier l'erreur
# 2. Chercher dans PROBLEMES-RESOLUS.md
# 3. Appliquer la solution
```

---

**Documentation créée le :** $(Get-Date -Format "dd/MM/yyyy HH:mm")  
**Auteur :** Assistant IA (Claude)  
**Version :** 1.0  
**Licence :** Projet privé Nod

**Tous les problèmes rencontrés pendant l'installation ont été documentés pour faciliter les futures installations.**
