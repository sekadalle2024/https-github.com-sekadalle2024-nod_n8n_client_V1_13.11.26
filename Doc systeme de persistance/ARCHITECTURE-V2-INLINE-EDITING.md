# Architecture v2 : Tables d'Audit avec Édition Inline

## 📋 Vue d'Ensemble

**Date** : 2026-11-12  
**Version** : 2.0 (correction de la v1 incorrecte)  
**Objectif** : Tables d'audit éditables inline directement dans le chat (comme Excel)

---

## ❌ Problème avec la v1

### Ce qui a été implémenté (INCORRECT)

- Menu contextuel "Save to Audit Table" sur les tables du chat
- Dialog de configuration séparé (table-persist-dialog.tsx)
- Page dédiée `/audit-tables` (audit-tables.tsx)
- Interface d'édition séparée du chat

### Pourquoi c'était incorrect

1. **Utilisateur ne veut pas d'interface séparée** : les tables doivent être éditables directement dans le chat
2. **Pas d'expérience Excel** : pas d'édition inline fluide
3. **Trop de clics** : Save to Audit Table → Configure → Edit → revenir au chat
4. **Workflow brisé** : l'utilisateur perd le contexte en changeant de page

---

## ✅ Architecture v2 Correcte

### Principe Fondamental

**"Les tables générées dans le chat restent dans le chat et sont éditables inline comme Excel"**

### Cas d'Usage Principaux

#### 1. Audit Comptabilité

```
Utilisateur: "Analyse ces transactions bancaires pour l'audit"
LLM: [Génère table avec colonnes: Date, Description, Montant, Catégorie]
Utilisateur: [Double-clic sur cellule Montant] → Modifie 125.00 → 135.00
Système: Auto-save après 2s → Nouvelle version créée
```

#### 2. Audit Conformité

```
Utilisateur: [Upload CSV des processus]
Système: [Affiche table éditable]
Utilisateur: [Ajoute colonne "Risque Identifié"] → Édite chaque cellule
Utilisateur: [Clic "Save"] → Sauvegarde manuelle
```

#### 3. Audit via n8n

```
Workflow n8n: Extrait données SAP → Retourne JSON
Chat Nod: Affiche table éditable avec les données n8n
Utilisateur: [Ajoute lignes d'anomalies détectées] → Auto-save
```

---

## 🏗️ Architecture Technique

### Composants Frontend

#### 1. EditableAuditTable (NOUVEAU)

**Fichier** : `src/web/components/editable-audit-table.tsx`

**Responsabilités** :

- Rendre une table éditable inline (toutes les cellules)
- Gérer l'état local des modifications
- Auto-save débounced (2s après dernière modification)
- Afficher les boutons d'action
- Gérer les catégories d'audit

**Props** :

```typescript
interface EditableAuditTableProps {
  initialData: TableData; // Données initiales
  tableName: string; // Nom de la table
  category: AuditCategory; // Catégorie d'audit
  onSave?: (data: TableData) => void;
  onDelete?: () => void;
}

type AuditCategory =
  | 'accounting' // Comptabilité
  | 'compliance' // Conformité
  | 'risk' // Risques
  | 'general'; // Général
```

**État interne** :

```typescript
const [data, setData] = useState(initialData);
const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
const [tableId, setTableId] = useState<number | null>(null);
const [isDirty, setIsDirty] = useState(false);
```

**Méthodes principales** :

```typescript
// Édition de cellule
const handleCellChange = (rowIdx: number, colName: string, value: any) => {
  setData((prev) => updateCell(prev, rowIdx, colName, value));
  setIsDirty(true);
  debouncedAutoSave();
};

// Auto-save débounced
const debouncedAutoSave = useMemo(
  () =>
    debounce(async () => {
      if (!isDirty) return;
      await saveToBackend();
    }, 2000),
  [isDirty, data],
);

// Sauvegarde manuelle
const handleManualSave = async () => {
  await saveToBackend();
};

// Ajout de ligne
const handleAddRow = () => {
  setData((prev) => [...prev, createEmptyRow()]);
  setIsDirty(true);
};

// Suppression de ligne
const handleDeleteRow = (rowIdx: number) => {
  setData((prev) => prev.filter((_, i) => i !== rowIdx));
  setIsDirty(true);
  debouncedAutoSave();
};
```

