# Checklist Tests Manuels - Système de Persistance v2b

**Date**: 12 novembre 2026  
**Version**: v2b (Inline Editing)  
**Statut**: Prêt pour validation manuelle

---

## 📋 Prérequis

### Environnement

- [x] Docker Desktop démarré et opérationnel (icône verte)
- [x] Containers en cours d'exécution (postgres, workspace, browser)
- [ ] Serveur Node.js démarré sur port 4310
- [ ] Application accessible : http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU

### Vérifications préalables

```bash
# 1. Vérifier Docker containers
docker ps --filter "name=nod"

# Résultat attendu : 4 containers running (postgres healthy, workspace, browser healthy, network healthy)

# 2. Vérifier PostgreSQL
docker logs nod-local-postgres-1 --tail 10

# Résultat attendu : "database system is ready to accept connections"

# 3. Démarrer le serveur (dans terminal visible)
cd h:\nod_n8n
pnpm exec tsx src/server/index.ts

# Résultat attendu : "Server running on http://localhost:4310"
```

---

## 🧪 Tests Critiques

### Test 1 : Race Condition (Sauvegarde concurrente)

**Objectif** : Vérifier que plusieurs clics sur Save ne créent pas de sauvegardes multiples

**Étapes** :

1. Générer une table dans le chat (ou coller un CSV)
2. Modifier une cellule (ex: changer une valeur)
3. **Immédiatement** (< 2 secondes) cliquer sur le bouton 💾 **Save**
4. Re-cliquer plusieurs fois rapidement sur 💾 **Save**

**Résultat attendu** :

- ✅ Indicateur affiche "Saving..." pendant la sauvegarde
- ✅ Une seule requête POST vers /api/audit/data
- ✅ Après sauvegarde : indicateur "Saved ✓" (vert)
- ✅ Pas d'erreurs dans la console navigateur
- ✅ Pas de duplications dans PostgreSQL

**Résultat observé** :

- [ ] Conforme
- [ ] Non conforme (décrire) : _______________________

**Code vérifié** : `editable-table.tsx` lignes 27, 130-145 (flag `isSaving`)

---

### Test 2 : Restauration Cross-Browser

**Objectif** : Vérifier que les tables sont restaurées via l'API (pas localStorage)

**Étapes** :

1. Créer une table et la sauvegarder (💾 Save)
2. Noter le nom de la table (ex: "Plan de Trésorerie Q1 2024")
3. Fermer le message/chat contenant la table
4. **Ouvrir DevTools** (F12) → Console
5. Exécuter : `localStorage.clear()`
6. Recharger la page (Ctrl+R ou F5)
7. Rouvrir le message/chat

**Résultat attendu** :

- ✅ Table restaurée complète avec toutes les données
- ✅ Requête GET vers `/api/audit/schemas/by-name?name=Plan%20de%20Tr%C3%A9sorerie%20Q1%202024`
- ✅ Pas d'erreur "Failed to restore table"
- ✅ Indicateur "Saved ✓" après restauration

**Résultat observé** :

- [ ] Conforme
- [ ] Non conforme (décrire) : _______________________

**Code vérifié** : `routes-audit-tables.ts` lignes 38-56 (endpoint by-name)

---

### Test 3 : Auto-Save (Debounce 2s)

**Objectif** : Vérifier la sauvegarde automatique après 2 secondes

**Étapes** :

1. Créer/ouvrir une table
2. Modifier une cellule (ex: changer "1000" → "2000")
3. **Ne rien faire** pendant 2 secondes
4. Observer l'indicateur de statut

**Résultat attendu** :

- ✅ Après 2 secondes : indicateur "Saving..."
- ✅ Puis : indicateur "Saved ✓" (vert)
- ✅ Requête POST vers `/api/audit/data` visible dans DevTools Network
- ✅ Pas de console.error dans la console

**Résultat observé** :

- [ ] Conforme
- [ ] Non conforme (décrire) : _______________________

