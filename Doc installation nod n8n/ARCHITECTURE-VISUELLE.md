# 🏗️ Architecture Visuelle du Système Nod

## Vue d'ensemble du système

```
┌─────────────────────────────────────────────────────────────────┐
│                       Windows 11 (AMD64)                         │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Navigateur Web                            │ │
│  │              http://localhost:4310                          │ │
│  │                                                              │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │           Interface Nod (React)                       │  │ │
│  │  │  • Chat avec IA                                       │  │ │
│  │  │  • Gestion des tables d'audit                        │  │ │
│  │  │  • Configuration                                      │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Serveur Nod (Node.js 24.21.0)                 │ │
│  │                   Port 4310                                 │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │ │
│  │  │   Fastify    │  │   Routes API │  │   Middleware    │  │ │
│  │  │   (HTTP)     │  │   REST       │  │   Auth          │  │ │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘  │ │
│  │           ▼                 ▼                   ▼            │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │         Système de Persistance Audit                  │  │ │
│  │  │  • createTableSchema()                                │  │ │
│  │  │  • insertTableData()                                  │  │ │
│  │  │  • updateTableData() + versioning                     │  │ │
│  │  │  • calculateConsolidation()                           │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Docker Desktop                            │ │
│  │                  (WSL2 Backend)                             │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │ │
│  │  │  PostgreSQL  │  │   Workspace  │  │     Browser     │  │ │
│  │  │   Container  │  │   Container  │  │    Container    │  │ │
│  │  │   Port 54329 │  │   (Sandbox)  │  │   (Chromium)    │  │ │
│  │  │              │  │              │  │                 │  │ │
│  │  │  ┌────────┐  │  │  ┌────────┐  │  │  ┌──────────┐  │  │ │
│  │  │  │ Tables │  │  │  │ Python │  │  │  │ Headless │  │  │ │
│  │  │  │ Audit  │  │  │  │ Node   │  │  │  │ Chrome   │  │  │ │
│  │  │  │        │  │  │  │ Tools  │  │  │  │          │  │  │ │
│  │  │  └────────┘  │  │  └────────┘  │  │  └──────────┘  │  │ │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture détaillée du backend

```
┌─────────────────────────────────────────────────────────────────┐
│                        Serveur Nod                               │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Couche HTTP (Fastify)                      ││
│  │                                                               ││
│  │  GET  /api/health                        → Health check      ││
│  │  GET  /api/audit/schemas                 → Liste tables      ││
│  │  POST /api/audit/schemas                 → Créer table       ││
│  │  GET  /api/audit/schemas/:id             → Détails table     ││
│  │  GET  /api/audit/schemas/:id/data        → Lire données      ││
│  │  POST /api/audit/schemas/:id/data        → Ajouter ligne     ││
│  │  PUT  /api/audit/data/:id                → Modifier ligne    ││
│  │  DELETE /api/audit/data/:id              → Supprimer ligne   ││
│  │  GET  /api/audit/data/:id/versions       → Historique        ││
│  │  POST /api/audit/schemas/:id/columns     → Ajouter colonne   ││
│  │  ...                                                          ││
│  └───────────────────────────────────────────────────────────────┘│
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │            Couche Métier (Business Logic)                    ││
│  │                                                               ││
│  │  src/server/db-audit-tables.ts                               ││
│  │  ┌──────────────────────────────────────────────────────┐   ││
│  │  │ • createTableSchema(owner_id, table_name, columns)   │   ││
│  │  │ • getTableSchemas(owner_id)                          │   ││
│  │  │ • insertTableData(schema_id, row_data)               │   ││
│  │  │ • updateTableData(data_id, new_data)                 │   ││
│  │  │   └─→ saveVersion(old_data) [automatique]           │   ││
│  │  │ • deleteTableData(data_id) [soft delete]             │   ││
│  │  │ • getDataVersions(data_id)                           │   ││
│  │  │ • calculateConsolidation(schema_id, group_by)        │   ││
│  │  │ • addColumn(schema_id, column_def)                   │   ││
│  │  │ • deleteColumn(schema_id, column_name)               │   ││
│  │  │ • renameColumn(schema_id, old_name, new_name)        │   ││
│  │  │ • duplicateRow(data_id)                              │   ││
│  │  │ • duplicateTable(schema_id)                          │   ││
│  │  └──────────────────────────────────────────────────────┘   ││
│  └───────────────────────────────────────────────────────────────┘│
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Couche Données (PostgreSQL)                     ││
│  │                                                               ││
│  │  pool.query(sql, params)                                     ││
│  │  ├─→ Connexion persistante                                   ││
│  │  ├─→ Transactions automatiques                               ││
│  │  └─→ Gestion des erreurs                                     ││
│  └───────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Schéma de la base de données

