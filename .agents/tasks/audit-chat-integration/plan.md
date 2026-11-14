# Plan d'intégration du menu contextuel pour les tables du chat

## Résumé de l'investigation

Ce document décrit l'architecture actuelle du rendu des tables dans le chat Nod et propose une approche pour intégrer la persistance des tables via un menu contextuel, en réutilisant l'infrastructure backend `/api/audit/*` déjà existante.

## Architecture actuelle du rendu des tables

### 1. Flux de données des fichiers CSV/Spreadsheet

**Composants principaux:**

- `attachment-data.tsx` : Composant principal qui rend les différents types de données
- `SheetView` : Composant spécialisé pour le rendu des tables (lignes 124-196)
- `attachment-card.tsx` : Enveloppe qui affiche les attachments dans les messages

**Types de fichiers supportés:**

- CSV (`.csv`, `.tsv`) - type `'csv'`
- Spreadsheets (`.xlsx`, `.xlsm`, `.xls`, `.ods`) - type `'spreadsheet'`

**Traitement des données:**

1. Le fichier est téléchargé via `fetch(item.url)` (ligne 537)
2. Pour CSV: parsing custom avec `parseCsv()` (lignes 167-199) qui détecte le délimiteur automatiquement
3. Pour Spreadsheet: lecture via la bibliothèque `@e965/xlsx` (lignes 290-315)
4. Conversion en format unifié `Sheet[]`:
   ```typescript
   type Sheet = {
     name: string;
     rows: string[][];
     header: boolean;
     total: number;
     columns: number;
   };
   ```

### 2. Rendu visuel des tables

**Composant SheetView (lignes 124-196):**

- Affiche les données sous forme de `<table>` HTML
- Support multi-onglets pour les spreadsheets avec plusieurs feuilles
- Gestion des en-têtes (détection automatique pour CSV)
- Détection automatique des colonnes numériques (ligne 140-145)
- Formatage des cellules avec liens hypertexte (composant `SpreadsheetCell`, lignes 78-103)
- Limite d'affichage: 200 lignes (constante `previewRows = 202`)
- Scrollable horizontalement et verticalement via `.artifact-sheet-scroll`

**Identification des numéros de lignes:**

- Les lignes ont des `<th scope="row">{rowIndex + 1}</th>` (ligne 156)
- Les colonnes ont des identifiants alphabétiques générés par `columnName()` (lignes 213-221)

### 3. Contexte d'affichage

Les tables apparaissent dans les messages du chat via:

- `MessageAttachments` (dans `message.tsx`, lignes 693, 711)
- Attachés aux objets `Message` avec des `Artifact[]`
- Chaque `Artifact` contient: `id`, `name`, `mimeType`, `size`, `url`

## Infrastructure de menu contextuel existante

### Composant ActionMenu réutilisable

**Fichier:** `action-menu.tsx`

**Composants disponibles:**

1. `ActionMenuSurface` - Surface du menu (ligne 154)
2. `ActionMenuItem` - Item individuel (ligne 171)
3. `ActionMenu` - Menu complet avec trigger et popover (ligne 207)

**Caractéristiques:**

- Basé sur Radix UI Popover
- Navigation au clavier (flèches, Home, End, recherche par lettre)
- Support des items cochés/destructifs
- Gestion automatique du focus
- Positionnement configurable (`align`, `side`)

**Exemple d'utilisation dans le chat:**
Le composant `message.tsx` utilise un menu contextuel pour les actions sur messages:

- Clic droit sur un message ouvre le menu (ligne 669)
- Items: Reply, React, Copy, Copy Markdown
- Déclenché aussi par touche `ContextMenu` ou `Shift+F10`

### Pattern d'intégration

```typescript
// Trigger par clic droit (ligne 669-681)
onContextMenu={(event) => {
  if (/* conditions */) return;
  event.preventDefault();
  openMenu({ x: event.clientX, y: event.clientY });
}}

// Rendu du menu via portal (lignes 883-949)
createPortal(
  <ActionMenuSurface>
    <ActionMenuItem onClick={handler}>Action</ActionMenuItem>
  </ActionMenuSurface>,
  document.body
)
```

## Backend API audit tables disponible

**Fichier:** `routes-audit-tables.ts`

**Endpoints pertinents:**

1. **Créer un schéma de table:**
   - `POST /api/audit/schemas`
   - Body: `{ table_name, display_name, column_definitions[] }`

2. **Insérer des données en masse:**
   - `POST /api/audit/schemas/:schemaId/data/bulk`
   - Body: `{ rows: Array<Record<string, unknown>> }`

3. **Lire les données:**
   - `GET /api/audit/schemas/:schemaId/data`

4. **Lister les schémas:**
   - `GET /api/audit/schemas`