**Code vérifié** : `editable-table.tsx` lignes 80-90 (debounce 2000ms)

---

### Test 4 : CRUD Complet

**Objectif** : Vérifier toutes les opérations Create, Read, Update, Delete

#### 4.1 Create (Création)

**Étapes** :

1. Générer une table via LLM ou coller un CSV
2. Cliquer 💾 **Save**
3. Vérifier dans DevTools Network : POST `/api/audit/schemas` puis POST `/api/audit/data`

**Résultat attendu** :

- ✅ Table créée avec succès
- ✅ Message "Saved ✓"
- ✅ Pas d'erreur HTTP (pas de 401, 500, etc.)

#### 4.2 Read (Lecture)

**Étapes** :

1. Recharger la page
2. Rouvrir le message contenant la table

**Résultat attendu** :

- ✅ Table restaurée complète
- ✅ Requête GET `/api/audit/schemas/by-name` visible
- ✅ Toutes les données présentes

#### 4.3 Update (Modification)

**Étapes** :

1. Modifier 3-5 cellules différentes
2. Attendre auto-save (2s) OU cliquer 💾 **Save**
3. Recharger la page et rouvrir la table

**Résultat attendu** :

- ✅ Toutes les modifications sauvegardées
- ✅ Valeurs restaurées identiques
- ✅ Version incrémentée dans PostgreSQL (`audit_data_versions`)

#### 4.4 Delete (Suppression ligne)

**Étapes** :

1. Cliquer sur l'icône 🗑️ à côté d'une ligne
2. Confirmer la suppression dans le popup
3. Observer le résultat

**Résultat attendu** :

- ✅ Ligne supprimée de l'affichage
- ✅ Requête DELETE `/api/audit/data/:id`
- ✅ Message de confirmation (ou "Saved ✓")
- ✅ Après reload : ligne toujours absente (soft delete)

**Résultat observé** :

- [ ] Create : ✅ / ❌
- [ ] Read : ✅ / ❌
- [ ] Update : ✅ / ❌
- [ ] Delete : ✅ / ❌

---

### Test 5 : Ajout de Ligne

**Objectif** : Vérifier l'ajout de lignes vides

**Étapes** :

1. Cliquer sur ➕ **Add Row**
2. Remplir les cellules de la nouvelle ligne
3. Attendre auto-save (2s) ou cliquer 💾 **Save**
4. Recharger et vérifier

**Résultat attendu** :

- ✅ Nouvelle ligne ajoutée en bas
- ✅ Toutes les cellules éditables
- ✅ Ligne sauvegardée avec les données
- ✅ Après reload : ligne toujours présente

**Résultat observé** :

- [ ] Conforme
- [ ] Non conforme (décrire) : _______________________

---

### Test 6 : Export CSV

**Objectif** : Vérifier l'export en CSV

**Étapes** :

1. Créer/ouvrir une table avec données
2. Cliquer sur 📥 **Export CSV**
3. Ouvrir le fichier téléchargé dans Excel ou éditeur texte

**Résultat attendu** :

- ✅ Fichier téléchargé : `<nom-table>_<timestamp>.csv`
- ✅ Format CSV valide avec en-têtes
- ✅ Toutes les données présentes
- ✅ Encodage UTF-8 (accents corrects)
- ✅ Séparateur virgule `,`

**Résultat observé** :

- [ ] Conforme
- [ ] Non conforme (décrire) : _______________________

---

### Test 7 : Catégories et Badges

**Objectif** : Vérifier l'affichage des catégories

**Étapes** :

1. Créer 4 tables de différentes catégories :
   - Comptabilité → badge 💰 bleu
   - Conformité → badge ✓ vert
   - Risque → badge ⚠️ orange
   - Général → badge 📊 gris
2. Vérifier l'affichage de chaque badge

**Résultat attendu** :

