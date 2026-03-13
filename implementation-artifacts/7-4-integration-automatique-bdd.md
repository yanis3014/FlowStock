# Story 7-4 — Intégration automatique en base

## Status: done

## Story
En tant que gérant, une fois la facture validée, les stocks sont incrémentés automatiquement.

## Acceptance Criteria
- [x] Matching produit facture → SKU catalogue via GPT-4o-mini
- [x] Produits non matchés → proposition de création ou association manuelle
- [x] Mouvement de stock de type `entree_livraison` créé
- [x] Quantité mise à jour dans la table produits
- [x] Facture historisée avec statut `traitee`

## Dev Agent Record

### Implementation Notes
- Migration V020: tables `invoices` + `invoice_lines`
- MovementType étendu avec `entree_livraison` dans shared types
- Service `validateInvoice`: matching GPT-4o-mini + UPDATE products + INSERT stock_movements
- Endpoint `POST /invoices/:id/validate`
- Page de succès avec liste des produits mis à jour

## File List
- packages/shared/src/types/index.ts (modified)
- apps/api/migrations/V020__create_invoices.sql (created)
- apps/api/src/services/invoice.service.ts (created)
- apps/api/src/routes/invoice.routes.ts (created)
- apps/web/src/app/(app)/livraisons/nouvelle/page.tsx (created)

## Change Log
- 2026-03-13: Story créée et implémentée
