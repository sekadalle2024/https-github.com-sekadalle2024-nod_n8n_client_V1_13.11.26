# Guide de Test - Système de Persistance des Tables

## Objectif

Tester le système complet de persistance des tables d'audit dans l'application Nod.

---

## Prérequis

✅ Docker Desktop lancé  
✅ Containers démarrés (`demarrer-tout.bat`)  
✅ Serveur Node.js démarré (`demarrer-serveur.bat`)  
✅ Application accessible sur `http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU`

---

## Scénario de Test Complet

### 1. Préparer des Données de Test

Créer un fichier CSV avec des données bancaires (exemple) :

```csv
Date,Description,Montant,Categorie,Compte
2024-01-15,Salaire,3500.00,Revenu,Compte Principal
2024-01-16,Loyer,-1200.00,Logement,Compte Principal
2024-01-17,Courses Carrefour,-85.50,Alimentation,Compte Principal
2024-01-18,Essence,-65.00,Transport,Compte Principal
2024-01-20,Netflix,-15.99,Loisirs,Compte Principal
```

Sauvegarder ce fichier comme `test-transactions.csv` sur le bureau.

---

### 2. Upload dans le Chat

1. Ouvrir l'application Nod dans le navigateur
2. Aller dans le chat principal
3. **Uploader le fichier CSV** via l'icône de pièce jointe (📎)
4. Attendre que la table s'affiche dans le chat

---

### 3. Tester le Menu Contextuel

#### A. Sauvegarder la Table

1. **Clic droit** sur la table affichée
2. Sélectionner **"Save to Audit Table"**
3. Une boîte de dialogue s'ouvre avec :
   - Champ **Table Name** : entrer `transactions_test`
   - **Column Configuration** : vérifier les types détectés automatiquement
     - `Date` → type `date` ✓
     - `Description` → type `text` ✓
     - `Montant` → type `number` ✓
     - `Categorie` → type `select` ✓
     - `Compte` → type `select` ✓

4. Cliquer **"Save Table"**
5. Observer la notification de succès : _"Table saved successfully"_

#### B. Modifier les Données

1. **Clic droit** sur la table → **"Edit Data"**
2. Une interface d'édition s'ouvre
3. **Modifier une cellule** :
   - Cliquer sur la cellule `Montant` de la ligne 3 (Courses)
   - Changer `-85.50` → `-92.30`
   - Appuyer sur Enter
4. **Ajouter une ligne** :
   - Cliquer sur le bouton **"+ Add Row"**
   - Remplir : `2024-01-21, Restaurant, -45.00, Alimentation, Compte Principal`
5. **Supprimer une ligne** :
   - Sélectionner la ligne Netflix
   - Cliquer sur l'icône poubelle 🗑️
6. Cliquer **"Save Changes"**
7. Observer la notification : _"Changes saved (version 2)"_

#### C. Voir l'Historique des Versions

1. **Clic droit** sur la table → **"View History"**
2. Une liste des versions s'affiche :
   - **Version 1** (création initiale) - 5 lignes
   - **Version 2** (modifications) - 5 lignes (1 modif, 1 ajout, 1 suppression)
3. **Comparer les versions** :
   - Cliquer sur Version 1
   - Observer les différences surlignées en couleur
4. **Restaurer une version** :
   - Sélectionner Version 1
   - Cliquer **"Restore This Version"**
   - Confirmer
   - Observer notification : _"Version 1 restored as version 3"_

#### D. Exporter la Table

1. **Clic droit** sur la table → **"Export as CSV"**
2. Le fichier `transactions_test.csv` est téléchargé
3. Ouvrir le fichier dans Excel/LibreOffice
4. Vérifier que les données correspondent à la dernière version

#### E. Supprimer la Table

1. **Clic droit** sur la table → **"Delete Table"**
2. Une confirmation s'affiche : _"Are you sure you want to delete this table?"_
3. Cliquer **"Delete"**
4. Observer notification : _"Table deleted successfully"_
5. La table disparaît de la liste

---

## Vérifications Backend

### 1. Vérifier dans PostgreSQL

```powershell
# Se connecter à la base de données
docker exec -it nod-local-postgres-1 psql -U nod -d nod

# Lister les tables sauvegardées
SELECT id, name, created_at, row_count FROM audit_table_schemas ORDER BY created_at DESC;

# Voir les données d'une table spécifique
SELECT * FROM audit_table_data WHERE schema_id = 1 ORDER BY row_index;

# Voir l'historique des versions
SELECT version, created_at, row_count FROM audit_data_versions WHERE schema_id = 1 ORDER BY version;

# Quitter psql
\q
```

### 2. Tester les API Endpoints

```powershell
# Lister toutes les tables
curl http://localhost:4310/api/audit/schemas

# Obtenir une table spécifique
curl http://localhost:4310/api/audit/schemas/1

# Obtenir les données d'une table
curl http://localhost:4310/api/audit/data/1
```

---

## Points de Contrôle

### ✅ Fonctionnalités Validées

