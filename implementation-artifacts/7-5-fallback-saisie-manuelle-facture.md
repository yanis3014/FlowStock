# Story 7-5 — Fallback saisie manuelle facture

## Status: done

## Story
En tant que gérant, si l'OCR échoue ou que la confiance est faible, je peux saisir manuellement les lignes de la facture.

## Acceptance Criteria
- [x] Formulaire ligne par ligne : désignation, quantité, unité, prix
- [x] Même flow de validation et d'intégration que 7-4
- [x] Conservation du fichier facture même en saisie manuelle (traçabilité)
- [x] Bouton "Réessayer l'OCR" si le gérant veut retenter

## Dev Agent Record

### Implementation Notes
- Formulaire de saisie manuelle intégré dans la page `/livraisons/nouvelle`
- Affiché automatiquement si confiance === 'low' ou si OCR échoue
- Bouton "Réessayer l'OCR" rechargeable à tout moment
- Bouton "+ Ajouter une ligne" pour saisie manuelle
- Même endpoint `POST /invoices/:id/validate` utilisé

## File List
- apps/web/src/app/(app)/livraisons/nouvelle/page.tsx (created)

## Change Log
- 2026-03-13: Story créée et implémentée
