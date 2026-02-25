# Story 9.8: Page Formules personnalisées (Next.js)

**Status:** done

<!-- Note: Run validate-create-story for quality check before dev-story. -->

## Story

**As a** gérant de PME,  
**I want** une page Formules personnalisées dans l’app Next.js pour créer et gérer mes formules,  
**so that** j’utilise des calculs sur mesure (variables stocks/ventes) sans quitter l’app.

## Acceptance Criteria

1. **Given** l’utilisateur est connecté **When** il ouvre la page Formules personnalisées **Then** il peut voir l’éditeur et la bibliothèque de formules (GET /formulas avec filtre custom ou équivalent) sans champ token manuel.
2. **And** l’éditeur permet de saisir nom, description et expression de formule ; une prévisualisation (produit optionnel, portée) est disponible (POST /formulas/evaluate ou preview si l’API l’expose).
3. **And** sauvegarde d’une nouvelle formule (POST /formulas) et mise à jour d’une formule existante (PUT /formulas/:id si disponible).
4. **And** la bibliothèque liste les formules personnalisées avec actions (éditer, supprimer si l’API le permet).
5. **And** une section ou onglet « Variables & Fonctions » documente les variables disponibles (STOCK_ACTUEL, VENTES_7J, etc.) pour aider à la saisie.
6. **And** chargement, erreurs (syntaxe, validation) et design cohérents avec le shell.

## Tasks / Subtasks

- [x] Task 1 — Remplacement du placeholder (AC: 1, 6)
  - Remplacer le contenu de `app/(app)/custom-formulas/page.tsx`.
  - useAuth, useApi ; pas de token manuel. Redirection /login si non connecté.

- [x] Task 2 — Éditeur de formule (AC: 2, 3)
  - Champs : nom, description, expression (textarea). Optionnel : produit pour prévisualisation, portée (all / product).
  - Boutons : Prévisualiser (POST /formulas/evaluate ou endpoint dédié), Sauvegarder (POST /formulas ou PUT si édition).
  - Gestion erreur 400 (syntaxe invalide, variables inconnues) avec message clair.
  - Si l’API expose une validation sans évaluation : l’utiliser pour feedback en temps réel (optionnel).

- [x] Task 3 — Bibliothèque (AC: 4)
  - GET /formulas (ou /formulas/custom) pour lister les formules personnalisées.
  - Affichage en liste ou cartes ; clic « Éditer » préremplit l’éditeur et permet PUT.
  - Suppression (DELETE /formulas/:id) si l’API le permet, avec confirmation.

- [x] Task 4 — Documentation variables (AC: 5)
  - Bloc « Variables & Fonctions » : liste des variables (STOCK_ACTUEL, VENTES_7J, PRIX_VENTE, etc.) et fonctions (AVG, IF, …) selon docs API ou custom-formulas.html.
  - Affichage en onglet ou section repliable.

## Dev Notes

### Contexte et dépendances

- **Stories 9.1–9.5** (done). Référence legacy : `apps/api/public/custom-formulas.html` (onglets Éditeur, Bibliothèque, Variables & Fonctions).
- API : docs/api-specifications.md § 7.

### APIs

| Endpoint | Méthode | Rôle |
|----------|---------|------|
| /formulas | GET | Liste formules (filtrer type custom si possible) |
| /formulas | POST | Créer formule custom (name, description, formula_expression) |
| /formulas/:id | GET, PUT, DELETE | Détail, mise à jour, suppression (si exposé) |
| /formulas/evaluate | POST | Évaluer (formula_id, product_id?) pour prévisualisation |

### Structure de la page

- Onglets ou sections : Éditeur | Bibliothèque | Variables & Fonctions.
- Éditeur : formulaire + prévisualisation + Sauvegarder / Réinitialiser.
- Bibliothèque : tableau ou cartes avec actions Éditer / Supprimer.
