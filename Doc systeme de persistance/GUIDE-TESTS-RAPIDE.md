# Guide Tests Rapides - Tables Audit Inline

**Date** : 13 novembre 2026  
**Version** : v2b (Inline Editing)  
**Durée estimée** : 30-45 minutes

## 🎯 Objectif

Valider les 5 corrections appliquées manuellement après l'échec du workflow :

1. Race condition (flag `isSaving`)
2. Endpoint by-name pour restauration
3. Suppression console.errors
4. Immutabilité state (déjà correct)
5. Tests frontend (manuel d'abord)

## 🚀 Prérequis

- ✅ Serveur Node.js lancé sur port 4310
- ✅ PostgreSQL actif (containers Docker)
- ✅ Backend testé 8/8 (test-persistence-direct.mjs)
- ✅ 5 corrections appliquées dans le code

## 📋 Tests Prioritaires (3 tests essentiels)

### Test #1 : Race Condition Fix (5 min) 🔴 CRITIQUE

**Objectif** : Vérifier qu'une sauvegarde rapide ne crée pas de doublons

**Étapes** :

1. Ouvrir l'application : http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU
2. Générer une table d'audit (ou utiliser l'exemple)
3. Éditer une cellule dans la table
4. **IMMÉDIATEMENT** (<2 secondes) cliquer sur le bouton 💾 Save
5. Observer l'indicateur de sauvegarde

**Résultat attendu** :

- Indicateur passe à "Saving..." (spinning)
- UNE SEULE sauvegarde s'exécute
- Indicateur passe à "Saved ✓"
- Console : Aucun message d'erreur
- Backend : `SELECT * FROM audit_table_data WHERE id = '<table_id>'` → une seule version

**Résultat échec** :

- Deux sauvegardes simultanées
- Erreur 409 Conflict dans la console
- Deux versions dans `audit_data_versions`

**Correction appliquée** :

- Fichier : `src/web/components/editable-table.tsx`
- Lignes 27, 130-145
- Ajout du flag `isSaving` pour bloquer sauvegardes concurrentes

---

### Test #2 : Restauration Cross-Browser (10 min) 🔴 CRITIQUE

**Objectif** : Vérifier que l'endpoint by-name restaure les tables après effacement localStorage

**Étapes** :

1. Créer une table "Mission Audit XYZ" dans le chat
2. Vérifier qu'elle s'affiche (indicateur "Saved ✓")
3. Ouvrir DevTools (F12) → Console
4. Exécuter : `localStorage.clear()`
5. Recharger la page (F5)
6. Revenir au chat
7. Observer si la table "Mission Audit XYZ" réapparaît

**Résultat attendu** :

- Table restaurée automatiquement via `GET /api/audit/schemas/by-name?name=Mission+Audit+XYZ`
- Données intactes
- Indicateur "Saved ✓"
- Console : Aucune erreur

**Résultat échec** :

- Table vide ou disparue
- Erreur 404 dans la console
- Endpoint by-name non appelé

**Correction appliquée** :

- Fichier : `src/server/routes-audit-tables.ts`
- Lignes 38-56
- Nouvel endpoint `GET /api/audit/schemas/by-name`

---

### Test #3 : Suppression Console Errors (5 min) 🟠 IMPORTANT

**Objectif** : Vérifier qu'aucun `console.error` parasite n'apparaît

**Étapes** :

1. Ouvrir DevTools (F12) → Console
2. Effacer la console
3. Créer une table, éditer des cellules, sauvegarder
4. Supprimer une ligne
5. Exporter en CSV
6. Observer la console

**Résultat attendu** :

- Aucun `console.error` rouge
- Seuls les logs d'info/debug normaux
- Messages d'erreur visibles dans l'UI uniquement (indicateur "Error ✗")

**Résultat échec** :

- `console.error('Failed to restore table:', error)` (ligne 111 ancienne)
- `console.error('Failed to delete row:', error)` (ligne 216 ancienne)

**Corrections appliquées** :

- Fichier : `src/web/components/editable-table.tsx`
- Lignes 111, 216
- Suppression des `console.error`, remplacement par messages UI

---

## 📊 Tests Secondaires (optionnels, 15 min)

### Test #4 : CRUD Complet (10 min)

**Create** :

- Générer table → vérifier création dans PostgreSQL
- `SELECT * FROM audit_table_schemas WHERE name = '<nom>'`

**Read** :

- Recharger page → vérifier restauration données

**Update** :

- Éditer cellule → auto-save 2s → vérifier version incrémentée
- `SELECT * FROM audit_data_versions WHERE schema_id = '<id>' ORDER BY version DESC LIMIT 5`

**Delete** :

- Supprimer ligne → vérifier soft delete (`is_deleted = true`)
- `SELECT * FROM audit_table_data WHERE id = '<row_id>'`

### Test #5 : Export CSV (5 min)

1. Créer table avec 5 lignes
2. Cliquer 📥 Export CSV
3. Ouvrir le fichier téléchargé
4. Vérifier colonnes + données

---

## 🛠️ Commandes Utiles

### Backend : Vérifier données PostgreSQL

```bash
# Se connecter au container
docker exec -it nod-local-postgres-1 psql -U nod -d nod

# Lister tables
\dt

# Voir schémas créés
SELECT id, name, category, created_at FROM audit_table_schemas ORDER BY created_at DESC LIMIT 5;

# Voir données d'une table
SELECT * FROM audit_table_data WHERE schema_id = '<schema_id>';

# Voir historique versions
SELECT schema_id, version, created_at FROM audit_data_versions WHERE schema_id = '<schema_id>' ORDER BY version DESC;

# Quitter
\q
```

### Backend : Nettoyer base de données

```bash
docker exec -i nod-local-postgres-1 psql -U nod -d nod -c "TRUNCATE TABLE audit_data_versions, audit_table_data, audit_table_schemas CASCADE;"
```

### Frontend : Effacer localStorage

```javascript
// Dans DevTools Console (F12)
localStorage.clear();
location.reload();
```

---

## ✅ Critères de Validation

**Tests réussis** :

- ✅ Test #1 : Une seule sauvegarde, indicateur correct
- ✅ Test #2 : Table restaurée après localStorage.clear()
- ✅ Test #3 : Aucun console.error parasite

**Échec** :

- ❌ Race condition toujours présente (doublons)
- ❌ Restauration échoue (404 by-name)
- ❌ Console errors persistent

---

## 📝 Rapport de Tests

À remplir après exécution :

| Test                          | Statut            | Notes |
| ----------------------------- | ----------------- | ----- |
| #1 Race Condition             | ⬜ Pass / ⬜ Fail |       |
| #2 Restauration Cross-Browser | ⬜ Pass / ⬜ Fail |       |
| #3 Console Errors             | ⬜ Pass / ⬜ Fail |       |
| #4 CRUD Complet               | ⬜ Pass / ⬜ Fail |       |
| #5 Export CSV                 | ⬜ Pass / ⬜ Fail |       |

**Observations générales** :

---

## 🔗 Documents Associés

- Architecture complète : `00-README-V2.md`
- Checklist détaillée : `CHECKLIST-TESTS-MANUELS.md` (35 pages)
- Corrections appliquées : `CORRECTIONS-FINALES.md`
- Mémo progressif : `MEMO-PROGRESSIF-TACHE.md` (Section 11)

---

**Prochaine étape après tests** :

- Si ✅ tous passés → Tests automatisés frontend (editable-table.test.tsx)
- Si ❌ échecs → Déboguer issues spécifiques avec logs détaillés