- ✅ Badge 💰 **Accounting** (bleu) pour tables comptables
- ✅ Badge ✓ **Compliance** (vert) pour tables conformité
- ✅ Badge ⚠️ **Risk** (orange) pour tables risques
- ✅ Badge 📊 **General** (gris) par défaut

**Résultat observé** :

- [ ] Conforme
- [ ] Non conforme (décrire) : _______________________

---

### Test 8 : Gestion des Erreurs

**Objectif** : Vérifier l'affichage des erreurs

**Étapes** :

1. **Simuler une erreur réseau** : Arrêter le serveur Node.js (`Ctrl+C`)
2. Modifier une cellule dans une table
3. Attendre auto-save (2s) ou cliquer 💾 **Save**

**Résultat attendu** :

- ✅ Indicateur "Error ✗" (rouge)
- ✅ Message d'erreur visible sous la table
- ✅ **Pas de console.error** dans DevTools Console
- ✅ Table reste éditable
- ✅ Possibilité de retenter (redémarrer serveur et re-save)

**Résultat observé** :

- [ ] Conforme
- [ ] Non conforme (décrire) : _______________________

**Code vérifié** : `editable-table.tsx` lignes 111, 216 (console.error supprimés)

---

### Test 9 : Immutabilité d'État

**Objectif** : Vérifier qu'il n'y a pas de mutations directes

**Étapes** :

1. Ouvrir DevTools → Console
2. Ajouter un point d'arrêt dans `editable-table.tsx` ligne 174 (`setData([...data, newRow])`)
3. Ajouter une ligne avec ➕ **Add Row**
4. Vérifier que le spread operator `[...data, newRow]` est utilisé

**Résultat attendu** :

- ✅ Pas de `data.push()` direct
- ✅ Utilisation de `setData([...data, newRow])`
- ✅ Pas d'erreurs React de mutation

**Résultat observé** :

- [ ] Conforme
- [ ] Non conforme (décrire) : _______________________

**Code vérifié** : `editable-table.tsx` ligne 174 (spread operator)

---

### Test 10 : Performance (1000+ lignes)

**Objectif** : Vérifier la performance avec beaucoup de données

**Étapes** :

1. Générer une table avec 1000+ lignes (via script ou CSV massif)
2. Modifier plusieurs cellules
3. Déclencher auto-save
4. Observer le temps de réponse

**Résultat attendu** :

- ⚠️ Affichage fluide (< 2s pour render)
- ⚠️ Sauvegarde complète (< 5s pour 1000 lignes)
- ⚠️ Pas de freeze de l'interface
- ⚠️ Pas de crash

**Note** : Ce test est optionnel pour la V1. Optimisation prévue plus tard.

**Résultat observé** :

- [ ] Conforme
- [ ] Non conforme (décrire) : _______________________

---

## 📊 Récapitulatif des Tests

| #   | Test                       | Status | Priorité     | Remarques            |
| --- | -------------------------- | ------ | ------------ | -------------------- |
| 1   | Race Condition             | ⏳     | 🔴 Critique  | Flag `isSaving`      |
| 2   | Restauration Cross-Browser | ⏳     | 🔴 Critique  | Endpoint by-name     |
| 3   | Auto-Save                  | ⏳     | 🟠 Important | Debounce 2s          |
| 4   | CRUD Complet               | ⏳     | 🔴 Critique  | 4 sous-tests         |
| 5   | Ajout de Ligne             | ⏳     | 🟠 Important | Add Row              |
| 6   | Export CSV                 | ⏳     | 🟡 Moyen     | Export fonctionnel   |
| 7   | Catégories                 | ⏳     | 🟡 Moyen     | 4 badges             |
| 8   | Gestion Erreurs            | ⏳     | 🟠 Important | Pas de console.error |
| 9   | Immutabilité               | ⏳     | 🟡 Moyen     | Spread operator      |
| 10  | Performance                | ⏳     | ⚪ Optionnel | 1000+ lignes         |

**Légende statut** :

