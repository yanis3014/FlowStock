# Story 7-2 — Extraction IA facture OCR

## Status: done

## Story
En tant que gérant, je peux laisser l'IA (GPT-4o vision) extraire automatiquement les lignes produits d'une facture uploadée.

## Acceptance Criteria
- [x] Modèle GPT-4o utilisé (pas mini) pour les factures
- [x] Support images JPG/PNG via base64 vision
- [x] Support PDF via attachment base64
- [x] Prompt structuré retournant JSON valide : fournisseur, date, lignes, total, confiance
- [x] `temperature: 0`
- [x] Résultat affiché dans un tableau éditable

## Dev Agent Record

### Implementation Notes
- Service `invoice.service.ts` : fonction `uploadAndExtractOCR`
- Appel OpenAI avec `gpt-4o` + vision
- Support JPG/PNG: `image_url` base64
- Support PDF: `type: file` avec base64
- Tableau éditable dans la page `/livraisons/nouvelle`
- Badge de confiance (high/medium/low)

## File List
- apps/api/src/services/invoice.service.ts (created)
- apps/api/src/routes/invoice.routes.ts (created)
- apps/web/src/app/(app)/livraisons/nouvelle/page.tsx (created)

## Change Log
- 2026-03-13: Story créée et implémentée
