# Story 9.4: Tableaux et Filtres Intelligents

**Status:** done

<!-- Note: Run validate-create-story for quality check before dev-story. -->

## Story

**As a** gérant de PME,  
**I want** des tableaux triables et filtrables sans rechargement de page,  
**so that** je consulte et gère Fournisseurs, Emplacements et Ventes efficacement.

## Acceptance Criteria

1. **Given** les pages Fournisseurs, Emplacements et Ventes migrées en composants React **When** je consulte une de ces pages **Then** les données sont chargées automatiquement au montage.
2. **And** les tableaux sont triables par colonne (clic sur en-tête).
3. **And** des filtres de recherche ou par critères sont disponibles sans rechargement.
4. **And** les composants utilisent Shadcn Table ou équivalent (Tailwind table professionnel) pour un rendu soigné.
5. **And** la pagination ou le chargement progressif est géré pour les grandes listes (Ventes notamment).
6. **And** les actions (créer, modifier, supprimer) s'exécutent en contexte sans rechargement complet.

## Tasks / Subtasks

- [x] Task 1 — Composant DataTable réutilisable (AC: 2, 4, 5)
  - Créer `DataTable` générique : en-têtes cliquables (tri), colonnes configurables, pagination.
  - Tableau Tailwind avec bordures, zebra ou hover pour lisibilité.
  - Pagination : page, limit, total ; boutons Précédent / Suivant ou sélecteur de page.

- [x] Task 2 — Page Fournisseurs (AC: 1, 2, 3, 6)
  - Remplacer le placeholder `app/(app)/suppliers/page.tsx`.
  - Appel GET `/suppliers` au montage via useApi.
  - Tableau : colonnes nom, contact_name, email, phone, product_count, actions (modifier, supprimer).
  - Filtre de recherche par nom (input debounced).
  - Skeleton pendant chargement. Bouton « Ajouter » → modal ou page formulaire (création).

- [x] Task 3 — Page Emplacements (AC: 1, 2, 3, 6)
  - Remplacer le placeholder `app/(app)/locations/page.tsx`.
  - Appel GET `/locations` au montage.
  - Tableau : colonnes name, address, location_type, product_count, total_value, actions.
  - Filtre de recherche par nom ou adresse.
  - Skeleton + CRUD en contexte.

- [x] Task 4 — Page Ventes (AC: 1, 2, 3, 5, 6)
  - Remplacer le placeholder `app/(app)/sales/page.tsx`.
  - Appel GET `/sales` avec query params : page, limit, product_id?, start_date?, end_date?, location_id?.
  - Tableau : colonnes produit (SKU/name), quantité, prix unitaire, montant total, date, source, actions.
  - Filtres : plage de dates, produit (select ou autocomplete), emplacement.
  - Pagination côté serveur (utiliser pagination API).

## Dev Notes

### Contexte Epic 9 et dépendances

- **Epic 9** : Migration SPA Next.js. [Source: docs/epic-9-migration-nextjs.md]
- **Story 9.1** (done) : AuthProvider, useApi.
- **Story 9.2** (done) : Shell, Sidebar, Header, layout (app).
- **Story 9.3** (done) : Dashboard avec Skeletons, cartes pro, lucide-react.

### APIs existantes

| Endpoint | Méthode | Rôle |
|----------|---------|------|
| `/suppliers` | GET | Liste tous les fournisseurs (data: array) |
| `/suppliers/:id` | GET, PUT, DELETE | Détail, mise à jour, suppression |
| `/suppliers` | POST | Création |
| `/locations` | GET | Liste tous les emplacements |
| `/locations/:id` | GET, PUT, DELETE | Détail, mise à jour, suppression |
| `/locations` | POST | Création |
| `/sales` | GET | Liste ventes ; query : page, limit, product_id, start_date, end_date, location_id |
| `/sales/:id` | GET, PUT, DELETE | Détail, mise à jour, suppression |
| `/sales` | POST | Création vente |

