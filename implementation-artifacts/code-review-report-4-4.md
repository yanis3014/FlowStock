# Code Review – Story 4.4 (Alertes visuelles)

**Story:** docs/stories/4.4.story.md  
**Date:** 2026-02-09  
**Workflow:** BMM Code Review (adversarial)

---

## 1. Contexte et périmètre

- **Story key:** 4.4  
- **Fichier story:** `docs/stories/4.4.story.md`  
- **Statut story:** Review  
- **Git vs story :** Aucune « File List » dans le Dev Agent Record → tous les fichiers impactés sont issus de l’analyse git + code.

**Fichiers concernés par la story 4.4 (déduits du code et git) :**

- `apps/api/public/dashboard.html`
- `apps/api/src/services/dashboard.service.ts`
- `apps/api/src/routes/dashboard.routes.ts`
- `apps/api/src/__tests__/dashboard/dashboard.integration.test.ts`
- `e2e/tests/dashboard.spec.ts`
- Références dans `apps/api/src/index.ts` (routes dashboard), `docs/api-specifications.md` (dashboard/alert-threshold non documenté en détail)

---

## 2. Écart Git / Story

- **1 écart majeur :** La section « Dev Agent Record » → « File List » est vide (« À remplir lors de l’implémentation »). Les fichiers listés ci‑dessus ne sont pas documentés dans la story.  
- **Recommandation :** Compléter la story avec la liste des fichiers modifiés et un bref résumé des changements.

---

## 3. Validation des critères d’acceptation (AC)

| AC | Statut | Commentaire |
|----|--------|-------------|
| Alerte visuelle claire (badges, couleurs, icônes) | OK | Implémenté (high/medium/low, badges, icônes). |
| Alertes ruptures imminentes (prédiction IA si dispo) | PARTIEL | Rupture imminente présente mais logique backend incorrecte (voir bug critique). Pas de lien vers fiche produit / courbe. |
| Liste des alertes visible sur le dashboard | OK | Section « Alertes récentes », liste avec tri. |
| Filtrer par type d’alerte | OK | Filtres type, sévérité, statut (actives/résolues). |
| Marquer alerte « vue » ou « résolue » | OK | localStorage + boutons Marquer vue / Résoudre. |
| Notifications optionnelles pour alertes critiques | PARTIEL | Toast in‑app si `bmad_notifications_enabled !== 'false'`, mais **aucune UI pour activer/désactiver** cette préférence (AC non satisfaite). |
| Seuil configurable pour stock faible | OK | GET/PUT `/dashboard/alert-threshold`, UI seuil % + bouton Mettre à jour. |

---

## 4. Problèmes identifiés (3–10 minimum)

### CRITIQUE

1. **Syntaxe TypeScript dans un script HTML (dashboard.html)**  
   - **Fichier/ligne :** `apps/api/public/dashboard.html` (vers 417)  
   - **Code :** `const thresholdInput = document.getElementById('alertThreshold') as HTMLInputElement;`  
   - **Problème :** Le script est du JavaScript exécuté tel quel dans le navigateur. La syntaxe `as HTMLInputElement` est du TypeScript et provoque une **erreur de syntaxe** en exécution. La fonction `updateAlertThreshold()` peut ne pas fonctionner du tout selon le navigateur.  
   - **Action :** Supprimer ` as HTMLInputElement` (ou utiliser une variable typée uniquement si le fichier est compilé).

2. **Logique « rupture imminente » incorrecte (dashboard.service.ts)**  
   - **Fichier/ligne :** `apps/api/src/services/dashboard.service.ts` (vers 164)  
   - **Code :** `const estimatedDaysRemaining = product.quantity / (product.quantity / 30);`  
   - **Problème :** Cette expression vaut **toujours 30**, quel que soit le stock. La condition « rupture imminente » ne reflète pas la réalité.  
   - **Action :** Utiliser une vraie estimation (ex. consommation moyenne, données ventes) ou retirer/désactiver cette heuristique jusqu’à intégration des prédictions IA.

### HAUTE SÉVÉRITÉ

3. **AC « notifications optionnelles » non implémentée côté UI**  
   - **Fichier :** `apps/api/public/dashboard.html`  
   - **Problème :** La préférence `bmad_notifications_enabled` est lue en localStorage (défaut: activé) mais il n’existe **aucun contrôle** (case à cocher, paramètre) pour que l’utilisateur active/désactive les notifications pour alertes critiques.  
   - **Action :** Ajouter un réglage (ex. dans l’en-tête ou la section Alertes) : « Notifications pour alertes critiques » avec case à cocher + sauvegarde dans localStorage.

4. **Documentation story incomplète (File List vide)**  
   - **Fichier :** `docs/stories/4.4.story.md`  
   - **Problème :** Aucune trace des fichiers modifiés ni du périmètre livré dans le Dev Agent Record.  
   - **Action :** Remplir la section « Dev Agent Record » avec la liste des fichiers et un court résumé des changements.

### MOYENNE SÉVÉRITÉ

5. **Pas de lien vers fiche produit ou courbe de prévision depuis une alerte**  
   - **Fichier :** `apps/api/public/dashboard.html` (rendu des alertes)  
   - **Problème :** La story demande un « lien ou action rapide vers la fiche produit ou la courbe de prévision ». Les lignes d’alerte n’affichent aucun lien (ex. vers `/products?id=…` ou page prévision).  
   - **Action :** Ajouter un lien « Voir le produit » / « Voir la prévision » sur chaque alerte (au moins vers la fiche produit).

