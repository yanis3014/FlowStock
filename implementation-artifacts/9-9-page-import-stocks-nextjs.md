# Story 9.9: Page Import stocks (Next.js)

**Status:** ready-for-dev

<!-- Note: Run validate-create-story for quality check before dev-story. -->

## Story

**As a** gérant de PME,  
**I want** une page Import stocks dans l’app Next.js (template, mapping, prévisualisation, import),  
**so that** j’importe mes stocks depuis un CSV/Excel sans quitter l’app ni coller de token.

## Acceptance Criteria

1. **Given** l’utilisateur est connecté **When** il ouvre la page Import stocks **Then** aucun champ Token JWT n’est affiché ; les appels API utilisent useApi (Bearer token).
2. **And** un lien ou bouton « Télécharger le template CSV » permet de récupérer un fichier template (lien statique ou GET /products/import/template si l’API l’expose).
3. **And** l’utilisateur peut sélectionner un fichier (CSV, ou XLSX si l’API le supporte) puis lancer une prévisualisation (parsing côté client ou POST préview si disponible).
4. **And** un mapping des colonnes (fichier → champs API) est proposé (auto-détection + édition) avant import.
5. **And** un bouton « Importer » envoie les données (POST /products/import avec fichier ou corps selon API) et affiche le résultat (succès, nombre importés, erreurs éventuelles).
6. **And** états de chargement, erreurs (fichier invalide, 400) et design cohérents avec le shell.

## Tasks / Subtasks

- [ ] Task 1 — Remplacement du placeholder (AC: 1, 6)
  - Remplacer le contenu de `app/(app)/import-stocks/page.tsx`.
  - useAuth, useApi ; CSRF si requis (réutiliser mécanisme API existant). Redirection /login si non connecté.

- [ ] Task 2 — Template et sélection fichier (AC: 2, 3)
  - Lien « Télécharger le template CSV » : fichier statique dans public/ ou endpoint API.
  - Input file (accept .csv, .xlsx si supporté) ; lecture côté client (FileReader / lib CSV) pour prévisualisation sans round-trip si possible.
  - Bouton « Prévisualiser » : afficher les premières lignes et colonnes détectées.

- [ ] Task 3 — Mapping et aperçu (AC: 4)
  - Afficher les colonnes du fichier et permettre de les associer aux champs attendus (product_id, sku, quantity, location_id, etc. selon API).
  - Aperçu tableau (quelques lignes) après mapping. Validation avant import.

- [ ] Task 4 — Import et résultat (AC: 5)
  - POST /products/import : envoyer le fichier (FormData) ou les données mappées selon spécification API. Inclure CSRF si nécessaire.
  - Afficher le résultat : nombre importés, nombre en échec, détails des erreurs si l’API les renvoie.
  - Gestion 400 (validation) et 413 (fichier trop gros) avec messages clairs.

## Dev Notes

### Contexte et dépendances

- **Stories 9.1–9.5** (done). Référence legacy : `apps/api/public/import-stocks.html` (template, file, mapping, preview, import, result).
- API : docs/api-specifications.md — POST /products/import (CSV, champs attendus).

### APIs

| Endpoint | Méthode | Rôle |
|----------|---------|------|
| /products/import | POST | Import produits depuis CSV (body multipart ou JSON selon spec) |
| /products/import/template | GET | Template CSV (si exposé) |
| /csrf-token | GET | Obtenir un token CSRF si l’API l’exige pour POST |

### Structure de la page

- Étapes : 1) Template | 2) Sélection fichier + Prévisualiser | 3) Mapping colonnes | 4) Aperçu | 5) Importer | 6) Résultat.
- Réutiliser le flux de import-stocks.html en React (useState pour preview, mapping, result).