- [ ] Upload CSV et affichage de la table dans le chat
- [ ] Menu contextuel (clic droit) s'affiche correctement
- [ ] Détection automatique des types de colonnes (text, number, date, select)
- [ ] Sauvegarde initiale de la table
- [ ] Modification des cellules en temps réel
- [ ] Ajout de nouvelles lignes
- [ ] Suppression de lignes
- [ ] Versioning automatique à chaque sauvegarde
- [ ] Affichage de l'historique des versions
- [ ] Comparaison entre versions (diff visuel)
- [ ] Restauration d'une version antérieure
- [ ] Export CSV depuis l'interface
- [ ] Suppression douce (soft delete) de la table
- [ ] Notification toast pour chaque action
- [ ] Fermeture du dialog au clic extérieur (ESC key)
- [ ] Gestion du focus clavier

### ✅ Sécurité Validée

- [ ] Isolation par `owner_id` (multi-tenant)
- [ ] Authentification JWT sur tous les endpoints
- [ ] Validation des schémas Zod
- [ ] Pas de fuite de données entre utilisateurs
- [ ] Transactions PostgreSQL pour les opérations critiques

### ✅ Performance Validée

- [ ] Chargement rapide des tables (<500ms)
- [ ] Édition en temps réel fluide
- [ ] Pas de lag sur les tables de 100+ lignes
- [ ] Pagination automatique si >1000 lignes

---

## Cas d'Erreur à Tester

### 1. Nom de Table Invalide

- Entrer des caractères spéciaux dans le nom : `table@#$%`
- **Résultat attendu** : Message d'erreur _"Invalid table name"_

### 2. Données Incohérentes

- Modifier une cellule `number` avec du texte : `abc`
- **Résultat attendu** : Message d'erreur _"Invalid number format"_

### 3. Table Déjà Existante

- Sauvegarder deux fois la même table avec le même nom
- **Résultat attendu** : Message d'erreur _"Table already exists"_ ou suffixe automatique `_2`

### 4. Perte de Connexion

- Arrêter le serveur pendant l'édition
- **Résultat attendu** : Message _"Connection lost. Changes not saved."_

---

## Résultats Attendus

À la fin de tous les tests, le système doit :

1. ✅ Avoir sauvegardé au moins 3 versions de la table
2. ✅ Afficher correctement l'historique avec dates et auteurs
3. ✅ Permettre la restauration sans perte de données
4. ✅ Exporter un CSV valide et importable
5. ✅ Avoir toutes les données en base PostgreSQL
6. ✅ Ne montrer aucune erreur console JavaScript
7. ✅ Respecter l'isolation multi-utilisateur

---

## Commandes Utiles

### Redémarrer le Serveur

```powershell
cd "h:\nod_n8n\Doc demarrer container & serveur"
.\demarrer-serveur.bat
```

### Vérifier l'État des Services

```powershell
.\verifier-etat.bat
```

### Consulter les Logs Serveur

```powershell
# Dans le terminal où tourne le serveur
# Chercher les lignes contenant "audit"
```

### Nettoyer la Base de Données (Reset Complet)

```powershell
docker exec -it nod-local-postgres-1 psql -U nod -d nod -c "TRUNCATE TABLE audit_table_schemas, audit_table_data, audit_data_versions, audit_table_consolidations RESTART IDENTITY CASCADE;"
```

---

## Captures d'Écran Recommandées

Pour valider visuellement le système, prendre des captures d'écran de :

1. **Menu contextuel** (clic droit sur table)
2. **Dialog de configuration** (Save to Audit Table)
3. **Interface d'édition** avec données modifiées
4. **Historique des versions** avec diff coloré
5. **Notification de succès** (toast)
6. **Résultat PostgreSQL** (requête SELECT)

---

## Support et Débogage

### Logs du Serveur

```powershell
# Terminal où tourne tsx src/server/index.ts
# Chercher les lignes :
# ✓ Audit tables initialized
# POST /api/audit/schemas → 201
# GET /api/audit/data/:id → 200
```

### Logs Docker

```powershell
docker logs nod-local-postgres-1 --tail 50
```

### Erreurs Fréquentes

| Erreur                         | Cause                  | Solution                                    |
| ------------------------------ | ---------------------- | ------------------------------------------- |
| `ECONNREFUSED 127.0.0.1:54329` | PostgreSQL non démarré | Lancer `demarrer-tout.bat`                  |
| `401 Unauthorized`             | Token JWT expiré       | Rafraîchir la page (F5)                     |
| `Table not found`              | ID invalide            | Vérifier l'ID avec `GET /api/audit/schemas` |
| `Dialog ne se ferme pas`       | Bug focus              | Appuyer sur ESC ou cliquer backdrop         |

---

## Conclusion

Ce guide couvre tous les scénarios de test pour valider le système de persistance des tables d'audit. L'architecture complète est documentée dans `MEMO-PROGRESSIF-TACHE.md`.

**Durée estimée du test complet** : 15-20 minutes

**Prochaines étapes après validation** :

1. Tests de charge (1000+ lignes)
2. Tests multi-utilisateurs simultanés
3. Tests de restauration après crash
4. Intégration avec workflows n8n existants

---

**Date de création** : 2026-11-12  
**Version** : 1.0  
**Auteur** : Système de persistance Nod