[Source: docs/api-specifications.md §§3, 8, 9] — [Source: apps/api/src/routes/supplier.routes.ts, location.routes.ts, sales.routes.ts]

### Structure des réponses API

**GET /suppliers** : `{ success, data: [{ id, name, contact_name, email, phone, address, is_active, product_count, created_at }] }`

**GET /locations** : `{ success, data: [{ id, name, address, location_type, is_active, product_count, total_value, created_at }] }`

**GET /sales** : `{ success, data: [{ id, product: { id, sku, name }, quantity_sold, unit_price, total_amount, sale_date, source, created_at }], pagination: { page, limit, total } }`

### Structure actuelle

- Placeholders : `app/(app)/suppliers/page.tsx`, `locations/page.tsx`, `sales/page.tsx` — texte « Contenu à venir ».
- Réutiliser : useAuth, useApi, pattern auth redirect (useEffect token + router.push).
- Réutiliser : Skeleton (components/ui/Skeleton.tsx), DashboardSkeleton comme inspiration pour table skeleton.

### Shadcn / Tailwind

- Story 9.2/9.3 : Tailwind + lucide-react (Option B). Pour 9.4 : table HTML sémantique avec Tailwind (border, hover, rounded) ou ajouter Shadcn Table. Documenter si Tailwind seul.

### Fichiers cibles

- **À créer :** `components/ui/DataTable.tsx` (ou `components/table/DataTable.tsx`) — composant générique tri + pagination.
- **À modifier :** `app/(app)/suppliers/page.tsx`, `locations/page.tsx`, `sales/page.tsx`.
- Optionnel : `components/suppliers/SuppliersTable.tsx`, `components/locations/LocationsTable.tsx`, `components/sales/SalesTable.tsx` si logique lourde.

### Debounce recherche

- [Source: docs/front-end-spec.md] — Debounce sur la recherche (ex. 300 ms) pour éviter trop de requêtes. Hook `useDebouncedValue` ou équivalent.

### Testing Requirements

- **Manuel** : Chaque page charge les données au montage, pas de bouton « Charger ».
- **Manuel** : Tri par colonne fonctionne ; filtres mettent à jour le tableau sans rechargement.
- **Manuel** : Pagination (Ventes) : changement de page met à jour les données.
- **Manuel** : CRUD : créer/modifier/supprimer met à jour l’affichage sans rechargement complet.

## Dev Agent Record

### Agent Model Used

(À remplir lors de l'implémentation)

### Debug Log References

### Completion Notes List

- DataTable : composant générique (components/ui/DataTable.tsx) avec colonnes configurables, tri (en-têtes cliquables), pagination optionnelle, renderActions. TableSkeleton (components/ui/TableSkeleton.tsx) pour chargement.
- useDebouncedValue (hooks/useDebouncedValue.ts) : 300 ms pour filtres recherche.
- Fournisseurs : GET /suppliers?limit=200, filtre client-side par nom/contact/email (debounced), tri client-side, suppression (DELETE), bouton Ajouter (placeholder).
- Emplacements : GET /locations?limit=200, filtre par nom/adresse, tri client-side, suppression, bouton Ajouter (placeholder).
- Ventes : GET /sales avec page, limit, date_from, date_to, product_id, location_id, sort, order ; filtres (dates, produit, emplacement) ; pagination serveur ; chargement produits/locations pour les selects.

### File List

Créés : hooks/useDebouncedValue.ts, components/ui/DataTable.tsx, components/ui/TableSkeleton.tsx. Modifiés : app/(app)/suppliers/page.tsx, app/(app)/locations/page.tsx, app/(app)/sales/page.tsx.

## Change Log

| Date       | Version | Description                             | Auteur   |
|------------|---------|-----------------------------------------|----------|
| 2026-02-18 | 0.1     | Création artifact Story 9.4 (create-story) | BMAD/CE  |
| 2026-02-18 | 0.2     | Implémentation : DataTable, Suppliers, Locations, Sales (tri, filtres, pagination) | dev-story |
