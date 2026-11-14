# Erreur Build Desktop - Lockfile Version

**Date** : 13 novembre 2026, 01:45 UTC  
**Erreur** : `The runtime fingerprint needs a version 9 pnpm lockfile`  
**Status** : ❌ Build échoué

---

## 🐛 Erreur Rencontrée

### Message d'Erreur Complet

```
Error: The runtime fingerprint needs a version 9 pnpm lockfile.
    at lockedPackages (file:///H:/nod_n8n/desktop/scripts/runtime-inputs.mjs:66:11)
    at async runtimeInputs (file:///H:/nod_n8n/desktop/scripts/runtime-inputs.mjs:133:20)
    at async file:///H:/nod_n8n/desktop/scripts/prepare-runtime.mjs:40:15
```

### Commande Échouée

```bash
pnpm run desktop:windows:prepare
```

### Fichier Source

`desktop/scripts/runtime-inputs.mjs` ligne 66

---

## 🔍 Analyse

### Vérifications Effectuées

```powershell
# Version pnpm
pnpm --version
# Résultat : 10.34.5

# Version lockfile
Get-Content pnpm-lock.yaml -First 1
# Résultat : lockfileVersion: '9.0'
```

✅ **pnpm version** : 10.34.5 (OK, supporte lockfile v9)  
✅ **lockfile version** : 9.0 (OK, correct)

### Code Vérification (runtime-inputs.mjs:64-66)

```javascript
async function lockedPackages(names) {
  const lock = await readFile(join(repository, 'pnpm-lock.yaml'), 'utf8');
  if (!lock.startsWith("lockfileVersion: '9.0'\n"))
    // ← Ligne 66
    throw new Error('The runtime fingerprint needs a version 9 pnpm lockfile.');
  // ...
}
```

**Problème identifié** : La vérification est très stricte sur le format exact incluant le `\n`.

### Causes Possibles

1. **Encoding différent** : Le fichier pourrait avoir `\r\n` (Windows) au lieu de `\n` (Unix)
2. **Espaces supplémentaires** : Espaces avant/après la version
3. **Quotes différentes** : Guillemets simples vs doubles
4. **BOM UTF-8** : Byte Order Mark au début du fichier

---

## 🔧 Solutions

### Solution 1 : Vérifier Format Exact du Lockfile

```powershell
# Lire premiers bytes du lockfile
$bytes = [System.IO.File]::ReadAllBytes("h:\nod_n8n\pnpm-lock.yaml")
$bytes[0..100] | ForEach-Object { Write-Host ([char]$_) -NoNewline }

# Vérifier line endings
$content = Get-Content "h:\nod_n8n\pnpm-lock.yaml" -Raw
if ($content -match "\r\n") {
    Write-Host "Windows line endings (CRLF)"
} else {
    Write-Host "Unix line endings (LF)"
}
```

### Solution 2 : Régénérer Lockfile

```bash
cd h:\nod_n8n

# Supprimer lockfile actuel
Remove-Item pnpm-lock.yaml

# Régénérer avec pnpm actuel
pnpm install

# Vérifier version
Get-Content pnpm-lock.yaml -First 1
```

### Solution 3 : Forcer Line Endings Unix (LF)

```powershell
# Convertir CRLF → LF
$content = Get-Content "h:\nod_n8n\pnpm-lock.yaml" -Raw
$content = $content -replace "`r`n", "`n"
[System.IO.File]::WriteAllText("h:\nod_n8n\pnpm-lock.yaml", $content, [System.Text.UTF8Encoding]::new($false))

Write-Host "Lockfile converti en LF"
```

### Solution 4 : Patcher le Script de Vérification (Temporaire)

**Fichier** : `desktop/scripts/runtime-inputs.mjs` ligne 66

**Avant** :

```javascript
if (!lock.startsWith("lockfileVersion: '9.0'\n"))
```

**Après** :

```javascript
// Support CRLF et LF
if (!lock.startsWith("lockfileVersion: '9.0'\n") &&
    !lock.startsWith("lockfileVersion: '9.0'\r\n"))
```

**OU Plus Flexible** :

```javascript
if (!/^lockfileVersion:\s*'9\.0'/m.test(lock))
```

---

## ✅ Solution Recommandée

**Option A** : Régénérer lockfile (le plus sûr)

```bash
cd h:\nod_n8n

# Backup actuel
Copy-Item pnpm-lock.yaml pnpm-lock.yaml.backup

# Régénérer
Remove-Item pnpm-lock.yaml
pnpm install --frozen-lockfile=false

# Vérifier
pnpm run desktop:windows:prepare
```

**Option B** : Convertir line endings (plus rapide)

```powershell
cd h:\nod_n8n

# Script de conversion
$content = Get-Content "pnpm-lock.yaml" -Raw
$content = $content -replace "`r`n", "`n"
[System.IO.File]::WriteAllText("pnpm-lock.yaml", $content, [System.Text.UTF8Encoding]::new($false))

# Relancer build
pnpm run desktop:windows:prepare
```

---

## 🚀 Relancer Build

### Après Correction

```bash
cd h:\nod_n8n

# Nettoyer build précédent si existant
Remove-Item .local\windows-runtime-assets\ -Recurse -Force -ErrorAction SilentlyContinue

