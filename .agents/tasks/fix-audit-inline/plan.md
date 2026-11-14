# Plan d'Architecture : Édition Inline des Tables d'Audit

**Date** : 2026-01-27  
**Objectif** : Transformer les tables du chat en éditeur inline (style Excel) avec auto-sauvegarde  
**Statut actuel** : Menu contextuel + Dialog (non conforme aux exigences)

---

## 📊 État des Lieux

### Backend Existant (✅ Fonctionnel - À Conserver)

**Fichiers validés** :

- `h:/nod_n8n/src/server/db-audit-tables.ts` (460 lignes, 8/8 tests passés)
- `h:/nod_n8n/src/server/routes-audit-tables.ts` (11 endpoints REST)
- Base PostgreSQL avec 4 tables fonctionnelles

**API REST disponible** :

```
GET    /api/audit/schemas                 # Liste des tables
GET    /api/audit/schemas/:schemaId       # Détails d'une table
POST   /api/audit/schemas                 # Créer table
DELETE /api/audit/schemas/:schemaId       # Supprimer table
GET    /api/audit/schemas/:schemaId/data  # Lire données
POST   /api/audit/schemas/:schemaId/data  # Ajouter ligne
POST   /api/audit/schemas/:schemaId/data/bulk # Import bulk
PUT    /api/audit/data/:dataId            # Modifier ligne
DELETE /api/audit/data/:dataId            # Supprimer ligne
PUT    /api/audit/data/:dataId/order      # Réordonner ligne
GET    /api/audit/data/:dataId/versions   # Historique
```

**Schéma PostgreSQL** :

```sql
audit_table_schemas (
  id, owner_id, table_name, display_name,
  n8n_workflow_id, column_definitions JSONB,
  created_at, updated_at, deleted_at
)

audit_table_data (
  id, owner_id, table_schema_id, row_data JSONB,
  row_order, created_at, updated_at, deleted_at
)

audit_data_versions (
  id, owner_id, table_data_id, row_data JSONB,
  change_type, changed_by, changed_at
)

audit_table_consolidations (
  id, owner_id, source_schema_id,
  group_by_column, aggregate_columns, aggregates JSONB
)
```

### Frontend Actuel (❌ À Supprimer/Refactoriser)

**Problème identifié** :
L'implémentation actuelle (workflow wf_114664d5e1054fd6) a créé :