5. **Historique des versions:**
   - `GET /api/audit/data/:dataId/versions`

**Types de colonnes supportés:**

- `'text'` | `'number'` | `'date'` | `'boolean'` | `'select'`

## Approche recommandée

### Phase 1: Menu contextuel sur les tables

**Objectif:** Ajouter un menu clic droit sur les tables rendues dans le chat

**Modifications à faire:**

1. **Modifier `SheetView` pour ajouter le menu contextuel**
   - Fichier: `src/web/components/attachment-data.tsx`
   - Ajouter state pour gérer l'ouverture du menu et la position
   - Wrapper la `<table>` avec un handler `onContextMenu`
   - Utiliser `createPortal` pour rendre le menu au niveau `document.body`

2. **Items du menu:**
   - "Save to Audit Table" (icône Save/Database)
   - "View History" (désactivé si pas encore sauvegardé)
   - Séparateur
   - "Export as CSV" (fonctionnalité bonus)

3. **State nécessaire:**
   ```typescript
   const [menuState, setMenuState] = useState<{
     open: boolean;
     position: { x: number; y: number };
   } | null>(null);
   ```

### Phase 2: Dialog de sauvegarde

**Objectif:** Modal pour configurer et sauvegarder la table

**Composant à créer:** `TablePersistDialog.tsx`

**UI proposée:**

```typescript
interface TablePersistDialogProps {
  sheet: Sheet;
  artifactId: string;
  artifactName: string;
  open: boolean;
  onClose: () => void;
  onSaved?: (schemaId: string) => void;
}
```

**Étapes dans le dialog:**

1. **Configuration de la table:**
   - Input: Nom de la table (pré-rempli avec `artifactName`)
   - Checkbox: "Use first row as headers" (pré-coché si `sheet.header === true`)
   - Aperçu des 5 premières lignes

2. **Mapping des colonnes:**
   - Pour chaque colonne détectée, afficher:
     - Nom (éditable, par défaut: en-tête ou columnName)
     - Type (select: text/number/date/boolean/select)
     - Détection automatique suggérée basée sur les données

3. **Actions:**
   - Bouton "Cancel"
   - Bouton "Save Table" (primaire)

### Phase 3: Conversion des données

**Fichier à créer:** `src/web/lib/table-conversion.ts`

**Fonction principale:**

```typescript
interface ConvertedTable {
  tableName: string;
  displayName: string;
  columnDefinitions: ColumnDefinition[];
  rows: Array<Record<string, unknown>>;
}

function convertSheetToAuditTable(
  sheet: Sheet,
  artifactName: string,
  useHeader: boolean,
  columnMapping: ColumnMapping[],
): ConvertedTable;
```

**Logique de conversion:**

1. **Détection automatique du type de colonne:**
   - Analyser les valeurs de chaque colonne
   - Si `numberLike.test()` (déjà existant ligne 122) → `'number'`
   - Si format date détecté → `'date'`
   - Si valeurs uniques < 10 et répétées → `'select'`
   - Sinon → `'text'`

2. **Normalisation des données:**
   - Convertir `string[][]` en `Array<Record<string, unknown>>`
   - Appliquer les types aux valeurs (parser les nombres, dates)
   - Gérer les cellules vides (null ou valeur par défaut)

3. **Génération du nom de table:**
   - Slugifier `artifactName` (enlever espaces, caractères spéciaux)
   - Ajouter timestamp si conflit potentiel

### Phase 4: Intégration API

**Fichier à créer/modifier:** `src/web/lib/api-audit-tables.ts`

**Fonctions API:**

```typescript
async function saveSheetToAuditTable(converted: ConvertedTable): Promise<{ schemaId: string }>;

async function getTableVersions(dataId: string): Promise<Version[]>;

async function checkTableExists(tableName: string): Promise<{ exists: boolean; schemaId?: string }>;
```

**Flow de sauvegarde:**

1. Vérifier si une table avec ce nom existe déjà
2. Si oui: proposer de mettre à jour ou créer une nouvelle version
3. Si non: créer le schéma via `POST /api/audit/schemas`
4. Insérer les données via `POST /api/audit/schemas/:schemaId/data/bulk`
5. Stocker l'association `artifactId` → `schemaId` (localStorage ou DB)

### Phase 5: Dialog d'historique des versions

**Composant à créer:** `TableVersionsDialog.tsx`

**UI proposée:**

- Liste des versions avec:
  - Date de modification
  - Nombre de changements
  - Aperçu des différences