6. **Filtres alertes non persistés (session / URL)**  
   - **Fichier :** `apps/api/public/dashboard.html`  
   - **Problème :** La story demande la « persistance du filtre en session ou URL pour partage/refresh ». Les filtres sont uniquement en mémoire ; un rechargement réinitialise tout.  
   - **Action :** Persister les filtres (sessionStorage ou query params) et les réappliquer au chargement.

7. **Tests insuffisants pour les fonctionnalités 4.4**  
   - **Fichiers :** `apps/api/src/__tests__/dashboard/dashboard.integration.test.ts`, `e2e/tests/dashboard.spec.ts`  
   - **Problème :** Aucun test d’intégration pour GET/PUT `/dashboard/alert-threshold`. Aucun E2E pour : filtres par type/sévérité/statut, marquer vue/résolue, changement de seuil, préférence notifications.  
   - **Action :** Ajouter tests intégration pour `alert-threshold` et au moins un scénario E2E (filtre + marquer résolue + seuil).

### BASSE SÉVÉRITÉ

8. **Fonction dupliquée `markAlertUnresolved`**  
   - **Fichier :** `apps/api/public/dashboard.html`  
   - **Problème :** `markAlertUnresolved` est définie deux fois (fonction globale + `window.markAlertUnresolved`), avec le même corps. Code redondant et risque de divergence.  
   - **Action :** Ne garder qu’une seule définition (ex. uniquement `window.markAlertUnresolved`).

9. **Limite « Voir toutes les alertes »**  
   - **Fichier :** backend `dashboard.service.ts` (slice 0–10), frontend affiche uniquement ces 10.  
   - **Problème :** La story prévoit une « pagination ou limite affichée (ex: 10–20) avec lien Voir toutes les alertes ». Il n’y a pas de lien « Voir toutes les alertes » ni de pagination côté front.  
   - **Action :** Soit ajouter un lien + page/liste étendue, soit documenter la limite 10 comme choix MVP.

10. **Cohérence seuil dashboard vs badge produit**  
    - **Fichiers :** `dashboard.service.ts` (seuil configurable), `product.service.ts` (computeStockStatus : quantity <= minQuantity).  
    - **Problème :** Un produit peut être sous le seuil configurable (ex. 120 % de min_quantity) et donc avoir une alerte « stock faible » sur le dashboard, tout en restant affiché en « OK » dans la liste produits (car quantity > min_quantity).  
    - **Action :** Documenter ce comportement (alerte « préventive ») ou aligner l’affichage du statut produit avec le seuil tenant si souhaité.

---

## 5. Synthèse

- **Git vs story :** 1 écart (File List vide).  
- **Problèmes :** 2 critiques, 2 hauts, 4 moyens, 2 bas.  
- **Recommandation :** Corriger au minimum les 2 critiques et les 2 hauts avant de passer la story en « done ». Les moyens peuvent être traités en suivi ou documentés en limites connues.

---

## 6. Suite à donner

Choisir une des options suivantes :

1. **Corriger automatiquement** – Appliquer les correctifs (au moins critiques + hauts) dans le code et les tests, puis mettre à jour la story (File List, Dev Agent Record).  
2. **Créer des action items** – Ajouter une sous‑section « Review Follow-ups (AI) » dans la story avec des tâches `[ ] [AI-Review][Severity] Description [fichier:ligne]` pour chaque point.  
3. **Détails** – Approfondir un point précis (indiquer le numéro ou le fichier).

Indiquer [1], [2] ou [3] (ou le numéro de point à détailler).

---

## Correctifs appliqués (2026-02-09)

- **CRITIQUE 1** : Suppression de la syntaxe TypeScript `as HTMLInputElement` dans `dashboard.html` (script exécuté en JS pur).
- **CRITIQUE 2** : Correction de la logique « rupture imminente » dans `dashboard.service.ts` : suppression du calcul faux (`estimatedDaysRemaining` = 30), alerte rupture imminente uniquement quand stock déjà low/critical et `lead_time_days` renseigné, message sans faux « X jours ».
- **HAUT 3** : Ajout de l’UI « Notifications alertes critiques » (case à cocher dans la section Alertes, liée à `localStorage.bmad_notifications_enabled` + `initNotificationsPreference()`).
- **HAUT 4** : Complétion de la story (File List + Dev Agent Record + résumé implémentation).
- **LOW 8** : Suppression de la fonction dupliquée `markAlertUnresolved` (conservation uniquement de `window.markAlertUnresolved`).

**Statut story après correctifs :** in-progress (suivis MEDIUM/LOW restants : lien fiche produit, persistance filtres, tests alert-threshold/E2E, etc.).

---

## Correctifs MEDIUM/LOW (2026-02-09)

- **MEDIUM 5** : Liens « Voir le produit » (movements.html?product_id=) et « Courbe prévision » (forecast-page) ajoutés sur chaque alerte.
- **MEDIUM 6** : Persistance des filtres alertes en sessionStorage (clé `bmad_alert_filters`), rechargement au refresh.
- **MEDIUM 7** : Tests d’intégration GET/PUT `/dashboard/alert-threshold` dans `dashboard.integration.test.ts` ; E2E filtres par type, seuil + case notifications, marquer alerte résolue dans `dashboard.spec.ts`.
- **LOW 9** : Libellé sous la liste (« Affichage des X alertes les plus prioritaires ») + liens « Voir les mouvements » et « Courbes de prévision ».
- **LOW 10** : Commentaire dans `dashboard.service.ts` (seuil dashboard vs badge produit = alerte préventive volontaire).