#### 2. Modification de attachment-data.tsx

**Fichier** : `src/web/components/attachment-data.tsx`

**Changements** :

```typescript
// AVANT (v1)
export function SheetView({ sheet }: { sheet: Sheet }) {
  return <table>...</table>; // Table non-éditable
}

// APRÈS (v2)
export function SheetView({ sheet, messageId }: { sheet: Sheet; messageId: string }) {
  const [isAuditTable, setIsAuditTable] = useState(false);

  useEffect(() => {
    // Vérifier si cette table existe déjà en base
    checkIfAuditTable(sheet.name).then(setIsAuditTable);
  }, [sheet.name]);

  if (isAuditTable) {
    return <EditableAuditTable
      initialData={sheet.data}
      tableName={sheet.name}
      category="general"
    />;
  }

  // Sinon, proposer de la rendre éditable
  return (
    <>
      <table>...{sheet.data}...</table>
      <button onClick={() => convertToAuditTable(sheet)}>
        Make Editable
      </button>
    </>
  );
}
```

#### 3. UI des Cellules Éditables

```tsx
// Chaque cellule est un input
function EditableCell({ value, onChange, type }) {
  return (
    <td>
      <input
        type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => triggerAutoSave()}
        className="w-full border-none bg-transparent focus:bg-blue-50"
      />
    </td>
  );
}
```

#### 4. Barre d'Actions

```tsx
<div className="flex items-center gap-2 mt-2 p-2 border-t">
  {/* Status indicator */}
  {saveStatus === 'saving' && <span className="text-sm text-gray-500">💾 Saving...</span>}
  {saveStatus === 'saved' && <span className="text-sm text-green-600">✓ Saved</span>}

  {/* Actions */}
  <button onClick={handleManualSave} disabled={!isDirty}>
    💾 Save
  </button>
  <button onClick={handleAddRow}>+ Add Row</button>
  <button onClick={handleExportCSV}>📥 Export CSV</button>
  <button onClick={handleDeleteTable} className="text-red-600">
    🗑️ Delete
  </button>

  {/* Category badge */}
  <span className="ml-auto text-xs px-2 py-1 bg-blue-100 rounded">{categoryLabel[category]}</span>
</div>
```

---

### Backend (Existant - Réutilisé)

#### API Endpoints (11 endpoints)

**Fichier** : `src/server/routes-audit-tables.ts`

Tous les endpoints existants sont réutilisés :

- `GET /api/audit/schemas` - Liste toutes les tables
- `POST /api/audit/schemas` - Créer une table
- `GET /api/audit/data/:id` - Obtenir les données
- `POST /api/audit/data/:id` - Sauvegarder (nouvelle version)
- etc.

#### Ajouts Nécessaires

##### 1. Endpoint par nom

```typescript
// GET /api/audit/schemas/by-name/:name
app.get('/api/audit/schemas/by-name/:name', async (req, reply) => {
  const { name } = req.params;
  const ownerThreadId = req.user.ownerThreadId;

  const schema = await findSchemaByName(ownerThreadId, name);
  if (!schema) {
    return reply.code(404).send({ error: 'Table not found' });
  }

  return reply.send(schema);
});
```

##### 2. Colonne category

```typescript
// Migration SQL
ALTER TABLE audit_table_schemas
ADD COLUMN category VARCHAR(50) DEFAULT 'general';

// Types
type AuditCategory = 'accounting' | 'compliance' | 'risk' | 'general';

interface AuditTableSchema {
  id: number;
  owner_id: string;
  name: string;
  category: AuditCategory;  // NOUVEAU
  columns: ColumnDefinition[];
  created_at: Date;
  // ...
}
```

##### 3. Fonction findSchemaByName

