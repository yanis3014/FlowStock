# 🔍 Revue de Code - Stories 3.2 & 3.3
**Date** : 6 février 2026  
**Périmètre** : Import CSV ventes (3.2), Formules prédéfinies (3.3)

---

## 📋 Résumé Exécutif

### ✅ Points Forts
- **Implémentation complète** des AC stories 3.2 et 3.3
- **Tests** unitaires et d'intégration bien couverts
- **Multi-tenancy** respecté (RLS, tenant_id)
- **Alignement** avec les patterns existants (product-import, sales CRUD)

### ⚠️ Points d'Attention
1. **sales-import** : INSERT direct au lieu de réutiliser `createSale` (écart par rapport à la spec)
2. **Cache global** `productCache` / `locationCache` non isolé par import (fuite mémoire potentielle)
3. **XSS** dans les pages HTML (insertion HTML non échappée)
4. **Route** `/formulas/:id/execute` en conflit potentiel avec `/formulas/predefined/:id`

### 📊 Score : 8.0/10

---

## 📁 Fichiers Revus

### 1. `sales-import.service.ts`

#### ✅ Points positifs
- Parsing CSV robuste (virgule/point-virgule, BOM, `relax_column_count`)
- Détection colonnes avec alias FR/EN (sale_date, product_sku, quantité, etc.)
- Parsing dates multi-format (ISO8601, DD/MM/YYYY, YYYY-MM-DD)
- Validation ligne par ligne avec messages d’erreur explicites
- Import par lots de 100 avec `transactionWithTenant`
- Cache produit/location pour limiter les requêtes DB

#### ⚠️ Problèmes identifiés

**1.1 Cache global non isolé entre imports**
```typescript
const productCache = new Map<string, string | null>();
const locationCache = new Map<string, string | null>();
```
- Les caches sont vidés au début de chaque import (`productCache.clear()`), donc OK en usage séquentiel.
- En revanche, ils restent en mémoire entre imports successifs → croissance mémoire si beaucoup d’imports.
- **Recommandation** : créer les caches localement dans `importSales` et les passer aux helpers, ou prévoir un TTL/éviction.

**1.2 Non-réutilisation de `createSale`**
La spec (3-2-import-csv-ventes.md) indique :
> *"2.2 Réutiliser createSale du sales.service.ts pour chaque ligne valide"*
- L’implémentation fait un INSERT direct dans `importSales`.
- Raison probable : performance (éviter N appels à `getProductById`, déjà fait dans `validateRow`).
- **Recommandation** : documenter ce choix (ex. commentaire dans le code). Pour garder la cohérence métier, envisager une fonction interne `createSaleFromValidated()` partagée.

**1.3 Duplication de `computeTotalAmount`**
- `computeTotalAmount` est dupliquée dans `sales-import.service.ts` et `sales.service.ts`.
- **Recommandation** : extraire dans un utilitaire partagé (ex. `packages/shared` ou `utils/sales.utils.ts`).

**1.4 `result.ignored` toujours 0**
```typescript
result.ignored = result.totalRows - result.imported - result.errors.length;
```
- Actuellement, toute ligne est soit importée soit en erreur → `ignored` reste à 0.
- **Recommandation** : OK pour le MVP. Documenter ou retirer `ignored` si non pertinent.

---

### 2. `sales.routes.ts` (routes import)

#### ✅ Points positifs
- Multer configuré (5 MB, CSV uniquement)
- Routes protégées par `authenticateToken`
- Mapping JSON parsé avec gestion d’erreur
- `userId` transmis pour traçabilité

#### ⚠️ Problèmes identifiés

**2.1 Ordre des routes**
- `GET /import/template`, `POST /import/preview`, `POST /import` sont définis **après** `GET /:id`.
- Express ne matche que sur un segment, donc `GET /sales/import/template` n’est pas capté par `GET /:id`.
- **Recommandation** : déplacer les routes `/import/*` **avant** `GET /:id` pour éviter tout risque futur (conventions REST).

**2.2 Pas de validation du mapping**
- `req.body.mapping` est parsé en JSON mais non validé (clés/valeurs autorisées).
- Un mapping malformé ou avec des champs invalides peut provoquer des comportements inattendus.
- **Recommandation** : valider le mapping (champs connus : `sale_date`, `product_sku`, etc.).

---

### 3. `formula.service.ts`

#### ✅ Points positifs
- 8 formules prédéfinies implémentées correctement
- Gestion des dates (`resolveDateRange`)
- Gestion des cas `product_id` requis / optionnel
- RLS respecté (`queryWithTenant`)

#### ⚠️ Problèmes identifiés

**3.1 Logique basée sur `formula.name`**
```typescript
switch (formula.name) {
  case 'consommation_moyenne': ...
```
- Couplage fort à des noms en base. Toute évolution (renommage, nouvelles formules) impose des changements de code.
- **Recommandation** : considérer un champ `formula_code` ou un mapping `name → handler` externe.