- Actions:
  - "View" (ouvrir dans l'onglet Audit Table)
  - "Restore" (créer nouvelle version basée sur ancienne)
- Utiliser `GET /api/audit/data/:dataId/versions`

## Composants UI disponibles

**Fichier:** `ui.tsx`

Composants réutilisables identifiés:

- `Button` - avec variants (default, secondary, ghost, outline, destructive)
- `Dialog`, `DialogContent`, `DialogTitle`, `DialogDescription` - pour les modals
- `Input` - champs de texte
- `Field` - wrapper pour labels + inputs
- `SearchField` - input avec recherche
- `Switch` - toggle on/off
- `Checkbox` - cases à cocher

**Note:** Pas de composant `Select` trouvé dans `ui.tsx`, mais utilisé ailleurs dans le projet. Vérifier son emplacement exact.

## Flux de données complet

```
1. User opens chat message with CSV/spreadsheet attachment
   ↓
2. AttachmentData renders SheetView with table
   ↓
3. User right-clicks on table
   ↓
4. ActionMenu appears with "Save to Audit Table" option
   ↓
5. TablePersistDialog opens
   ↓
6. User configures table name and column mappings
   ↓
7. convertSheetToAuditTable() transforms Sheet → ConvertedTable
   ↓
8. saveSheetToAuditTable() calls:
   - POST /api/audit/schemas (create schema)
   - POST /api/audit/schemas/:schemaId/data/bulk (insert rows)
   ↓
9. Store artifactId → schemaId mapping
   ↓
10. Show success message, enable "View History" menu item
    ↓
11. (Optional) User clicks "View History"
    ↓
12. TableVersionsDialog fetches and displays versions
```

## Points d'attention et risques

### 1. Taille des données

**Risque:** Les tables peuvent être très grandes (> 200 lignes)

**Mitigations:**

- Le `SheetView` n'affiche que 200 lignes (ligne 143: `.slice(0, 200)`)
- Le backend peut avoir des limites sur le bulk insert
- Ajouter une limite explicite et un message d'avertissement
- Pour tables > 1000 lignes, proposer un import par batch

### 2. Détection des types de colonnes

**Risque:** Détection automatique incorrecte

**Mitigations:**

- Toujours permettre l'override manuel dans le dialog
- Offrir un aperçu des données avec le type détecté
- Par défaut, utiliser `'text'` si incertain
- Documenter que l'utilisateur peut modifier les types après sauvegarde

### 3. Conflits de noms de tables

**Risque:** Plusieurs CSVs avec le même nom

**Mitigations:**

- Appeler `checkTableExists()` avant la sauvegarde
- Proposer un suffixe automatique (ex: `table_name_2`)
- Permettre à l'utilisateur de renommer avant sauvegarde

### 4. Association artifact ↔ table

**Risque:** Perdre le lien entre le fichier du chat et la table audit

**Solutions possibles:**

1. **LocalStorage:** `{ [artifactId]: schemaId }`
   - Simple à implémenter
   - Persiste entre sessions
   - Limité au navigateur

2. **Ajouter un champ au schéma:**
   - Modifier `table_schemas` pour ajouter `source_artifact_id`
   - Plus robuste
   - Nécessite migration DB

**Recommandation:** Commencer avec localStorage, migrer vers DB si besoin

### 5. Gestion des erreurs réseau

**Risque:** Échec de sauvegarde après configuration

**Mitigations:**

- Utiliser un state `saving` avec indicateur de chargement
- Afficher les erreurs API avec `Notice` component
- Permettre de réessayer sans perdre la configuration
- Sauvegarder la config localement avant l'appel API

### 6. Permissions et isolation des données

**Risque:** Fuite de données entre utilisateurs

**Vérifications nécessaires:**

- Confirmer que tous les endpoints `/api/audit/*` sont owner-scoped
- Vérifier dans `routes-audit-tables.ts` l'utilisation de `transaction()`
- S'assurer que `pool` utilise le bon contexte owner (voir `db.ts`)

**Action:** Lire `src/server/db.ts` et `src/server/transaction.ts` pour vérifier l'isolation

### 7. Performance du rendu du menu

**Risque:** Lag lors de l'ouverture du menu sur grandes tables

**Mitigations:**

- Le menu contextuel est léger (juste quelques items)
- Utiliser `createPortal` évite les re-renders du SheetView
- Le state du menu est isolé, pas de propagation vers le parent

### 8. Accessibilité

**Points à vérifier:**

- Menu contextuel accessible au clavier (`ContextMenu` key, `Shift+F10`)
- Dialog modal avec focus trap (déjà géré par Radix)
- Labels ARIA sur tous les champs du dialog
- Annonces screen reader pour succès/erreur de sauvegarde

### 9. Types TypeScript

**À vérifier:**

- Type `Sheet` est défini localement dans `attachment-data.tsx` (ligne 17)
- Peut-être l'exporter vers un fichier shared si réutilisé ailleurs
- Types backend `ColumnDefinition` importés depuis `db-audit-tables.ts`

### 10. Tests

**Zones à tester:**

- Parsing CSV avec différents délimiteurs (`,`, `;`, `\t`)
- Detection de types sur données réelles variées
- Sauvegarde avec/sans headers
- Gestion des cellules vides
- Tables avec > 200 lignes
- Spreadsheet multi-onglets (sauvegarder un seul onglet à la fois?)

## Fichiers à créer

1. `src/web/components/table-persist-dialog.tsx` - Dialog de sauvegarde
2. `src/web/components/table-versions-dialog.tsx` - Dialog d'historique
3. `src/web/lib/table-conversion.ts` - Logique de conversion
4. `src/web/lib/api-audit-tables.ts` - Appels API

## Fichiers à modifier

1. `src/web/components/attachment-data.tsx`
   - Ajouter menu contextuel dans `SheetView`
   - Importer et utiliser `ActionMenu`, `ActionMenuItem`
   - Gérer le state du menu et des dialogs

2. `src/web/components/action-menu.tsx`
   - Aucune modification nécessaire (déjà complet)

3. `src/web/lib/api.ts` (si nécessaire)
   - Ajouter helper pour les calls `/api/audit/*` si pas déjà présent

## Questions ouvertes pour l'utilisateur

1. **Multi-onglets:** Pour un fichier `.xlsx` avec plusieurs sheets, faut-il:
   - Sauvegarder tous les onglets comme une seule table?
   - Permettre de choisir quel(s) onglet(s) sauvegarder?
   - Créer une table par onglet?

2. **Mise à jour vs nouvelle version:**
   - Si une table avec ce nom existe, proposer de:
     a) Ajouter les lignes à la table existante?
     b) Remplacer la table existante?
     c) Créer une nouvelle table avec suffixe?

