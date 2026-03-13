# Story 7-3 — Vérification automatique commande vs facture

## Status: done

## Story
En tant que gérant, je peux visualiser les écarts entre la facture reçue et les produits attendus de ce fournisseur.

## Acceptance Criteria
- [x] Matching par nom fournisseur (exact puis fuzzy)
- [x] Comparaison ligne par ligne : stock actuel vs quantité facturée
- [x] Mise en évidence des écarts (produits non reconnus, surplus, manquants)
- [x] Le gérant valide ou corrige avant intégration

## Dev Agent Record

### Implementation Notes
- Pas de table `commandes` en DB → comparaison contre produits du fournisseur dans le catalogue
- Service `invoice.service.ts` : fonction `matchInvoiceLines` avec GPT-4o-mini
- Colonne "Stock actuel" affichée pour contexte
- Écarts mis en évidence : produit non trouvé en rouge, différence de quantité en orange

## File List
- apps/api/src/services/invoice.service.ts (created)
- apps/web/src/app/(app)/livraisons/nouvelle/page.tsx (created)

## Change Log
- 2026-03-13: Story créée et implémentée