```typescript
// src/server/db-audit-tables.ts
export async function findSchemaByName(
  ownerThreadId: string,
  name: string,
): Promise<AuditTableSchema | null> {
  const result = await sql<AuditTableSchema>`
    SELECT *
    FROM audit_table_schemas
    WHERE owner_id = ${ownerThreadId}
      AND name = ${name}
      AND deleted = false
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return result.length > 0 ? result[0] : null;
}
```

---

## 🔄 Flux de Données

### 1. Chargement Initial

```
1. Table affichée dans le chat (SheetView)
   ↓
2. useEffect: checkIfAuditTable(sheet.name)
   ↓
3. GET /api/audit/schemas/by-name/{name}
   ↓
4. Si existe: Charger EditableAuditTable avec données base
5. Si n'existe pas: Afficher bouton "Make Editable"
```

### 2. Conversion en Table Éditable

```
1. Utilisateur clique "Make Editable"
   ↓
2. POST /api/audit/schemas
   {
     name: sheet.name,
     category: 'general',
     columns: detectColumnTypes(sheet.data)
   }
   ↓
3. POST /api/audit/data/{id}
   {
     rows: sheet.data
   }
   ↓
4. Remplacer SheetView par EditableAuditTable
```

### 3. Édition de Cellule

```
1. Double-clic sur cellule → <input> focus
   ↓
2. Utilisateur modifie valeur
   ↓
3. onChange: setData(...) + setIsDirty(true)
   ↓
4. debouncedAutoSave() déclenché (2s)
   ↓
5. POST /api/audit/data/{id} (nouvelle version)
   ↓
6. setSaveStatus('saved')
   ↓
7. Indicateur "Saved ✓" affiché 2s
```

### 4. Ajout de Ligne

```
1. Clic "+ Add Row"
   ↓
2. setData([...data, emptyRow])
   ↓
3. debouncedAutoSave() (2s)
   ↓
4. POST /api/audit/data/{id}
```

### 5. Sauvegarde Manuelle

```
1. Clic "Save"
   ↓
2. Annuler le debounce en cours
   ↓
3. POST /api/audit/data/{id} immédiatement
   ↓
4. setSaveStatus('saved')
```

---

## 🎨 Expérience Utilisateur

### États Visuels

#### 1. Cellule Normale

```
┌─────────────┐
│ 125.00      │  ← Valeur affichée
└─────────────┘
```

#### 2. Cellule en Édition (focus)

```
┌─────────────┐
│ █25.00      │  ← Curseur visible, fond bleu clair
└─────────────┘
```

#### 3. Cellule Modifiée (non sauvegardée)

```
┌─────────────┐
│ 135.00  •   │  ← Point orange = dirty
└─────────────┘
```

#### 4. Indicateurs de Sauvegarde

```
💾 Saving...     ← Pendant l'auto-save
✓ Saved          ← Pendant 2s après succès
❌ Error         ← Si échec réseau
```

### Boutons d'Action

```
┌─────────────────────────────────────────────────┐
│  💾 Save  │  + Add Row  │  📥 Export  │  🗑️ Delete │
└─────────────────────────────────────────────────┘
                                       [Comptabilité]
```

### Menu Contextuel (Optionnel)

Clic droit sur une ligne :

```
┌──────────────────┐
│ 📋 Copy Row      │
│ ➕ Insert Above  │
│ ➕ Insert Below  │
│ 🗑️ Delete Row    │
│ ──────────────── │
│ 📜 View History  │
└──────────────────┘
```

---

## 📊 Gestion des Versions

### Création de Version

Chaque sauvegarde crée une nouvelle version :

```typescript
// Version 1 : Création initiale
{
  version: 1,
  created_at: '2026-11-12T10:00:00Z',
  row_count: 10,
  changes: null
}

// Version 2 : Modification cellule + ajout ligne
{
  version: 2,
  created_at: '2026-11-12T10:05:30Z',
  row_count: 11,
  changes: {
    modified: [{ row: 3, column: 'Montant', old: 125.00, new: 135.00 }],
    added: [{ row: 11, data: {...} }]
  }
}