**3.2 Limite de 1000 produits**
```typescript
const productsResult = await listProducts(tenantId, { limit: 1000 });
```
- Pour `taux_rotation`, `cout_stock_moyen`, etc., `scope='all'` s’appuie sur une liste limitée à 1000 produits.
- **Recommandation** : documenter la limite ou prévoir une requête SQL directe pour les agrégations globales.

**3.3 `Infinity` dans le résultat**
```typescript
return { result: Infinity, unit: 'jours', formula_name: 'jours_stock_restant' };
```
- `Infinity` peut poser des soucis côté API (JSON) et frontend.
- **Recommandation** : utiliser `null` ou une valeur sentinelle (ex. `999999`) et documenter le sens.

---

### 4. `formula.routes.ts`

#### ⚠️ Conflit de routes potentiel
- `GET /formulas/predefined/:id` → formule par ID
- `POST /formulas/:id/execute` → exécution
- Pour `POST /formulas/predefined/xxx/execute`, `:id` capterait `"predefined"` → 404.
- **Recommandation** : utiliser une structure cohérente, par ex. :
  - `POST /formulas/predefined/:id/execute` pour les formules prédéfinies
  - ou conserver `POST /formulas/:id/execute` et s’assurer qu’un UUID est toujours attendu (prédefined ou custom).

---

### 5. Pages HTML (`import-sales.html`, `formulas.html`)

#### ⚠️ Risque XSS
```javascript
// import-sales.html ligne 171-172
d.errors.slice(0, 20).forEach(e => { 
  html += `<li>Ligne ${e.row}: ${e.message}${e.value ? ` (${e.value})` : ''}</li>`; 
});
```
- `e.message` et `e.value` viennent du serveur et sont insérés en HTML sans échappement.
- Si un message ou une valeur contient `<script>`, il peut être exécuté.
- **Recommandation** : échapper le HTML :
```javascript
function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
html += `<li>Ligne ${e.row}: ${escapeHtml(e.message)}${e.value ? ` (${escapeHtml(e.value)})` : ''}</li>`;
```

**Autres insertions à sécuriser**
- `formulas.html` : `f.description`, `f.name`, `p.name`, `p.sku` dans les options
- `import-sales.html` : `col` dans le mapping, données de prévisualisation

#### ⚠️ Token JWT en clair
- Le token est saisi dans un `<input type="text">` et reste visible.
- **Recommandation** : pour la prod, prévoir une vraie page de login et stocker le token en session/cookie httpOnly plutôt qu’en input.

---

### 6. Tests

#### ✅ Points positifs
- Tests unitaires : `parseFile`, `suggestMapping`, `getImportPreview`, `CSV_TEMPLATE`
- Tests d’intégration : template, preview, import valide/invalide, mapping personnalisé, isolation multi-tenant
- Cas d’erreur couverts : SKU invalide, date invalide, quantité invalide

#### ⚠️ Manques
- Pas de test pour `validateRow` (dépendant de la DB)
- Pas de test pour un CSV vide ou avec uniquement des en-têtes
- Pas de test pour un lot partiel (certaines lignes valides, d’autres en erreur dans le même fichier)
- Pas de test de charge pour de gros fichiers

---

## 🔒 Sécurité

| Point | Statut |
|-------|--------|
| Authentification sur les routes import/formulas | ✅ |
| Multi-tenant (RLS) | ✅ |
| Limitation taille fichier (5 MB) | ✅ |
| Filtre type fichier (CSV) | ✅ |
| Échappement HTML (XSS) | ⚠️ À corriger |
| Validation mapping utilisateur | ⚠️ À renforcer |

---

## 📝 Recommandations Prioritaires

1. **Haute** : Échapper les sorties HTML dans `import-sales.html` et `formulas.html` pour éviter le XSS.
2. **Haute** : Placer les routes `/sales/import/*` avant `GET /sales/:id` pour éviter les futurs conflits.
3. **Moyenne** : Factoriser `computeTotalAmount` entre `sales.service.ts` et `sales-import.service.ts`.
4. **Moyenne** : Documenter l’usage d’INSERT direct au lieu de `createSale` dans la spec / le code.
5. **Basse** : Gérer le résultat `Infinity` dans `jours_stock_restant` (ex. `null` ou valeur max documentée).
6. **Basse** : Ajouter des tests pour CSV vide, lot partiel valide/erreur, et cas limites.

---

## ✅ Conclusion

L’implémentation des stories 3.2 et 3.3 est solide et alignée avec l’architecture existante. Les principaux axes d’amélioration concernent la sécurité (XSS), la structure des routes, et la réutilisation du code métier. Les corrections proposées sont limitées et compatibles avec un merge après traitement des points haute priorité.