```
┌──────────────────────────────────────────────────────────────────┐
│                     PostgreSQL Database: nod                      │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │           audit_table_schemas (Métadonnées)                   ││
│  │                                                                ││
│  │  id                 UUID       PRIMARY KEY                     ││
│  │  owner_id           TEXT       NOT NULL                        ││
│  │  table_name         TEXT       NOT NULL                        ││
│  │  display_name       TEXT       NOT NULL                        ││
│  │  n8n_workflow_id    TEXT       NULL                            ││
│  │  column_definitions JSONB      NOT NULL                        ││
│  │  created_at         TIMESTAMPTZ DEFAULT now()                 ││
│  │  updated_at         TIMESTAMPTZ DEFAULT now()                 ││
│  │  deleted_at         TIMESTAMPTZ NULL                           ││
│  │                                                                ││
│  │  UNIQUE(owner_id, table_name)                                 ││
│  │  INDEX(owner_id, deleted_at)                                  ││
│  └────────────────────────────────────────────────────────────────┘│
│                              │                                     │
│                              │ 1:N                                 │
│                              ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │            audit_table_data (Données des lignes)              ││
│  │                                                                ││
│  │  id               UUID       PRIMARY KEY                       ││
│  │  owner_id         TEXT       NOT NULL                          ││
│  │  table_schema_id  UUID       FOREIGN KEY → audit_table_schemas││
│  │  row_data         JSONB      NOT NULL                          ││
│  │  row_order        INTEGER    DEFAULT 0                         ││
│  │  created_at       TIMESTAMPTZ DEFAULT now()                   ││
│  │  updated_at       TIMESTAMPTZ DEFAULT now()                   ││
│  │  deleted_at       TIMESTAMPTZ NULL [soft delete]              ││
│  │                                                                ││
│  │  INDEX(table_schema_id, deleted_at, row_order)                ││
│  │  INDEX(owner_id, deleted_at)                                  ││
│  └────────────────────────────────────────────────────────────────┘│
│                              │                                     │
│                              │ 1:N                                 │
│                              ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │        audit_data_versions (Historique des modifications)     ││
│  │                                                                ││
│  │  id            UUID       PRIMARY KEY                          ││
│  │  owner_id      TEXT       NOT NULL                             ││
│  │  table_data_id UUID       FOREIGN KEY → audit_table_data      ││
│  │  row_data      JSONB      NOT NULL [ancienne version]         ││
│  │  change_type   TEXT       'create' | 'update' | 'delete'      ││
│  │  changed_by    TEXT       NULL                                 ││
│  │  changed_at    TIMESTAMPTZ DEFAULT now()                      ││
│  │                                                                ││
│  │  INDEX(table_data_id, changed_at DESC)                        ││
│  │  INDEX(owner_id, changed_at DESC)                             ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │     audit_table_consolidations (Configuration agrégations)    ││
│  │                                                                ││
│  │  id                  UUID       PRIMARY KEY                    ││
│  │  owner_id            TEXT       NOT NULL                       ││
│  │  source_schema_id    UUID       FOREIGN KEY → audit_table_schemas││
│  │  group_by_column     TEXT       NOT NULL                       ││
│  │  aggregate_columns   TEXT[]     NOT NULL                       ││
│  │  aggregate_functions TEXT[]     NOT NULL ['sum', 'avg', ...]  ││
│  │  aggregates          JSONB      NULL [résultats calculés]     ││
│  │  created_at          TIMESTAMPTZ DEFAULT now()                ││
│  │  updated_at          TIMESTAMPTZ DEFAULT now()                ││
│  │                                                                ││
│  │  INDEX(source_schema_id)                                      ││
│  │  INDEX(owner_id)                                              ││
│  └────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

---

## Flux de données : Création d'une table

```
┌──────────┐
│ Frontend │
│  React   │
└────┬─────┘
     │ POST /api/audit/schemas
     │ {
     │   table_name: "audit_risques",
     │   display_name: "Table des Risques",
     │   columns: [
     │     {name: "assertion", type: "text", required: true},
     │     {name: "niveau_risque", type: "select", options: [...]}
     │   ]
     │ }
     ▼
