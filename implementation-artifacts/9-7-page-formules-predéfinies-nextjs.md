# Story 9.7: Page Formules prédéfinies (Next.js)

**Status:** done

<!-- Note: Run validate-create-story for quality check before dev-story. -->

## Story

**As a** gérant de PME,  
**I want** une page Formules de calcul prédéfinies dans l’app Next.js,  
**so that** j’utilise les formules standards (consommation moyenne, stock de sécurité, etc.) sans quitter l’app.

## Acceptance Criteria

1. **Given** l’utilisateur est connecté **When** il ouvre la page Formules **Then** la liste des formules prédéfinies est chargée (GET /formulas/predefined) et affichée sans champ token manuel.
2. **And** l’utilisateur peut sélectionner une formule et optionnellement un produit, une période (jours), une portée (tous / produit).
3. **And** un bouton « Calculer » déclenche l’évaluation (POST /formulas/evaluate ou équivalent) et affiche le résultat.
4. **And** les états de chargement et les erreurs (syntaxe, produit requis) sont gérés et affichés clairement.
5. **And** une courte documentation des formules (noms, variables utilisées) est visible sur la page.
6. **And** le design est cohérent avec le shell (Tailwind, primary, sections lisibles).

## Tasks / Subtasks

- [x] Task 1 — Remplacement du placeholder (AC: 1, 6)
  - Remplacer le contenu de `app/(app)/formulas/page.tsx`.
  - useAuth, useApi ; redirection /login si non connecté. Pas de champ token.

- [x] Task 2 — Liste des formules et paramètres (AC: 1, 2)
  - GET /formulas/predefined au montage ; afficher cartes ou liste (nom, description, formula_expression, variables_used).
  - Sélection : formule, produit (GET /products pour un select), période (nombre, défaut 30), portée (all / product).
  - Bouton « Calculer » activé quand la formule (et le produit si requis) est renseigné.

- [x] Task 3 — Exécution et résultat (AC: 3, 4)
  - POST /formulas/evaluate avec formula_id, product_id (si portée produit), paramètres selon API.
  - Afficher le résultat (valeur, libellé) ; en cas d’erreur 400, afficher le message (ex. « Produit requis pour cette formule »).
  - Skeleton ou spinner pendant l’appel.

- [x] Task 4 — Documentation (AC: 5)
  - Bloc « Documentation des formules » : résumé des 8 formules (consommation moyenne, stock de sécurité, point de commande, etc.) avec variables utilisées. Données dérivées de l’API ou texte statique selon specs.

## Dev Notes

### Contexte et dépendances

- **Stories 9.1–9.5** (done). Référence legacy : `apps/api/public/formulas.html`.
- API : docs/api-specifications.md § 7 (Formulas Service).

### APIs

| Endpoint | Méthode | Rôle |
|----------|---------|------|
| /formulas/predefined | GET | Liste des formules prédéfinies (id, name, description, formula_expression, variables_used) |
| /formulas/evaluate | POST | Évaluer une formule ; body: formula_id, product_id?, paramètres selon formule |
| /products | GET | Liste produits pour le select (optionnel) |

### Structure de la page

- Section 1 : Liste des formules (cartes ou tableau).
- Section 2 : Paramètres (formule sélectionnée, produit, période, portée) + bouton Calculer.
- Section 3 : Résultat ou message d’erreur.
- Section 4 : Documentation des formules (repliée ou toujours visible).
