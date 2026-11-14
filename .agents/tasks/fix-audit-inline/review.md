# Review - Édition Inline des Tables d'Audit

## Résumé

Review du commit `6ea9c69d` qui transforme les tables CSV/Excel du chat en éditeur inline avec auto-sauvegarde.

## 1. Architecture EditableTable ✓

### Transformations effectuées

- ✅ SheetView transformé en composant éditable via EditableTable
- ✅ Cellules implémentées comme `<input>` natifs (type text/number/date)
- ✅ Édition activée automatiquement (pas de double-clic nécessaire)
- ✅ onChange déclenche auto-save debounced

**Vérification:**

- `src/web/components/editable-table.tsx` lignes 267-277 : chaque cellule est un `<input>` avec `onChange={handleCellChange}` et `onBlur={handleCellBlur}`

## 2. Auto-Save ✓

### Debounce implémenté

- ✅ Debounce de 2 secondes après dernière modification (ligne 175-181)
- ✅ Indicateur visuel "Saving..." / "Saved ✓" (lignes 301-305)
- ✅ onBlur sauvegarde immédiatement (lignes 185-189)

**⚠️ BLOCKER - Race Condition Détectée:**
**Fichier:** `src/web/components/editable-table.tsx`, lignes 121-125

```typescript
if (!tableId || !pendingSave) return;

setSaveStatus('saving');
setPendingSave(false);
```

**Problème:** Le flag `pendingSave` est remis à `false` immédiatement après vérification, AVANT que la sauvegarde ne commence réellement. Si l'utilisateur modifie une cellule pendant qu'une sauvegarde est en cours:

1. Première sauvegarde démarre : `setPendingSave(false)`
2. Utilisateur tape → `setPendingSave(true)`
3. Deuxième sauvegarde démarre en parallèle avant la fin de la première
4. Risque de conflits sur les `row._id` quand les nouvelles lignes sont créées

**Solution requise:** Ajouter un flag `isSaving` séparé et refuser les nouvelles sauvegardes tant qu'une est en cours:

```typescript
const [isSaving, setIsSaving] = useState(false);

const saveData = useCallback(async () => {
  if (!tableId || !pendingSave || isSaving) return;

  setIsSaving(true);
  setSaveStatus('saving');
  setPendingSave(false);

  try {
    // ... existing save logic
  } finally {
    setIsSaving(false);
  }
}, [tableId, rows, pendingSave, isSaving]);
```

## 3. Boutons d'Action ✓

- ✅ Save manuel fonctionne (ligne 293)
- ✅ Add Row insère nouvelle ligne (ligne 294, impl ligne 191-199)
- ✅ Export CSV génère fichier correct (ligne 295, impl ligne 219-242)
- ✅ Delete Row fait soft delete (impl ligne 201-217)

**Vérification:** Toutes les actions sont présentes avec handlers corrects.

## 4. Restauration Automatique ⚠️

### Ce qui fonctionne

- ✅ useEffect au montage vérifie existence en base (lignes 37-117)
- ✅ Vérifie localStorage pour mapping artifactId → tableId
- ✅ Si existe, charge données avec GET `/api/audit/schemas/{id}/data`
- ✅ Si non, crée schéma avec POST `/api/audit/schemas`

**⚠️ BLOCKER - Endpoint manquant:**
La spécification demandait un endpoint `GET /api/audit/schemas/by-name/:name`, mais il n'existe pas dans `src/server/routes-audit-tables.ts`.

**Impact:** L'implémentation actuelle utilise localStorage à la place, ce qui fonctionne mais:

- Les tables ne sont pas restaurables sur un autre navigateur
- Perte du mapping si localStorage est effacé
- Pas de recherche par nom de table

**Solution requise:**

1. Ajouter l'endpoint dans `routes-audit-tables.ts`:

```typescript
app.get<{ Params: { name: string } }>(
  '/api/audit/schemas/by-name/:name',
  async (request, reply) => {
    const { name } = request.params;
    const result = await transaction(
      (client) =>
        client.query(
          'SELECT * FROM audit_table_schemas WHERE owner_id = $1 AND table_name = $2 AND deleted_at IS NULL',
          [ownerId, name],
        ),
      pool,
    );
    return { schema: result.rows[0] || null };
  },
);
```

2. Modifier `editable-table.tsx` pour vérifier d'abord par nom de table:

```typescript
const tableName = slugify(artifactName);
const byNameResponse = await fetch(`/api/audit/schemas/by-name/${tableName}`, {
  credentials: 'include',
});
if (byNameResponse.ok) {
  const { schema } = await byNameResponse.json();
  if (schema) {
    // Charger les données...
  }
}
```

## 5. Backend ✓