// Version 3 : Suppression ligne
{
  version: 3,
  created_at: '2026-11-12T10:10:15Z',
  row_count: 10,
  changes: {
    deleted: [{ row: 7 }]
  }
}
```

### Affichage de l'Historique

Clic sur "View History" :

```
┌────────────────────────────────────────┐
│  Version 3  (Current)  10:10:15        │
│  • Deleted row 7                       │
│                                        │
│  Version 2            10:05:30         │
│  • Modified Montant: 125.00 → 135.00  │
│  • Added 1 row                         │
│                                        │
│  Version 1  (Initial)  10:00:00        │
│  • Created with 10 rows                │
└────────────────────────────────────────┘
```

### Restauration

```
1. Clic "Restore Version 2"
   ↓
2. POST /api/audit/restore/{id}/2
   ↓
3. Crée Version 4 = copie de Version 2
   ↓
4. Recharge la table avec données V2
```

---

## 🎯 Catégories d'Audit

### Prédéfinies

| Catégorie        | Slug         | Couleur  | Icône |
| ---------------- | ------------ | -------- | ----- |
| **Comptabilité** | `accounting` | 🟦 Bleu  | 💰    |
| **Conformité**   | `compliance` | 🟩 Vert  | ✓     |
| **Risques**      | `risk`       | 🟥 Rouge | ⚠️    |
| **Général**      | `general`    | ⬜ Gris  | 📋    |

### Utilisation

```typescript
// Détection automatique par mots-clés
function detectCategory(tableName: string, columns: string[]): AuditCategory {
  const name = tableName.toLowerCase();
  const cols = columns.map((c) => c.toLowerCase()).join(' ');

  if (name.includes('compta') || cols.includes('montant')) return 'accounting';
  if (name.includes('conformité') || cols.includes('norme')) return 'compliance';
  if (name.includes('risque') || cols.includes('probabilité')) return 'risk';

  return 'general';
}
```

### Filtrage par Catégorie

Dans la liste des tables (sidebar future) :

```
┌─────────────────────────┐
│ 📋 All Tables           │
│ 💰 Accounting (5)       │
│ ✓ Compliance (3)        │
│ ⚠️ Risks (2)            │
│ 📋 General (1)          │
└─────────────────────────┘
```

---

## 🧪 Tests Requis

### 1. Test d'Édition Inline

```
✓ Double-clic sur cellule → focus
✓ Modifier valeur texte
✓ Modifier valeur nombre
✓ Modifier date avec date picker
✓ Modifier select avec dropdown
✓ Tab pour passer à la cellule suivante
✓ Enter pour valider et descendre
✓ Esc pour annuler modification en cours
```

### 2. Test d'Auto-Save

```
✓ Modifier cellule → attendre 2s → vérifier sauvegarde
✓ Modifier cellule → modifier autre cellule → 1 seule sauvegarde
✓ Indicateur "Saving..." affiché pendant requête
✓ Indicateur "Saved ✓" affiché 2s après succès
✓ Vérifier en base que nouvelle version créée
```

### 3. Test de Restauration

```
✓ Créer table → modifier → fermer chat
✓ Rouvrir chat → table affiche dernières modifications
✓ Vérifier que tableId est persisté avec le message
✓ Multi-utilisateurs : chaque user voit ses propres tables
```

### 4. Test de Performance

```
✓ Table de 100 lignes → édition fluide (< 50ms)
✓ Table de 1000 lignes → édition fluide (< 100ms)
✓ Auto-save de 100 lignes → < 500ms
✓ Chargement initial de 1000 lignes → < 1s
```

### 5. Test de Versioning

```
✓ 10 modifications → 10 versions créées
✓ View History → affiche toutes les versions
✓ Restaurer version 5 → crée version 11 (copie de v5)
✓ Comparer v5 et v8 → diff affiché correctement
```

---

## 📦 Dépendances Techniques

### Nouvelles Dépendances

```json
{
  "dependencies": {
    "lodash.debounce": "^4.0.8", // Pour auto-save
    "react-hot-toast": "^2.4.1", // Pour notifications
    "date-fns": "^2.30.0" // Pour formatage dates
  }
}
```

### Hooks Utiles

```typescript
// useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// useAutoSave.ts
export function useAutoSave(data: any, saveFn: (data: any) => Promise<void>, delay = 2000) {
  const debouncedData = useDebounce(data, delay);

  useEffect(() => {
    if (debouncedData) saveFn(debouncedData);
  }, [debouncedData]);
}
```

---

## 🚀 Plan de Migration (v1 → v2)

### Phase 1 : Nettoyage (FAIT)

- ✅ Supprimer `src/web/pages/audit-tables.tsx`
- ✅ Supprimer `src/web/components/table-persist-dialog.tsx`
- ✅ Retirer route `/audit-tables` de navigation
- ✅ Retirer import `AuditTablesPage` de app.tsx

### Phase 2 : Backend (À faire)

- [ ] Ajouter colonne `category` à `audit_table_schemas`
- [ ] Créer fonction `findSchemaByName()`
- [ ] Créer endpoint `GET /api/audit/schemas/by-name/:name`
- [ ] Tests backend avec nouvelles fonctions

### Phase 3 : Frontend (À faire)

- [ ] Créer `EditableAuditTable` component
- [ ] Modifier `attachment-data.tsx` pour intégrer édition
- [ ] Ajouter auto-save avec debounce
- [ ] Ajouter boutons d'action (Save, Add Row, Export, Delete)
- [ ] Ajouter indicateurs visuels (Saving, Saved)

### Phase 4 : Tests (À faire)

- [ ] Tests d'édition inline
- [ ] Tests d'auto-save
- [ ] Tests de restauration
- [ ] Tests de performance
- [ ] Tests multi-utilisateurs

### Phase 5 : Documentation (À faire)

- [ ] Mettre à jour MEMO-PROGRESSIF-TACHE.md
- [ ] Créer guide utilisateur
- [ ] Documenter API des nouveaux endpoints

---

## 📝 Notes Importantes

### Différences Clés v1 vs v2

| Aspect           | v1 (Incorrecte)                | v2 (Correcte)          |
| ---------------- | ------------------------------ | ---------------------- |
| **Localisation** | Page dédiée `/audit-tables`    | Dans le chat           |
| **Édition**      | Interface séparée avec dialog  | Inline (comme Excel)   |
| **Sauvegarde**   | Manuelle uniquement            | Auto-save + Manuelle   |
| **UX**           | Nombreux clics, contexte perdu | Fluide, tout sur place |
| **Navigation**   | Sidebar → Audit Tables         | Reste dans le chat     |

### Inspiration UX

- **Excel Online** : Édition inline, auto-save, indicateurs
- **Google Sheets** : Cellules toujours éditables, format detection
- **Airtable** : Typage de colonnes, catégories, filtres
- **Notion** : Base de données inline dans les pages

### Limitations Connues

1. **Pas de collaboration temps réel** (WebSocket) dans v2
2. **Pas de formules** type Excel (=SUM, =AVERAGE)
3. **Pas de graphiques** intégrés
4. **Pagination manuelle** si >1000 lignes

### Extensions Futures Possibles

1. **Sidebar "Tables"** : Liste de toutes les tables sauvegardées
2. **Recherche globale** : Chercher dans toutes les tables
3. **Partage** : Partager une table avec d'autres utilisateurs
4. **Export avancé** : PDF, Excel avec formules
5. **Graphiques** : Générer charts depuis les données
6. **Formules** : Support basique de =SUM(), =AVG()
7. **Templates** : Templates pré-remplis par catégorie
8. **Import** : Importer depuis Google Sheets, Excel

---

**Date** : 2026-11-12  
**Version** : 2.0  
**Auteur** : Correction suite feedback utilisateur  
**Workflow** : wf_a7c8b13f73cb9fe4 (en cours)