┌─────────────────────────┐
│   Routes API (Fastify)  │
│ src/server/routes-      │
│   audit-tables.ts       │
└──────────┬──────────────┘
           │ Validation des données
           │ Vérification authentification
           ▼
┌─────────────────────────┐
│  Business Logic         │
│ src/server/db-          │
│   audit-tables.ts       │
│                         │
│ createTableSchema()     │
└──────────┬──────────────┘
           │ INSERT INTO audit_table_schemas
           │ (owner_id, table_name, column_definitions, ...)
           │ VALUES ($1, $2, $3, ...)
           ▼
┌─────────────────────────┐
│   PostgreSQL            │
│   Container             │
│   (Port 54329)          │
│                         │
│ • Génère UUID           │
│ • Stocke JSONB          │
│ • Crée index            │
└──────────┬──────────────┘
           │ RETURNING *
           ▼
┌─────────────────────────┐
│   Réponse JSON          │
│                         │
│ {                       │
│   id: "uuid-xxx",       │
│   owner_id: "user123",  │
│   table_name: "...",    │
│   column_definitions: [{│
│     name: "assertion",  │
│     type: "text",       │
│     ...                 │
│   }]                    │
│ }                       │
└──────────┬──────────────┘
           │
           ▼
┌──────────────────────────┐
│   Frontend met à jour    │
│   Liste des tables       │
└──────────────────────────┘
```

---

## Flux de données : Modification avec versioning

```
┌──────────┐
│ Frontend │ Utilisateur modifie une cellule
│  React   │ "Niveau: Élevé → Faible"
└────┬─────┘
     │ PUT /api/audit/data/:id
     │ {
     │   row_data: {
     │     assertion: "Existence stocks",
     │     niveau_risque: "Faible",  ← Changé
     │     montant: 150000,
     │     conforme: true
     │   }
     │ }
     ▼
┌─────────────────────────────────┐
│   Business Logic                │
│ updateTableData(data_id, ...)   │
└──────────┬──────────────────────┘
           │
           │ 1️⃣ Lire ancienne version
           ▼
┌─────────────────────────────────┐
│ SELECT row_data                 │
│ FROM audit_table_data           │
│ WHERE id = $1                   │
└──────────┬──────────────────────┘
           │ old_data = {
           │   niveau_risque: "Élevé",
           │   conforme: false,
           │   ...
           │ }
           ▼
           │ 2️⃣ Sauvegarder version
           ▼
┌─────────────────────────────────┐
│ INSERT INTO audit_data_versions │
│ (table_data_id, row_data,       │
│  change_type, changed_by)       │
│ VALUES ($1, $2, 'update', $3)   │
└──────────┬──────────────────────┘
           │ Version ID créée
           ▼
           │ 3️⃣ Mettre à jour données
           ▼
┌─────────────────────────────────┐
│ UPDATE audit_table_data         │
│ SET row_data = $1,              │
│     updated_at = NOW()          │
│ WHERE id = $2                   │
└──────────┬──────────────────────┘
           │ Données actualisées
           ▼
┌─────────────────────────────────┐
│   Réponse JSON                  │
│ {                               │
│   success: true,                │
│   version_saved: true,          │
│   updated_at: "2024-11-15..."   │
│ }                               │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────┐
│ Frontend met à jour      │
│ • Cellule modifiée       │
│ • Badge "historique"     │
└──────────────────────────┘
```

---

## Flux de données : Consolidation

```
┌──────────┐
│ Frontend │ Utilisateur demande consolidation
│  React   │ "Grouper par niveau_risque, SUM(montant)"
└────┬─────┘
     │ GET /api/audit/schemas/:id/consolidation
     │ ?group_by=niveau_risque
     │ &aggregate=montant:sum
     ▼