- ⏳ En attente
- ✅ Réussi
- ❌ Échoué
- ⚠️ Partiel

---

## 🐛 Bugs Identifiés

### Bug #1 : [Titre]

**Gravité** : 🔴 Critique / 🟠 Important / 🟡 Moyen / ⚪ Faible  
**Test** : Test #X  
**Description** :  
_Décrire le bug observé_

**Reproduction** :

1. Étape 1
2. Étape 2
3. Résultat

**Logs/Screenshots** :

```
Coller les logs ou ajouter screenshot
```

**Fichiers concernés** :

- `src/web/components/editable-table.tsx`
- `src/server/routes-audit-tables.ts`

---

## 📝 Notes Additionnelles

### Problèmes de Démarrage

**PostgreSQL lent** :

- Le container PostgreSQL prend **90+ secondes** pour démarrer (fsync long)
- Le script `demarrer-tout-projet.bat` attend seulement 30 secondes
- **Solution temporaire** : Attendre manuellement que les logs montrent `database system is ready to accept connections`
- **Amélioration future** : Augmenter le timeout à 120 secondes dans le script

**Serveur Node.js** :

- Vérifier que `pnpm` est dans le PATH
- Si `pnpm run dev` échoue : utiliser directement `pnpm exec tsx src/server/index.ts`
- Le serveur doit afficher "Server running on http://localhost:4310"

### Endpoints API Disponibles

```
GET    /api/audit/schemas              # Liste toutes les tables
GET    /api/audit/schemas/:id          # Table par ID
GET    /api/audit/schemas/by-name      # Table par nom (NOUVEAU)
POST   /api/audit/schemas              # Créer table
PUT    /api/audit/schemas/:id          # Modifier schéma
DELETE /api/audit/schemas/:id          # Supprimer table

GET    /api/audit/data/:schemaId       # Données d'une table
POST   /api/audit/data                 # Créer/Insérer données
PUT    /api/audit/data/:id             # Modifier ligne
DELETE /api/audit/data/:id             # Soft delete ligne

GET    /api/audit/versions/:dataId     # Historique versions
GET    /api/audit/export/:schemaId     # Export CSV
```

### Commandes PostgreSQL Utiles

```bash
# Se connecter à PostgreSQL
docker exec -it nod-local-postgres-1 psql -U nod -d nod

# Vérifier les tables
\dt audit_*

# Compter les lignes
SELECT COUNT(*) FROM audit_table_schemas;
SELECT COUNT(*) FROM audit_table_data;
SELECT COUNT(*) FROM audit_data_versions;

# Voir les tables sauvegardées
SELECT id, name, category, created_at FROM audit_table_schemas ORDER BY created_at DESC LIMIT 10;

# Voir les versions d'une ligne
SELECT version_number, created_at FROM audit_data_versions WHERE data_id = '<id>' ORDER BY version_number DESC;
```

---

## ✅ Validation Finale

**Tester par** : _________________  
**Date** : ____ / ____ / 2026

**Résultat global** :

- [ ] 🎉 **Tous les tests critiques passés** → Prêt pour production
- [ ] ⚠️ **Tests critiques partiels** → Corrections nécessaires
- [ ] ❌ **Tests critiques échoués** → Retour développement

**Prochaines étapes** :

1. [ ] Corriger les bugs identifiés
2. [ ] Ajouter tests frontend automatisés (editable-table.test.tsx)
3. [ ] Optimiser performance (1000+ lignes)
4. [ ] Créer guide utilisateur avec screenshots
5. [ ] Déployer en production

---

**Fichiers de référence** :

- `Doc systeme de persistance/00-README-V2.md` - Architecture complète
- `Doc systeme de persistance/ETAT-ACTUEL-12NOV-2026.md` - État actuel
- `Doc systeme de persistance/CORRECTIONS-FINALES.md` - Corrections appliquées
- `Doc demarrer container & serveur/00-README-DEMARRAGE.md` - Guide démarrage
