# Code Review – stock-estimates.html (front-end)

**Date :** 18 février 2026  
**Fichier examiné :** `apps/api/public/stock-estimates.html`  
**Contexte :** Page « Estimations temps stock » (layout partagé, BmadApiClient, design system)

---

## 1. Résumé exécutif

| Critère            | Statut |
|--------------------|--------|
| Structure / lisibilité | ✅ Bonne |
| Sécurité (XSS)     | ✅ Données échappées |
| Auth / session     | ✅ BmadApiClient, 401/403 → login |
| Spec front-end     | ✅ Debounce 250 ms, layout, design system |
| Accessibilité      | ⚠️ À améliorer (tri, tooltips) |
| Bugs fonctionnels  | ⚠️ Tooltips non opérationnels |

**Verdict :** Code solide et maintenable. Quelques corrections mineures recommandées (tooltips, accessibilité, style).

---

## 2. Points positifs

### 2.1 Architecture et intégration

- **IIFE + `'use strict'`** : pas de fuite dans le scope global.
- **Layout partagé** : `#layout-nav`, `#layout-header`, `layout.js`, `data-page-title` conformes au reste du projet.
- **API** : utilisation de `BmadApiClient` (JWT, CSRF, redirection login sur 401/403), cohérente avec `dashboard.html` et la spec.
- **Design** : `design-system.css` + Tailwind (couleurs primary/success/warning/error) alignés avec les autres pages.

### 2.2 Sécurité

- **XSS** : `escapeHtml()` utilisé pour `product_name`, `sku`, `unit` et toute donnée utilisateur affichée dans le tableau. Pas d’injection HTML via les champs dynamiques.
- **Requête** : `encodeURIComponent(period)` pour le paramètre de période.

### 2.3 Logique métier et UX

- **Tri** : tri côté client par colonne avec indicateur ▲/▼ et gestion des `null` (toujours en fin).
- **Filtre** : recherche par `product_name` et `sku` avec **debounce 250 ms** (conforme à la spec front-end).
- **États vides** : messages distincts (« Cliquez sur Charger… », « Aucun produit trouvé », « Aucun produit ne correspond à votre recherche »).
- **Urgence** : `urgencyClass` / `urgencyLabel` pour jours restants (rouge &lt; 7 j, amber ≤ 14, jaune ≤ 30, vert, gris si null).
- **Fiabilité** : badges `confidence_level` (high/medium/low/insufficient) avec libellés en français.
- **Chargement** : bouton désactivé + libellé « Chargement… » pendant l’appel API, `finally` pour réactiver.

### 2.4 Gestion d’erreurs

- Vérification du token avant chargement ; message clair si non connecté.
- Affichage de `body.error` ou message générique si `!res.ok || !body.success`.
- `catch` réseau avec message explicite ; `clearError()` au début de `loadEstimates()`.

---

## 3. Problèmes et améliorations

### 3.1 Tooltips non fonctionnels (moyen)

**Lignes 125 et 130 :**

```html
return '<span class="tooltip" data-tip="Aucune vente enregistrée sur cette période">—</span>';
```

- La classe `.tooltip` et l’attribut `data-tip` ne sont **ni stylés ni gérés en JS** dans `design-system.css` ni dans cette page.
- L’utilisateur ne voit donc jamais l’explication au survol.

**Recommandation :**

- **Option A (rapide) :** Remplacer par l’attribut natif `title` :  
  `return '<span title="Aucune vente enregistrée sur cette période">—</span>';`
- **Option B :** Ajouter dans le design system (CSS + petit JS) la prise en charge de `.tooltip[data-tip]` et réutiliser sur les autres pages si besoin.

### 3.2 Accessibilité (priorité basse)

- **En-têtes de tableau triables :** les `<th>` sont cliquables mais n’ont pas `role="button"`, ni `aria-sort="ascending"|"descending"|"none"`, ni gestion clavier (Enter/Espace). Un lecteur d’écran ne signale pas qu’ils sont interactifs ni le sens du tri.
- **Suggestion :** Ajouter sur le `<th>` actif : `aria-sort="ascending"` ou `"descending"`, et `role="button"` + `tabindex="0"` + écoute de `keydown` (Enter/Espace) pour déclencher le tri.

### 3.3 Style de code (cosmétique)

- Mélange de `var` et de `const`/`let` dans le script (ex. `var cols`, `var tableClass`, `var res`, `var period`).
- **Suggestion :** Utiliser `const`/`let` partout pour rester cohérent avec le reste du projet (ex. `dashboard.html`, `api-client.js`).

### 3.4 Redondance mineure

- `BmadApiClient.setTokenGetter(...)` est appelé dans `loadEstimates()` (l.248) et une seconde fois en fin de script (l.302–304). Un seul appel à l’initialisation suffit.

### 3.5 Référence DOM `emptyState`

- La constante `emptyState` (l.74) pointe vers le premier nœud enfant de `#tableContainer`. Dès le premier `renderTable()` réussi, `tableContainer.innerHTML` est remplacé et ce nœud n’existe plus. La variable n’est jamais utilisée dans le script. Pas de bug, mais on peut la retirer pour éviter toute confusion.

---

## 4. Conformité API

- **Route :** `GET /stock-estimates?period_days=<n>` (alignée avec `stock-estimate.routes.ts`).
- **Période :** options 7, 14, 30, 60, 90 jours ; l’API accepte 7–365 → cohérent.
- **Réponse attendue :** `{ success: true, data: [...] }` avec champs `product_name`, `sku`, `current_stock`, `unit`, `avg_daily_consumption`, `days_remaining`, `estimated_stockout_date`, `confidence_level` → tous utilisés correctement dans le rendu.

---

## 5. Recommandations synthétiques

| Priorité | Action |
|----------|--------|
| Moyenne   | Rendre les tooltips opérationnels : soit `title="..."`, soit implémentation `.tooltip[data-tip]` dans le design system. |
| Basse    | Améliorer l’accessibilité du tri (aria-sort, role, clavier). |
| Basse    | Uniformiser `var` → `const`/`let`. |
| Cosmétique | Supprimer le second `setTokenGetter` et la ref inutilisée `emptyState`. |

---

## 6. Conclusion

- **Sécurité, auth, intégration layout/API et UX (tri, filtre, états vides, chargement)** sont bien en place.
- Les **seuls points à traiter** pour une qualité « production » sont les tooltips (moyen) et, si souhaité, l’accessibilité et le style de code.

**Recommandation :** **Approuvé** avec correctifs mineurs (tooltips recommandés ; reste optionnel).