- ✅ Colonne `category` ajoutée (ligne 21-26 de `db-audit-tables.ts`)
- ✅ Endpoint PATCH `/api/audit/schemas/:schemaId/data/batch` créé (lignes 207-234 de `routes-audit-tables.ts`)
- ✅ Migration SQL avec `DO $$ BEGIN ... EXCEPTION WHEN duplicate_column` (safe)

**Note:** Pas de migration séparée nécessaire car `ADD COLUMN IF NOT EXISTS` + `DO/EXCEPTION` gère l'idempotence.

## 6. Cleanup ✓

- ✅ `table-persist-dialog.tsx` supprimé (confirmé par file_search)
- ✅ Menu contextuel supprimé de SheetView (EditableTable remplace la logique)
- ✅ `audit-tables.tsx` supprimé (confirmé par file_search)
- ✅ Route `/audit-tables` retirée du menu (vérifié dans `navigation.ts`)

## 7. Tests ⚠️

**Fichier existant:** `src/server/db-audit-tables.test.ts`

**✅ Tests backend couvrent:**

- CRUD schema
- CRUD data
- Bulk insert
- Versioning
- Scénarios réels (Feuille Couverture, Matrice Surveillance)

**❌ BLOCKER - Tests frontend manquants:**
Les fichiers `test-audit-tables-frontend.html` et `test-audit-direct-postgres.html` trouvés à la racine suggèrent des tests manuels, mais:

1. **Aucun test automatisé pour:**
   - Le cycle complet: Upload CSV → édition → auto-save → restauration
   - Add/Delete row depuis le frontend
   - Export CSV généré
   - Race conditions sur sauvegardes simultanées

2. **Multi-utilisateurs non testé:**
   - Vérifier que `owner_id` isole correctement les données
   - Tester deux utilisateurs avec le même nom de table

**Solution requise:**
Ajouter un test E2E dans un fichier comme `src/web/components/editable-table.test.tsx` qui vérifie:

```typescript
describe('EditableTable E2E', () => {
  it('should complete full cycle: upload → edit → save → restore', async () => {
    // 1. Mount avec sheet data
    // 2. Attendre initialisation
    // 3. Modifier cellule
    // 4. Attendre 2s + vérifier "Saved ✓"
    // 5. Unmount + remount avec même artifactId
    // 6. Vérifier données restaurées
  });

  it('should prevent concurrent saves', async () => {
    // Tester la race condition
  });
});
```

## 8. Code Quality ⚠️

### ✅ Points positifs:

- Types TypeScript corrects et complets
- Conventions Nod respectées (owner_id, credentials: 'include', etc.)

### ⚠️ Points à améliorer:

**1. console.error non supprimés (MEDIUM)**

- `editable-table.tsx` ligne 111: `console.error('Failed to restore table:', error)`
- `editable-table.tsx` ligne 216: `console.error('Failed to delete row:', error)`

**Impact:** Selon `AGENTS.md`: "Pas de console.log oubliés" dans Code Quality
**Solution:** Remplacer par un système de notification utilisateur ou logger côté serveur

**2. Manque default_value dans ColumnMapping (MEDIUM)**

```typescript
interface ColumnMapping {
  // ... existing fields
  default_value?: unknown; // ✅ présent
}
```

Vérifié : présent dans `table-conversion.ts` ligne 7

**3. Mutation directe du state row (LOW)**
Ligne 158-160 de `editable-table.tsx`:

```typescript
if (response.ok) {
  const { data } = await response.json();
  row._id = data.id; // ⚠️ mutation directe
  delete row._isNew; // ⚠️ mutation directe
}
```

**Impact:** Faible car suivi d'un re-render, mais contraire aux bonnes pratiques React
**Solution:** Utiliser `setRows()` pour créer un nouveau array:

```typescript
setRows((prev) => prev.map((r) => (r === row ? { ...r, _id: data.id } : r)));
```

## Verdict Global

### Blockers identifiés:

1. **Race condition sur sauvegardes simultanées** (section 2)
2. **Endpoint GET by-name manquant** (section 4)
3. **Tests frontend absents** (section 7)

### Warnings:

1. console.error dans le code de production
2. Mutation directe du state React

### Succès:

- Architecture solide et bien intégrée
- Backend robuste avec versioning
- UX fluide (auto-save + debounce)
- Cleanup complet de l'ancien code

## Recommandations

1. **Priorité 1 (Blockers):**
   - Corriger la race condition avec flag `isSaving`
   - Ajouter endpoint by-name + modifier restore logic
   - Ajouter tests E2E frontend

2. **Priorité 2 (Quality):**
   - Remplacer console.error par notifications
   - Corriger mutations directes du state

3. **Future:**
   - Considérer optimistic updates pour meilleure UX
   - Ajouter retry logic si sauvegarde échoue
