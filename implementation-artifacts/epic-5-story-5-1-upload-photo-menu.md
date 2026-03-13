# Story 5.1 : Upload photo menu/carte + extraction IA vision NLP

Status: in-progress

## Story

As a **gérant de restaurant**,
I want **uploader une photo de ma carte ou de mon menu et laisser l'IA extraire automatiquement les fiches techniques**,
so that **je n'ai pas à saisir manuellement chaque plat et ses ingrédients**.

## Acceptance Criteria

1. **Given** je suis sur la page Fiches techniques
   **When** je clique sur "Par photo"
   **Then** je suis redirigé vers `/menu-scan` où je peux uploader une image (JPG, PNG, WebP, max 15 Mo)

2. **Given** j'ai uploadé une image de menu
   **When** l'IA analyse l'image (GPT-4o Vision)
   **Then** les plats extraits s'affichent sous forme de cartes avec nom, ingrédients proposés et badge de confiance (high/medium/low)

3. **Given** l'extraction est en cours
   **When** j'attends la réponse de l'IA
   **Then** un skeleton animé s'affiche avec le message "Analyse en cours…"

4. **Given** la clé OPENAI_API_KEY est absente
   **When** je tente une extraction
   **Then** un message d'erreur clair s'affiche sans crash

## Tasks / Subtasks

- [x] Task 1 — Composant ImageDropZone
  - [x] 1.1 Créer `apps/web/src/components/image/ImageDropZone.tsx` (drag & drop + click, JPG/PNG/WebP, max 15 Mo, readAsDataURL)
- [x] Task 2 — Server Action vision
  - [x] 2.1 Créer `apps/web/src/app/(app)/menu-scan/actions.ts` avec `extractMenuFromImage()` appelant GPT-4o Vision
  - [x] 2.2 Prompt système conforme à l'epic (JSON valide, plats avec ingrédients et confiance)
- [x] Task 3 — Page `/menu-scan`
  - [x] 3.1 Créer `apps/web/src/app/(app)/menu-scan/page.tsx` machine à états (IDLE → EXTRACTING → REVIEW)
  - [x] 3.2 Cartes par plat avec badge confiance, liste ingrédients
- [x] Task 4 — Lien depuis fiches-techniques
  - [x] 4.1 Connecter bouton "Par photo" sur `/fiches-techniques/page.tsx` → `/menu-scan`

## Dev Notes

- Modèle obligatoire : **GPT-4o** (vision, pas gpt-4o-mini)
- Pattern : reprendre la machine à états de `import-stocks/page.tsx` (IDLE → TRANSFORMING → REVIEW)
- ImageDropZone : `reader.readAsDataURL` → base64 data URL → Server Action → OpenAI `image_url` field
- Aucun SDK OpenAI, appel fetch direct comme dans `import-stocks/actions.ts`
- `temperature: 0`, `response_format: { type: "json_object" }`

## File List

- `apps/web/src/components/image/ImageDropZone.tsx` [CREATED]
- `apps/web/src/app/(app)/menu-scan/actions.ts` [CREATED]
- `apps/web/src/app/(app)/menu-scan/page.tsx` [CREATED]
- `apps/web/src/app/(app)/fiches-techniques/page.tsx` [MODIFIED]

## Dev Agent Record

- Agent: Claude Sonnet 4.6
- Date: 2026-03-13
- Status: review