# Relancer préparation runtime
pnpm run desktop:windows:prepare

# Temps estimé : 30-60 minutes
# Logs : Visible dans fenêtre PowerShell
```

### Vérification Pendant Build

```bash
# Voir progression
Get-Content build-prepare.log -Wait -Tail 20

# Vérifier processus
Get-Process docker,node,pnpm

# Vérifier images Docker générées
docker images | findstr nod-local
```

---

## 🐛 Problèmes Supplémentaires Potentiels

### Erreur : Docker Images Build Failed

**Cause** : Docker Desktop pas assez de RAM ou containers bloqués

**Solution** :

```bash
# Nettoyer Docker
docker system prune -af

# Augmenter RAM Docker Desktop
# Settings → Resources → Memory → 8 GB

# Relancer
pnpm run desktop:windows:prepare
```

### Erreur : Out of Disk Space

**Cause** : ~20 GB requis mais pas assez d'espace

**Solution** :

```bash
# Vérifier espace libre
Get-PSDrive H

# Nettoyer si nécessaire
docker system prune -a --volumes -f
Remove-Item .local\windows-runtime-assets\ -Recurse -Force
```

### Erreur : Timeout Build

**Cause** : Connexion lente ou Docker lent

**Solution** :

- Augmenter timeout dans scripts
- Utiliser connexion plus rapide
- Désactiver antivirus temporairement

---

## 📊 Build Desktop : Rappel

### Pourquoi ce Build ?

Le build desktop **n'est PAS obligatoire** pour :

- ✅ Développement local (serveur Node.js suffit)
- ✅ Tests manuels frontend
- ✅ Validation système de persistance

Le build desktop est **seulement nécessaire** pour :

- 📦 Distribution application (installeur .exe)
- 🚀 Déploiement utilisateurs finaux
- 🔄 Auto-update mechanism

### Alternatives

**Option 1** : Reporter le build desktop

- Continuer avec serveur Node.js (`pnpm exec tsx src/server/index.ts`)
- Effectuer tests manuels frontend
- Build desktop plus tard quand nécessaire

**Option 2** : Build dans WSL2 (après migration)

- Migrer vers Docker dans WSL2
- Build depuis Ubuntu WSL2 (peut éviter problèmes Windows)
- Performance potentiellement meilleure

**Option 3** : Build sur GitHub Actions (CI/CD)

- Push code sur GitHub
- Laisser CI/CD builder automatiquement
- Télécharger artifacts buildés

---

## ✅ Recommandation

**Court Terme** (maintenant) :

1. ⏸️ **Reporter build desktop** (pas urgent)
2. ✅ **Effectuer tests manuels frontend** (priorité)
3. ✅ **Configurer WSL2 Ubuntu** (économie RAM)
4. ✅ **Migrer containers vers WSL2**

**Moyen Terme** (cette semaine) : 5. 🔧 **Corriger erreur lockfile** (Option B : convertir line endings) 6. 🏗️ **Relancer build desktop** (quand temps disponible) 7. 🧪 **Tester installeur** (validation finale)

**Justification** :

- Tests frontend plus importants (valider corrections)
- Migration WSL2 réduit RAM (~50%)
- Build desktop peut attendre (2-3h non critiques)
- Système de persistance déjà opérationnel

---

## 🎯 Prochaines Étapes Immédiates

### 1. Arrêter Docker Desktop ✅

```powershell
# Docker peut être arrêté maintenant
# Build desktop échoué, serveur Node.js déjà lancé
```

**Gain RAM immédiat** : ~4-6 GB libérés

### 2. Tests Manuels Frontend 🔴 PRIORITÉ

**URL** : http://localhost:4310/#access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU

**Tests critiques** (30-45 min) :

- Test #1 : Race Condition
- Test #2 : Restauration Cross-Browser
- Test #4 : CRUD Complet

**Guide** : CHECKLIST-TESTS-MANUELS.md

### 3. Configuration Ubuntu WSL2 🟠 IMPORTANT

```bash
# Première connexion
wsl -d Ubuntu-22.04

# Créer user/password
# Installer Docker dans WSL2
```

**Guide** : Doc installation wsl2 ubuntu/00-README-INSTALLATION-WSL2.md

### 4. Build Desktop 🟡 OPTIONNEL

**Quand** : Après tests frontend + migration WSL2

**Comment** :

1. Corriger lockfile (convertir line endings)
2. Relancer `pnpm run desktop:windows:prepare`
3. Attendre 30-60 min
4. Lancer `pnpm run desktop:windows:build`

---

## 📝 Notes Finales

**Build desktop échoué** : Erreur lockfile version 9 (format line endings)  
**Impact** : Aucun, build desktop pas critique pour développement  
**Solution** : Convertir CRLF → LF dans pnpm-lock.yaml  
**Priorité** : Tests frontend > Migration WSL2 > Build desktop

**Docker Desktop** : ✅ Peut être arrêté maintenant (libère 4-6 GB RAM)

---

**Créé** : 13 novembre 2026, 01:50 UTC  
**Par** : Kiro (Assistant IA)  
**Status** : Erreur documentée, solutions proposées, priorités établies
