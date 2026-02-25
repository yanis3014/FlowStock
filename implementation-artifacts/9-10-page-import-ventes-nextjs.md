# Story 9.10: Page Import ventes (Next.js)

**Status:** ready-for-dev

<!-- Note: Run validate-create-story for quality check before dev-story. -->

## Story

**As a** gérant de PME,  
**I want** une page Import ventes dans l’app Next.js (template CSV, mapping, prévisualisation, import),  
**so that** j’importe mes ventes depuis un CSV sans quitter l’app ni coller de token.

## Acceptance Criteria

1. **Given** l’utilisateur est connecté **When** il ouvre la page Import ventes **Then** aucun champ Token JWT n’est affiché ; les appels utilisent useApi (Bearer) et CSRF si requis.
2. **And** un lien « Télécharger le template CSV » permet de récupérer le template (fichier statique ou endpoint).
3. **And** l’utilisateur sélectionne un fichier CSV, lance une prévisualisation (parsing côté client ou API preview), puis configure le mapping des colonnes (fichier → champs API).
4. **And** un aperçu des données mappées est affiché avant import.
5. **And** un bouton « Importer » envoie les données (POST /sales/import) et affiche le résultat (succès, importés, échecs).
6. **And** chargement, erreurs et design cohérents avec le shell.

## Tasks / Subtasks

- [ ] Task 1 — Remplacement du placeholder (AC: 1, 6)
  - Remplacer le contenu de `app/(app)/import-sales/page.tsx`.
  - useAuth, useApi ; CSRF si nécessaire. Redirection /login si non connecté.

- [ ] Task 2 — Template et fichier (AC: 2, 3)
  - Lien template CSV (public ou API).
  - Input file accept=".csv" ; lecture CSV côté client pour prévisualisation.
  - Bouton « Prévisualiser » : afficher colonnes et premières lignes.

- [ ] Task 3 — Mapping et aperçu (AC: 4)
  - Mapping colonnes fichier → champs ventes (product_id, quantity, date, location_id, etc. selon API).
  - Tableau aperçu après mapping.

- [ ] Task 4 — Import et résultat (AC: 5)
  - POST /sales/import (FormData ou JSON selon API) avec CSRF si requis.
  - Affichage résultat : importés, échecs, messages d’erreur.
  - Gestion 400 / 413 avec messages clairs.

## Dev Notes

### Contexte et dépendances

- **Stories 9.1–9.5** (done). Référence legacy : `apps/api/public/import-sales.html`.
- API : docs/api-specifications.md — POST /sales/import.

### APIs

| Endpoint | Méthode | Rôle |
|----------|---------|------|
| /sales/import | POST | Import ventes depuis CSV |
| /csrf-token | GET | CSRF si requis |

### Structure de la page

- Même flux que Import stocks : Template → Fichier → Prévisualiser → Mapping → Aperçu → Importer → Résultat.
- Champs ventes typiques : product_id, quantity, unit_price, date, location_id, source, etc. (vérifier api-specifications.md).
