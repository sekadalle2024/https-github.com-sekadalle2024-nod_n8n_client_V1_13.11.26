# 🐛 Debug : "The workspace could not be displayed"

## Problème

L'erreur persiste malgré l'ajout de `credentials: 'include'` dans tous les fetch().

## Actions de débogage

### 1️⃣ Vérifier la console du navigateur

**Dans votre navigateur :**

1. Appuyez sur `F12` pour ouvrir les DevTools
2. Allez dans l'onglet **Console**
3. Cliquez sur "Audit Tables" dans la sidebar
4. **Regardez les erreurs** qui s'affichent en rouge

**Erreurs possibles :**

- ❌ `401 Unauthorized` → Authentification encore KO
- ❌ `500 Internal Server Error` → Erreur backend
- ❌ `Cannot read property...` → Erreur JavaScript dans le composant
- ❌ `Failed to fetch` → Problème réseau/CORS

### 2️⃣ Vérifier l'onglet Network

**Dans DevTools :**

1. Allez dans l'onglet **Network**
2. Cliquez sur "Audit Tables"
3. Cherchez la requête `/api/audit/schemas`
4. **Cliquez dessus** et regardez :
   - **Status Code** : 200 OK ? 401 ? 500 ?
   - **Response** : Quel est le message d'erreur ?
   - **Headers → Request Headers** : Y a-t-il un cookie ?

---

## Solutions selon l'erreur

### Si Status 401 encore

➡️ Le problème vient de l'authentification Nod elle-même

**Cause possible :** Les routes `/api/audit/*` ne sont pas autorisées

**Solution :** Vérifier dans `src/server/app.ts` si les routes audit sont bien enregistrées AVANT le middleware d'authentification

### Si Status 500

➡️ Erreur backend dans les fonctions PostgreSQL

**Solution :** Regarder les logs du serveur dans la fenêtre PowerShell

### Si erreur JavaScript

➡️ Le composant React a un bug

**Solution :** Vérifier le code du composant ou utiliser un try-catch global

### Si "Failed to fetch"

➡️ Le serveur ne répond pas ou CORS

**Solution :** Vérifier que le serveur tourne sur le port 4310

---

## Alternative : Tester l'API directement

Si vous me donnez les erreurs de la console, je pourrai diagnostiquer exactement.

En attendant, testons l'API directement avec curl pour voir si elle fonctionne :

```powershell
# Test 1 : Sans authentification
curl http://localhost:4310/api/audit/schemas

# Test 2 : Avec le cookie d'accès
curl http://localhost:4310/api/audit/schemas -H "Cookie: nod-access=KXkl8AoKlM3iFaXdP9e9RjCAiyHIyAbbYdchI2DkaRU"
```

---

## 🎯 Prochaine étape

**Dites-moi ce que vous voyez dans la console du navigateur (F12)** quand vous cliquez sur "Audit Tables" !

Cela me permettra de diagnostiquer exactement le problème.
