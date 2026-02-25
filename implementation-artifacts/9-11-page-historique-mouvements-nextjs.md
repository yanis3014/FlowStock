# Story 9.11: Page Historique des mouvements (Next.js)

**Status:** ready-for-dev

<!-- Note: Run validate-create-story for quality check before dev-story. -->

## Story

**As a** gérant de PME,  
**I want** une page Historique des mouvements dans l’app Next.js avec filtres (produit, type, dates),  
**so that** je consulte l’historique des mouvements de stocks sans quitter l’app ni coller de token.

## Acceptance Criteria

1. **Given** l’utilisateur est connecté **When** il ouvre la page Mouvements **Then** aucun champ Token JWT n’est affiché ; les données sont chargées via useApi.
2. **And** un filtre « Produit » (select chargé depuis GET /products) permet de restreindre l’historique à un produit.
3. **And** des filtres optionnels : type de mouvement (création, quantity_update, deletion, import), date début, date fin.
4. **And** un tableau affiche les mouvements (date, type, utilisateur, ancienne qté, nouvelle qté, raison) avec pagination ou chargement progressif si nécessaire.
5. **And** un bouton « Exporter CSV » (ou lien) permet de télécharger les données filtrées (export côté client ou GET export si l’API l’expose).
6. **And** chargement (skeleton), message « Aucun mouvement » et design cohérents avec le shell.

## Tasks / Subtasks

- [ ] Task 1 — Remplacement du placeholder (AC: 1, 6)
  - Remplacer le contenu de `app/(app)/movements/page.tsx`.
  - useAuth, useApi ; redirection /login si non connecté.

- [ ] Task 2 — Filtres (AC: 2, 3)
  - GET /products (liste) pour le select Produit.
  - Select type : Tous | création | quantity_update | deletion | import (valeurs selon API).
  - Inputs date début / date fin (datetime-local ou date).
  - Bouton « Rafraîchir » pour recharger avec les filtres courants.

- [ ] Task 3 — Tableau des mouvements (AC: 4)
  - Appel GET mouvements : endpoint selon API (ex. GET /products/:id/movements avec query type, date_from, date_to ; ou GET /movements?product_id=…).
  - Colonnes : Date, Type, Utilisateur, Ancienne qté, Nouvelle qté, Raison (ou champs exposés par l’API).
  - Skeleton pendant chargement. Message « Sélectionnez un produit » ou « Aucun mouvement » selon le cas.
  - Pagination si l’API la supporte.

- [ ] Task 4 — Export CSV (AC: 5)
  - Bouton « Exporter CSV » : génération côté client à partir des données déjà chargées (tableau en mémoire) ou appel GET /movements/export?… si l’API fournit un export.
  - Téléchargement du fichier (blob + lien de téléchargement).

## Dev Notes

### Contexte et dépendances

- **Stories 9.1–9.5** (done). Référence legacy : `apps/api/public/movements.html` (produit, type, dates, tableau, export CSV).
- API : docs/api-specifications.md — historique mouvements (GET /products/:id/movements ou équivalent).

### APIs

| Endpoint | Méthode | Rôle |
|----------|---------|------|
| /products | GET | Liste produits pour le select |
| /products/:id/movements | GET | Historique mouvements d’un produit ; query : movement_type?, date_from?, date_to? |
| (optionnel) /movements/export | GET | Export CSV si exposé |

Réponse mouvements typique : id, product_id, movement_type, quantity_before, quantity_after, reason, user_id, created_at. Adapter aux champs réels de l’API.

### Structure de la page

- Bloc filtres : Produit (select), Type (select), Date début, Date fin, Rafraîchir, Exporter CSV.
- Tableau : DataTable ou table Tailwind avec colonnes ci-dessus.
- Notice rétention (ex. « Données conservées 30 / 90 / 365 jours selon abonnement ») si pertinent.