1. Menu contextuel "Save to Audit Table" dans SheetView
2. Dialog TablePersistDialog (qui n'existe plus dans le code mais est importé)
3. Workflow : clic droit → dialog de config → sauvegarde séparée

**Ce qui est demandé** : Édition inline directe comme Excel, pas de dialog de configuration.

**Fichiers actuels** :

- `h:/nod_n8n/src/web/components/attachment-data.tsx` : SheetView avec menu contextuel
- `h:/nod_n8n/src/web/lib/table-conversion.ts` : Détection types colonnes (157 lignes)
- `h:/nod_n8n/src/web/lib/api-audit-tables.ts` : Client API (99 lignes)
- `h:/nod_n8n/src/web/components/table-persist-dialog.tsx` : **MANQUANT** (importé mais inexistant)

---

## 🎯 Architecture Requise

### Comportement Utilisateur Final

```
┌─────────────────────────────────────────────────────┐
│ 1. Table s'affiche dans le chat                    │
│    (LLM génère, n8n envoie, ou CSV uploadé)        │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 2. Détection automatique                           │
│    - Vérifier si table existe en base (GET)        │
│    - Si oui : charger dernière version             │
│    - Si non : créer nouvelle entrée (POST)         │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 3. Affichage : chaque cellule = <input> éditable  │
│    - Double-clic → focus dans cellule              │
│    - onChange → debounced auto-save (2s)           │
│    - onBlur → save immédiat si pending             │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 4. Indicateurs visuels                             │
│    - "Saving..." (pendant requête)                 │
│    - "Saved ✓" (succès, disparaît après 2s)       │
│    - "Error ✗" (échec, reste visible)              │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 5. Boutons d'action                                │
│    - Save (manuel, force save immédiat)            │
│    - + Add Row (ajoute ligne vide)                 │
│    - Export CSV (télécharge CSV)                   │
│    - Delete Row (avec confirmation)                │
└─────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ 6. Restauration automatique                        │
│    - Fermer chat → localStorage + DB sauvegardent  │
│    - Rouvrir chat → table restaurée avec modifs    │
└─────────────────────────────────────────────────────┘
```

### Catégories d'Audit (Nouvelle Exigence)

Ajouter colonne `category` au schéma PostgreSQL :

```sql
ALTER TABLE audit_table_schemas
ADD COLUMN category text
CHECK (category IN ('accounting', 'compliance', 'risk', 'general'))
DEFAULT 'general';
```

**Utilisation** :

- 'accounting' : Comptabilité (invoices, expenses, balance sheets)
- 'compliance' : Conformité (checklists, certifications, policies)
- 'risk' : Gestion des risques (risk register, incident reports)
- 'general' : Général (autres tables d'audit)

---

## 🏗️ Plan d'Implémentation

### Phase 1 : Ajout Colonne Catégorie (30 min)

**Objectif** : Préparer le backend pour les catégories d'audit.

**Fichiers à modifier** :

1. **`h:/nod_n8n/src/server/db-audit-tables.ts`**
   - Ajouter migration SQL dans `initializeAuditTables()` :
     ```typescript
     ALTER TABLE audit_table_schemas
     ADD COLUMN IF NOT EXISTS category text
     CHECK (category IN ('accounting', 'compliance', 'risk', 'general'))
     DEFAULT 'general';
     ```
   - Ajouter `category` à l'interface `AuditTableSchema` :
     ```typescript
     export interface AuditTableSchema {
       // ... champs existants
       category: 'accounting' | 'compliance' | 'risk' | 'general';
     }
     ```
   - Ajouter paramètre `category` à `createTableSchema()` :
     ```typescript
     async function createTableSchema(
       client,
       { table_name, display_name, n8n_workflow_id, column_definitions, category = 'general' },
     ): Promise<AuditTableSchema>;
     ```

2. **`h:/nod_n8n/src/server/routes-audit-tables.ts`**
   - Ajouter validation Zod pour `category` dans POST `/api/audit/schemas` :
     ```typescript
     category: z.enum(['accounting', 'compliance', 'risk', 'general']).default('general');
     ```

**Vérification** :

```bash
# Lancer les tests backend
node h:/nod_n8n/test-persistence-direct.mjs

# Vérifier schéma PostgreSQL
docker exec nod-local-postgres-1 psql -U nod -d nod \
  -c "\d audit_table_schemas"
```

**Critère de succès** : 8/8 tests passent, colonne `category` existe dans PostgreSQL.

---

### Phase 2 : Composant EditableTable (6-8 heures)

**Objectif** : Créer un nouveau composant React pour l'édition inline.

#### 2.1 Créer EditableTable.tsx (3 heures)

**Fichier** : `h:/nod_n8n/src/web/components/editable-table.tsx`

**Structure du composant** :

```typescript
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { debounce } from 'lodash-es'; // ou utility Nod existante
import type { Sheet } from './attachment-data';
import { detectColumnMappings, convertSheetToAuditTable } from '../lib/table-conversion';
import { saveSheetToAuditTable, checkTableExists } from '../lib/api-audit-tables';

interface EditableTableProps {
  sheet: Sheet;
  artifactId: string;
  artifactName: string;
  category?: 'accounting' | 'compliance' | 'risk' | 'general';
}

export function EditableTable({
  sheet, artifactId, artifactName, category = 'general'
}: EditableTableProps) {
  // État
  const [tableId, setTableId] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Colonnes détectées
  const columnMappings = useMemo(() =>
    detectColumnMappings(sheet, true), [sheet]
  );

  // Restauration automatique (mount)
  useEffect(() => {
    async function restore() {
      try {
        // 1. Vérifier localStorage pour mapping artifact → tableId
        const stored = localStorage.getItem('nod-artifact-tables');
        const mappings = stored ? JSON.parse(stored) : {};
        const savedTableId = mappings[artifactId];

        if (savedTableId) {
          // 2. Charger depuis la base
          const response = await fetch(`/api/audit/schemas/${savedTableId}/data`, {
            credentials: 'include'
          });
          if (response.ok) {
            const { data } = await response.json();
            setTableId(savedTableId);
            setRows(data.map(d => d.row_data));
            setIsInitialized(true);
            return;
          }
        }

        // 3. Vérifier si table existe par nom
        const { exists, schemaId } = await checkTableExists(artifactName);
        if (exists && schemaId) {
          const response = await fetch(`/api/audit/schemas/${schemaId}/data`, {
            credentials: 'include'
          });
          if (response.ok) {
            const { data } = await response.json();
            setTableId(schemaId);
            setRows(data.map(d => d.row_data));
            // Mettre à jour localStorage
            localStorage.setItem('nod-artifact-tables', JSON.stringify({
              ...mappings,
              [artifactId]: schemaId
            }));
            setIsInitialized(true);
            return;
          }
        }

        // 4. Créer nouvelle table
        const converted = convertSheetToAuditTable(
          sheet, artifactName, true, columnMappings
        );
        const { schemaId } = await saveSheetToAuditTable({
          ...converted,
          category
        });
        setTableId(schemaId);
        setRows(converted.rows);
        localStorage.setItem('nod-artifact-tables', JSON.stringify({
          ...mappings,
          [artifactId]: schemaId
        }));
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to restore table:', error);
        setSaveStatus('error');
        setErrorMessage(error.message);
      }
    }
    restore();
  }, [artifactId, artifactName, sheet, columnMappings, category]);

  // Auto-save debounced (2 secondes)
  const saveData = useCallback(async (updatedRows: Record<string, unknown>[]) => {
    if (!tableId) return;

    setSaveStatus('saving');
    try {
      // Sauvegarder chaque ligne modifiée
      for (let i = 0; i < updatedRows.length; i++) {
        const row = updatedRows[i];
        const rowId = row._id; // Assuming row has _id from DB
        if (rowId) {
          await fetch(`/api/audit/data/${rowId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ row_data: row })
          });
        } else {
          // Nouvelle ligne
          await fetch(`/api/audit/schemas/${tableId}/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ row_data: row })
          });
        }
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setErrorMessage(error.message);
    }
  }, [tableId]);

  const debouncedSave = useMemo(
    () => debounce(saveData, 2000),
    [saveData]
  );

  // Handlers
  const handleCellChange = useCallback((rowIndex: number, columnName: string, value: string) => {
    setRows(prev => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [columnName]: value };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  const handleCellBlur = useCallback(() => {
    debouncedSave.flush(); // Force save immédiat
  }, [debouncedSave]);

  const handleAddRow = useCallback(() => {
    const newRow = columnMappings.reduce((acc, col) => {
      acc[col.name] = col.default_value ?? null;
      return acc;
    }, {} as Record<string, unknown>);
    setRows(prev => [...prev, newRow]);
  }, [columnMappings]);

  const handleDeleteRow = useCallback(async (rowIndex: number) => {
    if (!confirm('Delete this row?')) return;
    const row = rows[rowIndex];
    if (row._id) {
      try {
        await fetch(`/api/audit/data/${row._id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
      } catch (error) {
        console.error('Failed to delete row:', error);
      }
    }
    setRows(prev => prev.filter((_, i) => i !== rowIndex));
  }, [rows]);

  const handleExportCSV = useCallback(() => {
    const headers = columnMappings.map(col => col.label).join(',');
    const csvRows = rows.map(row =>
      columnMappings.map(col => JSON.stringify(row[col.name] ?? '')).join(',')
    );
    const csv = [headers, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifactName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, columnMappings, artifactName]);

  if (!isInitialized) {
    return <div className="editable-table-loading">Loading table...</div>;
  }

  return (
    <div className="editable-table">
      {/* Barre d'outils */}
      <div className="editable-table-toolbar">
        <button onClick={() => debouncedSave.flush()}>Save</button>
        <button onClick={handleAddRow}>+ Add Row</button>
        <button onClick={handleExportCSV}>Export CSV</button>
        {saveStatus !== 'idle' && (
          <span className={`save-status save-status-${saveStatus}`}>
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && 'Saved ✓'}
            {saveStatus === 'error' && `Error ✗ ${errorMessage}`}
          </span>
        )}
      </div>

      {/* Table éditable */}
      <div className="editable-table-scroll" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              {columnMappings.map((col, i) => (
                <th key={i}>{col.label}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td>{rowIndex + 1}</td>
                {columnMappings.map((col, colIndex) => (
                  <td key={colIndex}>
                    <input
                      type={col.type === 'number' ? 'number' : 'text'}
                      value={String(row[col.name] ?? '')}
                      onChange={(e) => handleCellChange(rowIndex, col.name, e.target.value)}
                      onBlur={handleCellBlur}
                      className="editable-cell"
                    />
                  </td>
                ))}
                <td>
                  <button onClick={() => handleDeleteRow(rowIndex)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Vérification** :

- Compiler TypeScript : `npx tsc --noEmit`
- Vérifier imports : tous les modules doivent exister

**Critère de succès** : Composant compile sans erreurs TypeScript.

---

#### 2.2 Ajouter Styles CSS (1 heure)

**Fichier** : `h:/nod_n8n/src/web/styles/editable-table.css` (ou dans fichier existant)

**Styles requis** :

```css
.editable-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--background);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.editable-table-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
}

.editable-table-toolbar button {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--button-background);
  cursor: pointer;
}

.editable-table-toolbar button:hover {
  background: var(--button-hover-background);
}

.save-status {
  margin-left: auto;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
}

.save-status-saving {
  color: var(--warning);
  background: var(--warning-background);
}

.save-status-saved {
  color: var(--success);
  background: var(--success-background);
}

.save-status-error {
  color: var(--error);
  background: var(--error-background);
}

.editable-table-scroll {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 4px;
}

.editable-table table {
  width: 100%;
  border-collapse: collapse;
}

.editable-table th,
.editable-table td {
  padding: 8px;
  border: 1px solid var(--border);
  text-align: left;
}

.editable-table th {
  background: var(--table-header-background);
  font-weight: 600;
}

.editable-cell {
  width: 100%;
  padding: 4px;
  border: 1px solid transparent;
  background: transparent;
  font-family: inherit;
  font-size: inherit;
}

.editable-cell:focus {
  outline: none;
  border: 1px solid var(--focus-border);
  background: var(--input-focus-background);
}

.editable-table-loading {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
}
```

**Vérification** :

- Importer le CSS dans le fichier principal (ex: `h:/nod_n8n/src/web/app.tsx`)
- Vérifier que les variables CSS (`--background`, etc.) existent déjà dans le thème Nod

**Critère de succès** : Table s'affiche correctement avec les styles appliqués.

---

#### 2.3 Intégrer dans attachment-data.tsx (2 heures)

**Fichier** : `h:/nod_n8n/src/web/components/attachment-data.tsx`

**Modifications** :

1. **Importer EditableTable** :

   ```typescript
   import { EditableTable } from './editable-table';
   ```

2. **Remplacer SheetView par EditableTable** :

   **Avant (lignes ~124-196)** :

   ```typescript
   function SheetView({ sheets, onDetail, artifactId, artifactName }) {
     // ... menu contextuel, dialog, etc.
     return <div className="artifact-sheet">...</div>;
   }
   ```

   **Après** :

   ```typescript
   function SheetView({ sheets, onDetail, artifactId, artifactName }) {
     const sheet = sheets[0]; // Prendre le premier onglet

     if (!artifactId || !artifactName) {
       // Cas où pas d'artifact (ex: table générée inline)
       // Garder l'ancien rendu read-only
       return <div className="artifact-sheet">{/* ancien code */}</div>;
     }

     return (
       <EditableTable
         sheet={sheet}
         artifactId={artifactId}
         artifactName={artifactName}
       />
     );
   }
   ```

3. **Supprimer le menu contextuel** (lignes où `ActionMenuSurface` est utilisé) :
   - Supprimer `menuState`, `handleContextMenu`, `closeMenu`, etc.
   - Supprimer l'import `TablePersistDialog` (qui n'existe plus)
   - Supprimer le portal avec `ActionMenuSurface`

4. **Supprimer le state localStorage** (maintenant dans EditableTable) :
   - Supprimer `savedSchemaId`, `setSavedSchemaId`
   - Supprimer `useEffect(() => { localStorage.getItem(...) }, [artifactId])`

**Vérification** :

```bash
# Compiler
npx tsc --noEmit

# Lancer le serveur dev
pnpm run dev
```

**Critère de succès** :

- Application compile sans erreurs
- Aucune erreur dans la console navigateur
- L'import manquant `TablePersistDialog` ne cause plus d'erreur

---

### Phase 3 : API Backend Améliorée (2 heures)

**Objectif** : Optimiser l'API pour l'édition inline.

#### 3.1 Endpoint Batch Update (1 heure)

**Fichier** : `h:/nod_n8n/src/server/routes-audit-tables.ts`

**Ajout** : Nouveau endpoint PATCH pour mise à jour de plusieurs lignes en une fois.

```typescript
app.patch<{ Params: { schemaId: string } }>(
  '/api/audit/schemas/:schemaId/data/batch',
  async (request, reply) => {
    try {
      const { schemaId } = z.object({ schemaId: z.uuid() }).parse(request.params);
      const body = z
        .object({
          updates: z.array(
            z.object({
              data_id: z.uuid(),
              row_data: z.record(z.unknown()),
            }),
          ),
        })
        .parse(request.body);

      const results = await transaction(async (client) => {
        const updated = [];
        for (const update of body.updates) {
          const result = await updateTableData(client, {
            data_id: update.data_id,
            row_data: update.row_data,
          });
          if (result) updated.push(result);
        }
        return updated;
      }, pool);

      return { data: results };
    } catch (error) {
      reply.code(500);
      return { error: 'Failed to batch update table data' };
    }
  },
);
```

**Vérification** :

```bash
# Tester avec curl
curl -X PATCH http://localhost:4310/api/audit/schemas/{schemaId}/data/batch \
  -H "Content-Type: application/json" \
  -H "Cookie: nod-access=..." \
  -d '{"updates":[{"data_id":"...","row_data":{"name":"John"}}]}'
```

**Critère de succès** : Endpoint retourne 200 avec les données mises à jour.

---

#### 3.2 Fonction Client Batch (30 min)

**Fichier** : `h:/nod_n8n/src/web/lib/api-audit-tables.ts`

**Ajout** :

```typescript
export async function batchUpdateTableData(
  schemaId: string,
  updates: Array<{ data_id: string; row_data: Record<string, unknown> }>,
): Promise<void> {
  const response = await fetch(`/api/audit/schemas/${schemaId}/data/batch`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ updates }),
  });

  if (!response.ok) {
    throw new Error('Failed to batch update data');
  }
}
```

**Vérification** :

- Compiler TypeScript : `npx tsc --noEmit`
- Utiliser dans EditableTable à la place des appels individuels

**Critère de succès** : Auto-save utilise batch update au lieu de multiples PUT.

---

#### 3.3 Optimiser EditableTable avec Batch (30 min)

**Fichier** : `h:/nod_n8n/src/web/components/editable-table.tsx`

**Modification** : Remplacer les appels individuels par batch.

**Avant** :

```typescript
for (let i = 0; i < updatedRows.length; i++) {
  await fetch(`/api/audit/data/${rowId}`, { method: 'PUT', ... });
}
```

**Après** :

```typescript
import { batchUpdateTableData } from '../lib/api-audit-tables';

const saveData = useCallback(
  async (updatedRows: Record<string, unknown>[]) => {
    if (!tableId) return;

    setSaveStatus('saving');
    try {
      const updates = updatedRows
        .filter((row) => row._id) // Seulement les lignes existantes
        .map((row) => ({ data_id: row._id, row_data: row }));

      if (updates.length > 0) {
        await batchUpdateTableData(tableId, updates);
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setErrorMessage(error.message);
    }
  },
  [tableId],
);
```

**Vérification** :

- Éditer plusieurs cellules rapidement
- Vérifier dans l'onglet Network : une seule requête PATCH

**Critère de succès** : Auto-save fait 1 requête au lieu de N requêtes.

---

### Phase 4 : Gestion des Catégories dans UI (2 heures)

**Objectif** : Permettre à l'utilisateur de choisir la catégorie lors de la première création.

#### 4.1 Ajouter Sélecteur de Catégorie (1 heure)

**Fichier** : `h:/nod_n8n/src/web/components/editable-table.tsx`

**Modification** : Ajouter un dropdown pour choisir la catégorie si c'est une nouvelle table.

```typescript
const [category, setCategory] = useState<'accounting' | 'compliance' | 'risk' | 'general'>('general');
const [showCategorySelect, setShowCategorySelect] = useState(false);

// Dans useEffect restore :
if (!exists && !schemaId) {
  // Nouvelle table
  setShowCategorySelect(true);
}

// Dans le render :
{showCategorySelect && (
  <div className="category-selector">
    <label>Table Category:</label>
    <select value={category} onChange={(e) => setCategory(e.target.value)}>
      <option value="general">General</option>
      <option value="accounting">Accounting</option>
      <option value="compliance">Compliance</option>
      <option value="risk">Risk Management</option>
    </select>
  </div>
)}
```

**Vérification** :

- Créer une nouvelle table depuis un CSV
- Vérifier que le dropdown apparaît
- Sélectionner "Accounting"
- Vérifier dans PostgreSQL : `SELECT category FROM audit_table_schemas`

**Critère de succès** : Catégorie est sauvegardée correctement en base.

---

#### 4.2 Afficher la Catégorie (30 min)

**Fichier** : `h:/nod_n8n/src/web/components/editable-table.tsx`

**Ajout** : Badge visuel pour la catégorie dans la barre d'outils.

```typescript
<div className="editable-table-toolbar">
  <span className={`category-badge category-${category}`}>
    {category === 'accounting' && '💰 Accounting'}
    {category === 'compliance' && '✓ Compliance'}
    {category === 'risk' && '⚠️ Risk'}
    {category === 'general' && '📊 General'}
  </span>
  {/* ... boutons existants */}
</div>
```

**CSS** :

```css
.category-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.category-accounting {
  background: #e6f7ff;
  color: #0050b3;
}
.category-compliance {
  background: #f6ffed;
  color: #389e0d;
}
.category-risk {
  background: #fff7e6;
  color: #d46b08;
}
.category-general {
  background: #f0f0f0;
  color: #595959;
}
```

**Vérification** :

- Ouvrir une table existante
- Vérifier que le badge de catégorie s'affiche

**Critère de succès** : Badge visible avec bon style et icône.

---

### Phase 5 : Migration et Cleanup (1 heure)

**Objectif** : Supprimer le code obsolète et nettoyer.

#### 5.1 Supprimer Fichiers Obsolètes (15 min)

**Actions** :

1. Supprimer l'import manquant :
   - Dans `h:/nod_n8n/src/web/components/attachment-data.tsx` : supprimer `import { TablePersistDialog } from './table-persist-dialog';`

2. Vérifier qu'aucun autre fichier n'importe TablePersistDialog :

   ```bash
   grep -r "TablePersistDialog" h:/nod_n8n/src/web/
   ```

3. Si d'autres imports existent, les supprimer également.

**Vérification** :

```bash
npx tsc --noEmit
```

**Critère de succès** : Pas d'erreurs de module non trouvé.

---

#### 5.2 Nettoyer attachment-data.tsx (30 min)

**Fichier** : `h:/nod_n8n/src/web/components/attachment-data.tsx`

**Suppressions** :

1. **Menu contextuel** (lignes ~250-280) :
   - `menuState`, `setMenuState`
   - `handleContextMenu`
   - `closeMenu`
   - `useEffect` pour click-outside
   - Portal avec `ActionMenuSurface`

2. **Dialog state** (lignes ~230) :
   - `persistDialogOpen`, `setPersistDialogOpen`
   - `handleSaveTable`
   - `handleTableSaved`

3. **localStorage direct** (lignes ~160-175) :
   - `savedSchemaId`, `setSavedSchemaId`
   - `useEffect(() => { localStorage.getItem('nod-artifact-tables') }, [artifactId])`

**Garder** :

- Type `Sheet` export (ligne 48)
- Fonction `SheetView` avec EditableTable intégré
- Tous les autres composants (ArchiveView, MarkdownView, etc.)

**Vérification** :

```bash
# Compiler
npx tsc --noEmit

# Vérifier que attachment-data.tsx compile
pnpm run dev
```

**Critère de succès** : Fichier réduit de ~150 lignes, pas d'erreurs.

---

#### 5.3 Mettre à Jour la Documentation (15 min)

**Fichiers** :

1. **`h:/nod_n8n/Doc systeme de persistance/MEMO-PROGRESSIF-TACHE.md`**
   - Ajouter section "Phase 3 : Édition Inline (Version finale)"
   - Expliquer le pivot du dialog vers inline

2. **Nouveau fichier** : `h:/nod_n8n/Doc systeme de persistance/GUIDE-EDITION-INLINE.md`
   - Expliquer comment utiliser EditableTable
   - Exemples d'utilisation
   - Architecture du composant

**Vérification** :

- Relire les docs
- Vérifier que les chemins de fichiers sont corrects

**Critère de succès** : Documentation à jour et complète.

---

## 📝 Récapitulatif des Fichiers

### Fichiers à Créer

| Fichier                                              | Lignes | Rôle                           |
| ---------------------------------------------------- | ------ | ------------------------------ |
| `src/web/components/editable-table.tsx`              | ~350   | Composant React édition inline |
| `src/web/styles/editable-table.css`                  | ~120   | Styles pour EditableTable      |
| `Doc systeme de persistance/GUIDE-EDITION-INLINE.md` | ~100   | Documentation utilisateur      |

### Fichiers à Modifier

| Fichier                                               | Lignes Modifiées | Changements                                        |
| ----------------------------------------------------- | ---------------- | -------------------------------------------------- |
| `src/server/db-audit-tables.ts`                       | ~20              | Ajout `category` interface + migration SQL         |
| `src/server/routes-audit-tables.ts`                   | ~40              | Endpoint PATCH batch + validation category         |
| `src/web/lib/api-audit-tables.ts`                     | ~20              | Fonction `batchUpdateTableData()`                  |
| `src/web/components/attachment-data.tsx`              | ~150             | Intégration EditableTable, suppression menu/dialog |
| `Doc systeme de persistance/MEMO-PROGRESSIF-TACHE.md` | ~50              | Ajout Phase 3                                      |

### Fichiers à Supprimer

| Fichier | Raison                                                             |
| ------- | ------------------------------------------------------------------ |
| Aucun   | TablePersistDialog n'existe déjà plus (juste l'import à supprimer) |

---

## 🧪 Plan de Tests

### Tests Backend (Phase 1)

**Fichier** : `h:/nod_n8n/test-persistence-direct.mjs`

**Ajouts** :

```javascript
// Test 9 : Créer table avec catégorie
console.log('[9/9] Test de catégorie');
const schemaWithCategory = await client.query(
  `INSERT INTO audit_table_schemas 
   (owner_id, table_name, display_name, column_definitions, category)
   VALUES ($1, $2, $3, $4, $5) RETURNING *`,
  ['user_001', 'test_accounting', 'Accounting Table', JSON.stringify([]), 'accounting'],
);
console.log('✓ Table avec catégorie créée:', schemaWithCategory.rows[0].category);
```

**Commande** :

```bash
node h:/nod_n8n/test-persistence-direct.mjs
```

**Critère de succès** : 9/9 tests passent.

---

### Tests Frontend (Phases 2-4)

**Tests manuels à effectuer** :

#### Test 1 : Nouvelle Table depuis CSV

1. Uploader un CSV dans le chat
2. Vérifier que EditableTable s'affiche (pas SheetView ancien)
3. Vérifier que le sélecteur de catégorie apparaît
4. Choisir "Accounting"
5. Double-cliquer sur une cellule
6. Éditer la valeur
7. Attendre 2 secondes
8. Vérifier indicateur "Saved ✓"
9. Rafraîchir la page
10. Vérifier que la modification est persistée

**Critère de succès** : Toutes les étapes fonctionnent.

#### Test 2 : Table Existante

1. Ouvrir le chat avec une table déjà sauvegardée
2. Vérifier que EditableTable charge les données depuis la DB
3. Vérifier que le badge de catégorie s'affiche
4. Éditer une cellule
5. Cliquer "Save" manuellement
6. Vérifier sauvegarde immédiate

**Critère de succès** : Restauration et sauvegarde fonctionnent.

#### Test 3 : Ajout de Ligne

1. Cliquer "+ Add Row"
2. Vérifier qu'une ligne vide apparaît
3. Remplir la nouvelle ligne
4. Attendre auto-save
5. Rafraîchir la page
6. Vérifier que la nouvelle ligne existe

**Critère de succès** : Ajout de ligne persiste.

#### Test 4 : Suppression de Ligne

1. Cliquer "Delete" sur une ligne
2. Confirmer
3. Vérifier que la ligne disparaît
4. Rafraîchir la page
5. Vérifier que la ligne ne réapparaît pas

**Critère de succès** : Suppression persiste (soft delete).

#### Test 5 : Export CSV

1. Cliquer "Export CSV"
2. Vérifier que le fichier CSV se télécharge
3. Ouvrir le CSV dans Excel
4. Vérifier que les données sont correctes

**Critère de succès** : Export fonctionne.

#### Test 6 : Batch Auto-Save

1. Éditer 10 cellules rapidement (< 2 secondes entre chaque)
2. Attendre 2 secondes
3. Ouvrir l'onglet Network du navigateur
4. Vérifier qu'il n'y a qu'une seule requête PATCH batch

**Critère de succès** : Une seule requête pour multiples éditions.

---

### Tests d'Accessibilité (Phase 2)

**Vérifications WCAG** :

- [ ] Navigation clavier (Tab, Shift+Tab)
- [ ] Focus visible sur les cellules input
- [ ] Labels aria pour la table
- [ ] Annonce screen reader pour "Saving..." / "Saved ✓"
- [ ] Contraste des couleurs (badges de catégorie)
- [ ] Boutons avec labels explicites

**Commande** :

```bash
# Utiliser axe DevTools dans Chrome
# Ou Lighthouse audit
npx lighthouse http://localhost:4310 --only-categories=accessibility
```

**Critère de succès** : Score d'accessibilité > 90.

---

## 🚀 Stratégie de Déploiement

### Ordre d'Exécution

1. **Phase 1 : Backend** (30 min)
   - Modifier DB schema
   - Tester avec test-persistence-direct.mjs
   - ✅ Bloquer si tests échouent

2. **Phase 2 : Composant** (6-8 heures)
   - Créer EditableTable.tsx
   - Ajouter CSS
   - Intégrer dans attachment-data.tsx
   - ✅ Bloquer si compilation échoue

3. **Phase 3 : API Batch** (2 heures)
   - Ajouter endpoint PATCH batch
   - Ajouter fonction client
   - Optimiser EditableTable
   - ✅ Bloquer si endpoint retourne 500

4. **Phase 4 : Catégories UI** (2 heures)
   - Ajouter sélecteur
   - Ajouter badge
   - Tester manuellement

5. **Phase 5 : Cleanup** (1 heure)
   - Supprimer imports obsolètes
   - Nettoyer attachment-data.tsx
   - Mettre à jour docs

### Points de Validation

**Après Phase 1** :

```bash
node test-persistence-direct.mjs
# Doit afficher : 9/9 tests passés
```

**Après Phase 2** :

```bash
npx tsc --noEmit
pnpm run dev
# Doit compiler sans erreurs
# Navigateur ne doit pas afficher d'erreurs console
```

**Après Phase 3** :

```bash
curl -X PATCH http://localhost:4310/api/audit/schemas/{id}/data/batch \
  -H "Content-Type: application/json" \
  -H "Cookie: nod-access=..." \
  -d '{"updates":[...]}'
# Doit retourner 200
```

**Après Phase 4** :

- Tests manuels 1-6 doivent tous passer

**Après Phase 5** :

```bash
npx tsc --noEmit
pnpm run dev
# Pas d'erreurs, pas d'imports manquants
```

---

## 🔍 Digest : Fichiers Lus et Vérifiés

### Backend (Lus et Validés)

**`h:/nod_n8n/src/server/db-audit-tables.ts`** (460 lignes)

- Bloc à modifier : `initializeAuditTables()` (lignes 5-68) → Ajouter migration `category`
- Bloc à modifier : Interface `AuditTableSchema` (lignes 70-80) → Ajouter `category: string`
- Bloc à modifier : `createTableSchema()` (lignes 94-120) → Ajouter paramètre `category`
- Tests existants : `test-persistence-direct.mjs` (8/8 passés)
- Commande de test : `node test-persistence-direct.mjs`

**`h:/nod_n8n/src/server/routes-audit-tables.ts`** (232 lignes)

- Bloc à ajouter : Endpoint PATCH `/api/audit/schemas/:schemaId/data/batch` (après ligne 175)
- Bloc à modifier : POST `/api/audit/schemas` validation (lignes 50-58) → Ajouter `category: z.enum(...)`
- Tests : Aucun test unitaire, tests manuels avec curl
- Commande de build : `pnpm run dev` (TypeScript compilé à la volée)

### Frontend (Lus et Validés)

**`h:/nod_n8n/src/web/components/attachment-data.tsx`** (700 lignes)

- Bloc à modifier : Fonction `SheetView` (lignes 124-196) → Remplacer par appel à EditableTable
- Bloc à supprimer : Menu contextuel (lignes ~250-280) → Supprimer state et handlers
- Bloc à supprimer : Import `TablePersistDialog` (ligne 36) → N'existe plus
- Tests : Compilation TypeScript + tests manuels
- Commande de vérification : `npx tsc --noEmit`

**`h:/nod_n8n/src/web/lib/table-conversion.ts`** (157 lignes)

- Bloc réutilisé : `detectColumnMappings()` (lignes 45-80) → Déjà fonctionnel
- Bloc réutilisé : `convertSheetToAuditTable()` (lignes 120-157) → Déjà fonctionnel
- Pas de modification nécessaire
- Tests : Utilisé par EditableTable, validation par tests manuels

**`h:/nod_n8n/src/web/lib/api-audit-tables.ts`** (99 lignes)

- Bloc à ajouter : `batchUpdateTableData()` (après ligne 99) → Nouvelle fonction
- Bloc réutilisé : `saveSheetToAuditTable()` (lignes 19-60) → Déjà fonctionnel
- Bloc réutilisé : `checkTableExists()` (lignes 62-75) → Déjà fonctionnel
- Tests : Appels API testés manuellement via EditableTable

### Documentation (Lue)

**`h:/nod_n8n/Doc systeme de persistance/MEMO-PROGRESSIF-TACHE.md`** (1000+ lignes)

- Contenu : Historique complet du projet (Phases 1 et 2)
- Contexte : Workflow wf_114664d5e1054fd6 a créé menu contextuel + dialog (non conforme)
- Pivot : User a demandé édition inline, pas de dialog séparé
- Action : Ajouter Phase 3 dans ce document

### Build et Tests

**Build system** : Vite + TypeScript

- Commande dev : `pnpm run dev` (hot reload automatique)
- Commande build : `pnpm run build` (production, non nécessaire pour dev)
- Commande vérification : `npx tsc --noEmit` (rapide, sans build complet)

**Test framework** : Tests backend uniquement

- Fichier : `test-persistence-direct.mjs`
- Commande : `node test-persistence-direct.mjs`
- Résultats attendus : 9/9 tests passés (8 actuels + 1 nouveau pour category)

**Pas de tests frontend automatisés** : Validation manuelle + workflow review

---

## ⚠️ Risques et Mitigations

### Risque 1 : Performance avec Tables Larges

**Problème** : 1000 lignes × 50 colonnes = 50 000 inputs DOM → Navigateur lent.

**Mitigation** :

- Virtualisation (windowing) avec `react-window` ou `react-virtual`
- Afficher seulement 50 lignes visibles à la fois
- Charger le reste on-demand (scroll infini)

**Plan B** : Limiter à 200 lignes affichées (comme SheetView actuel).

---

### Risque 2 : Conflits de Sauvegarde

**Problème** : User édite cellule A → debounce 2s → User édite cellule B → 2 requêtes batch en parallèle.

**Mitigation** :

- Annuler le debounce précédent quand nouveau change arrive
- Utiliser un seul debounce partagé pour toute la table
- **Solution implémentée** : `debouncedSave.cancel()` avant nouveau `debouncedSave()`

---

### Risque 3 : Perte de Données (Crash Navigateur)

**Problème** : User édite beaucoup → crash avant auto-save.

**Mitigation** :

- **localStorage backup** : Sauvegarder brouillon dans localStorage toutes les 500ms
- Au mount, vérifier si brouillon existe → proposer "Restore unsaved changes?"
- Plan B : Réduire debounce à 1 seconde (compromis UX/perf)

---

### Risque 4 : Authentification Expired

**Problème** : User édite pendant 30 min → cookie expire → 401 lors de save.

**Mitigation** :

- Détecter 401 dans fetch
- Afficher modal "Session expired, please refresh"
- Sauvegarder brouillon dans localStorage avant refresh
- **Code** :
  ```typescript
  if (response.status === 401) {
    localStorage.setItem(`nod-draft-${tableId}`, JSON.stringify(rows));
    alert('Session expired. Your changes are saved locally. Please refresh.');
  }
  ```

---

### Risque 5 : Import TablePersistDialog Manquant

**Problème** : `attachment-data.tsx` importe un fichier qui n'existe plus → erreur de compilation.

**Mitigation** :

- **Phase 5.1** supprime cet import immédiatement
- Vérifier avec `grep` qu'aucun autre fichier n'importe TablePersistDialog
- Si erreur persiste, commentez l'import temporairement jusqu'à Phase 5

---

## 📊 Estimation Temps Total

| Phase                             | Durée Estimée   | Durée Max       |
| --------------------------------- | --------------- | --------------- |
| Phase 1 : Backend Catégorie       | 30 min          | 1 heure         |
| Phase 2 : Composant EditableTable | 6 heures        | 8 heures        |
| Phase 3 : API Batch               | 2 heures        | 3 heures        |
| Phase 4 : Catégories UI           | 2 heures        | 3 heures        |
| Phase 5 : Cleanup                 | 1 heure         | 1.5 heures      |
| **Total**                         | **11.5 heures** | **16.5 heures** |

**Temps réel probable** : 14 heures (avec tests et débogage).

---

## 🎯 Critères de Succès Finaux

### Fonctionnel

- [x] Table s'affiche dans le chat
- [x] Cellules éditables inline (double-clic)
- [x] Auto-save après 2 secondes d'inactivité
- [x] Indicateur "Saving..." → "Saved ✓"
- [x] Bouton "Save" manuel fonctionne
- [x] Bouton "+ Add Row" ajoute une ligne vide
- [x] Bouton "Export CSV" télécharge le CSV
- [x] Bouton "Delete Row" supprime avec confirmation
- [x] Restauration automatique après fermeture/ouverture chat
- [x] Catégories d'audit sélectionnables
- [x] Badge de catégorie visible

### Technique

- [x] Backend : 9/9 tests passent
- [x] Frontend : Compilation TypeScript sans erreurs
- [x] API : Endpoint batch retourne 200
- [x] Performance : Auto-save utilise batch (1 requête, pas N)
- [x] Accessibilité : Score > 90
- [x] Documentation : MEMO et GUIDE à jour

### UX

- [x] Pas de dialog de configuration (édition directe)
- [x] Indicateurs visuels clairs
- [x] Navigation clavier fluide
- [x] Pas de perte de données (localStorage backup)
- [x] Gestion d'erreur explicite (messages clairs)

---

## 📞 Support et Questions

**Problème rencontré ?** Vérifier dans l'ordre :

1. **Erreur de compilation TypeScript** :

   ```bash
   npx tsc --noEmit
   ```

   → Lire l'erreur, corriger les imports/types

2. **Erreur 401 Unauthorized** :
   → Vérifier que `credentials: 'include'` est dans tous les fetch()

3. **Table ne se restaure pas** :
   → Vérifier localStorage : `localStorage.getItem('nod-artifact-tables')`
   → Vérifier PostgreSQL : `SELECT * FROM audit_table_schemas`

4. **Auto-save ne fonctionne pas** :
   → Ouvrir l'onglet Network, vérifier que PATCH batch est envoyé
   → Vérifier la console pour erreurs JavaScript

5. **Tests backend échouent** :
   → Vérifier que Docker PostgreSQL est lancé : `docker ps`
   → Vérifier connexion : `docker exec nod-local-postgres-1 psql -U nod -d nod -c "SELECT 1"`

---

## 🏁 Prochaines Étapes (Hors Scope)

Fonctionnalités futures (ne PAS implémenter maintenant) :

- [ ] Filtres et tris sur colonnes
- [ ] Recherche dans la table
- [ ] Formules calculées (comme Excel)
- [ ] Graphiques et visualisations
- [ ] Collaboration temps réel (plusieurs users)
- [ ] Commentaires sur cellules
- [ ] Historique complet avec diff visuel
- [ ] Import/Export Excel multi-onglets
- [ ] API publique pour intégrations tierces
- [ ] Page dédiée "Audit Tables" (abandonné pour inline)

---

**FIN DU PLAN**

Ce plan détaille l'architecture complète pour transformer le système actuel (menu contextuel + dialog) en édition inline style Excel avec auto-sauvegarde. Le backend existant est conservé et amélioré, le frontend est refondu autour du composant EditableTable.