┌─────────────────────────────────┐
│ calculateConsolidation()        │
│                                 │
│ SELECT                          │
│   row_data->>'niveau_risque',  │
│   SUM((row_data->>'montant')::│
│      numeric) as total,        │
│   COUNT(*) as count            │
│ FROM audit_table_data          │
│ WHERE table_schema_id = $1     │
│   AND deleted_at IS NULL       │
│ GROUP BY row_data->>'niveau_risque'│
│ ORDER BY total DESC            │
└──────────┬──────────────────────┘
           │ Résultats :
           │ [
           │   {niveau_risque: "Élevé", total: 450000, count: 3},
           │   {niveau_risque: "Moyen", total: 285000, count: 5},
           │   {niveau_risque: "Faible", total: 120000, count: 2}
           │ ]
           ▼
┌─────────────────────────────────┐
│ (Optionnel) Sauvegarder config  │
│ INSERT INTO                     │
│   audit_table_consolidations    │
│ (source_schema_id,              │
│  group_by_column,               │
│  aggregate_columns,             │
│  aggregates)                    │
│ VALUES ($1, $2, $3, $4)         │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│   Réponse JSON                  │
│ {                               │
│   groups: [                     │
│     {                           │
│       niveau_risque: "Élevé",   │
│       total_montant: 450000,    │
│       nombre_items: 3           │
│     },                          │
│     ...                         │
│   ],                            │
│   grand_total: 855000           │
│ }                               │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────┐
│ Frontend affiche         │
│ • Tableau consolidé      │
│ • Graphiques             │
│ • Totaux                 │
└──────────────────────────┘
```

---

## Isolation multi-tenant

```
┌───────────────────────────────────────────────────────────┐
│                    Base de données nod                     │
│                                                             │
│  owner_id = "user_alice"                                   │
│  ┌───────────────────────────────────────────────────────┐│
│  │ audit_table_schemas                                    ││
│  │ • table_risques_alice                                  ││
│  │ • table_stocks_alice                                   ││
│  │                                                         ││
│  │ audit_table_data                                       ││
│  │ • 50 lignes pour table_risques_alice                   ││
│  │ • 30 lignes pour table_stocks_alice                    ││
│  │                                                         ││
│  │ audit_data_versions                                    ││
│  │ • 12 versions historiques                              ││
│  └───────────────────────────────────────────────────────┘│
│                                                             │
│  owner_id = "user_bob"                                     │
│  ┌───────────────────────────────────────────────────────┐│
│  │ audit_table_schemas                                    ││
│  │ • table_immobilisations_bob                            ││
│  │                                                         ││
│  │ audit_table_data                                       ││
│  │ • 20 lignes pour table_immobilisations_bob             ││
│  │                                                         ││
│  │ audit_data_versions                                    ││
│  │ • 5 versions historiques                               ││
│  └───────────────────────────────────────────────────────┘│
│                                                             │
│  owner_id = "user_carol"                                   │
│  ┌───────────────────────────────────────────────────────┐│
│  │ audit_table_schemas                                    ││
│  │ • table_tiers_carol                                    ││
│  │                                                         ││
│  │ audit_table_data                                       ││
│  │ • 100 lignes pour table_tiers_carol                    ││
│  │                                                         ││
│  │ audit_data_versions                                    ││
│  │ • 25 versions historiques                              ││
│  └───────────────────────────────────────────────────────┘│
│                                                             │
│  Toutes les requêtes incluent WHERE owner_id = $1          │
│  → Isolation garantie au niveau base de données            │
└───────────────────────────────────────────────────────────┘
```

---

## Intégration n8n (future)

```
┌──────────────────────────────────────────────────────────────┐
│                       Workflow n8n                            │
│                                                                │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────────┐   │
│  │ Trigger  │───→│ Transform│───→│  HTTP Request        │   │
│  │ Schedule │    │ Data     │    │  POST /api/audit/    │   │
│  │  (Cron)  │    │          │    │       from-n8n       │   │
│  └──────────┘    └──────────┘    └──────────┬───────────┘   │
│                                               │                │
└───────────────────────────────────────────────┼───────────────┘
                                                 │
                                                 │ POST
                                                 │ {
                                                 │   workflow_id: "wf_001",
                                                 │   table_name: "audit_risques",
                                                 │   columns: [...],
                                                 │   data: [...]
                                                 │ }
                                                 ▼