3. **Limite de taille:**
   - Quelle limite maximale pour le nombre de lignes à sauvegarder?
   - Proposer un système de pagination pour très grandes tables?

4. **Export CSV:**
   - Faut-il aussi ajouter l'option "Export as CSV" dans le menu?
   - Ou se concentrer uniquement sur la persistance audit?

5. **Lien visuel:**
   - Afficher un badge/icon sur les tables déjà sauvegardées?
   - Montrer le statut "Saved to Audit Table" quelque part?

## Estimation de complexité

**Phase 1 (Menu contextuel):** 2-3 heures

- Modification simple de `SheetView`
- Réutilisation directe de `ActionMenu`

**Phase 2 (Dialog de sauvegarde):** 4-6 heures

- Création du dialog avec formulaire
- UI de mapping des colonnes
- Gestion du state

**Phase 3 (Conversion):** 3-4 heures

- Logique de détection de types
- Transformation des données
- Tests de conversion

**Phase 4 (Intégration API):** 2-3 heures

- Appels API relativement simples
- Gestion des erreurs
- Association artifact ↔ table

**Phase 5 (Historique):** 3-4 heures

- Dialog de versions
- Appel API versions
- UI de comparaison

**Total estimé:** 14-20 heures de développement

**Risques de débordement:**

- Détection de types plus complexe que prévu
- Problèmes d'isolation des données côté backend
- UX du mapping de colonnes nécessite plusieurs itérations
- Tests sur données réelles révèlent des edge cases

## Prochaines étapes recommandées

1. **Valider l'approche avec l'utilisateur**
   - Confirmer les réponses aux questions ouvertes
   - Ajuster le scope si nécessaire

2. **Vérifier l'isolation des données**
   - Lire `db.ts` et `transaction.ts`
   - Confirmer que les routes audit sont sécurisées

3. **Prototyper le menu contextuel**
   - Phase 1 en premier (quick win visible)
   - Tester le pattern d'intégration

4. **Créer la logique de conversion**
   - Phase 3 avant Phase 2 (logic-first)
   - Tests unitaires sur la détection de types

5. **Implémenter le dialog de sauvegarde**
   - Phase 2 avec la conversion prête
   - Intégration complète

6. **Ajouter l'historique des versions**
   - Phase 5 en dernier (nice-to-have)
   - Peut être différé si contraintes de temps

## Conclusion

L'intégration proposée est réalisable et s'appuie sur:

- Infrastructure backend déjà fonctionnelle (`/api/audit/*`)
- Composants UI réutilisables (`ActionMenu`, `Dialog`)
- Architecture de rendu des tables bien structurée (`SheetView`)

Le risque principal est la complexité de la détection automatique des types de colonnes, qui peut nécessiter des ajustements après tests sur données réelles.

La phase 1 (menu contextuel) peut être implémentée rapidement comme POC pour valider l'approche avant de s'engager dans les phases suivantes.
