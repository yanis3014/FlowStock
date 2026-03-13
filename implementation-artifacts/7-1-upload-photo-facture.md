# Story 7-1 — Upload photo facture

## Status: done

## Story
En tant que gérant, je peux uploader une photo ou un PDF de facture fournisseur afin que l'IA puisse l'analyser.

## Acceptance Criteria
- [x] Composant `<InvoiceUpload />` avec drag & drop + bouton parcourir
- [x] Accepte : JPG, PNG, PDF (max 10 Mo)
- [x] Skeleton loader pendant le traitement
- [x] Route : page `/livraisons/nouvelle`
- [x] Aperçu du fichier sélectionné avant envoi

## Dev Agent Record

### Implementation Notes
- Page `/livraisons/nouvelle/page.tsx` créée (flow complet stories 7-1 à 7-5)
- Composant `InvoiceUpload` intégré dans la page
- Navigation mise à jour dans `nav-config.ts`
- API endpoint `POST /invoices/upload` créé avec multer

## File List
- apps/web/src/app/(app)/livraisons/nouvelle/page.tsx (created)
- apps/web/src/lib/nav-config.ts (modified)
- apps/web/src/components/layout/AppSidebar.tsx (modified)
- apps/api/src/routes/invoice.routes.ts (created)
- apps/api/src/services/invoice.service.ts (created)
- apps/api/migrations/V020__create_invoices.sql (created)
- apps/api/src/index.ts (modified)
- packages/shared/src/types/index.ts (modified)

## Change Log
- 2026-03-13: Story créée et implémentée