┌──────────────────────────────────────────────────────────────┐
│                        Serveur Nod                            │
│                                                                │
│  POST /api/audit/from-n8n                                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 1. Créer ou récupérer schéma                           │  │
│  │    createTableSchema() ou getTableSchema()             │  │
│  │                                                          │  │
│  │ 2. Insérer données en masse                            │  │
│  │    bulkInsertTableData(schema_id, data_rows)           │  │
│  │                                                          │  │
│  │ 3. Calculer consolidations si configurées              │  │
│  │    calculateConsolidation(schema_id)                   │  │
│  │                                                          │  │
│  │ 4. Retourner résumé                                    │  │
│  │    { success: true, inserted: 50, table_id: "..." }   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────┐
│                     PostgreSQL                                │
│                                                                │
│  • 1 nouveau schéma (ou réutilisation)                        │
│  • 50 nouvelles lignes de données                             │
│  • Consolidations recalculées                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## Timeline d'une requête typique

```
0ms    │ Client envoie GET /api/audit/schemas
       │
10ms   │ ├─ Fastify reçoit la requête
       │ ├─ Middleware d'authentification
       │ └─ Validation des paramètres
       │
20ms   │ ├─ Route handler appelée
       │ └─ getTableSchemas(owner_id) invoquée
       │
25ms   │ ├─ Connexion PostgreSQL obtenue du pool
       │ └─ Requête SQL exécutée:
       │     SELECT * FROM audit_table_schemas
       │     WHERE owner_id = $1 AND deleted_at IS NULL
       │
40ms   │ ├─ PostgreSQL retourne 5 lignes
       │ └─ Données désérialisées (JSONB → JSON)
       │
45ms   │ ├─ Transformation des données
       │ └─ Formatage de la réponse JSON
       │
50ms   │ ├─ Fastify sérialise la réponse
       │ └─ Envoi au client
       │
60ms   │ Client reçoit la réponse

Total: ~60ms pour une requête simple
```

---

## Sécurité et isolation

```
┌──────────────────────────────────────────────────────────────┐
│                   Couches de sécurité                         │
│                                                                │
│  1️⃣ Authentification HTTP                                     │
│     └─ Token d'accès dans cookie ou header                    │
│        (KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU)          │
│                                                                │
│  2️⃣ Isolation par owner_id                                    │
│     └─ Toutes les requêtes SQL filtrent par owner_id          │
│        WHERE owner_id = $1                                     │
│                                                                │
│  3️⃣ Validation des données                                    │
│     └─ Schéma JSON validé côté serveur                        │
│        + Types PostgreSQL (JSONB, UUID, TEXT)                 │
│                                                                │
│  4️⃣ Soft delete (pas de perte de données)                     │
│     └─ deleted_at IS NULL dans les requêtes                   │
│        Les données "supprimées" restent accessibles           │
│                                                                │
│  5️⃣ Versioning automatique                                    │
│     └─ Chaque modification crée une version                   │
│        Traçabilité complète des changements                   │
│                                                                │
│  6️⃣ Transactions PostgreSQL                                   │
│     └─ Consistance garantie                                   │
│        Rollback automatique en cas d'erreur                   │
│                                                                │
│  7️⃣ Chiffrement Vault (NOD_VAULT_KEY)                         │
│     └─ Clés API stockées chiffrées                            │
│        AES-256-GCM                                             │
└──────────────────────────────────────────────────────────────┘
```

---

**Cette architecture supporte :**

- ✅ Multi-tenant (isolation par owner_id)
- ✅ Versioning automatique (audit trail)
- ✅ Soft delete (récupération possible)
- ✅ JSONB (schéma flexible)
- ✅ Consolidations (agrégations)
- ✅ Collaboration (WebSocket à venir)
- ✅ Scalabilité (PostgreSQL + Docker)

**Prêt pour :**

- 🔜 Frontend React
- 🔜 Intégration n8n
- 🔜 WebSocket temps réel
- 🔜 Export CSV/Excel
