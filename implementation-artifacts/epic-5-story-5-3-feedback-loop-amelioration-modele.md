# Story 5.3 : Feedback loop + amélioration du modèle

Status: in-progress

## Story

As a **gérant de restaurant**,
I want **que l'IA apprenne de mes corrections au fil du temps**,
so that **les prochaines extractions de menu soient plus proches de mes portions habituelles**.

## Acceptance Criteria

1. **Given** je valide une fiche technique en ayant modifié des ingrédients
   **When** la fiche est enregistrée
   **Then** la correction est loggée dans `extraction_feedback` (extraction IA + correction humaine)

2. **Given** des corrections précédentes existent dans ma base
   **When** j'effectue une nouvelle extraction
   **Then** les 3 dernières corrections validées sont injectées dans le system prompt (few-shot)

3. **Given** une nouvelle image est analysée
   **When** les feedbacks récents sont disponibles
   **Then** le modèle tient compte des exemples du tenant pour adapter les portions

## Tasks / Subtasks

- [x] Task 1 — Migration base de données
  - [x] 1.1 Créer `V021__create_extraction_feedback.sql` (table `extraction_feedback` avec RLS)
- [x] Task 2 — Types partagés
  - [x] 2.1 Ajouter `ExtractionFeedback`, `ExtractionFeedbackCreateInput` dans `@bmad/shared`
- [x] Task 3 — Service et routes API
  - [x] 3.1 Créer `apps/api/src/services/extraction-feedback.service.ts`
  - [x] 3.2 Créer `apps/api/src/routes/extraction-feedback.routes.ts` (GET/POST /extraction-feedback)
  - [x] 3.3 Enregistrer les routes dans `apps/api/src/index.ts`
- [x] Task 4 — Intégration few-shot côté web
  - [x] 4.1 Dans `menu-scan/page.tsx` : récupérer les 3 derniers feedbacks via `GET /extraction-feedback?limit=3`
  - [x] 4.2 Les passer à `extractMenuFromImage()` comme `recentFeedbacks`
  - [x] 4.3 Dans `menu-scan/actions.ts` : injecter les feedbacks dans le system prompt
- [x] Task 5 — Enregistrement automatique feedback
  - [x] 5.1 Après validation d'une fiche, si corrections != extraction IA → POST /extraction-feedback

## Dev Notes

- Le feedback n'est enregistré que si le gérant a modifié quelque chose (hasChanged)
- Les feedbacks sont non-bloquants (fire-and-forget, catch silencieux)
- Few-shot : format textuel dans le system prompt (pas de message séparé dans la conversation)
- RLS appliquée : chaque tenant ne voit que ses propres feedbacks

## File List

- `apps/api/migrations/V021__create_extraction_feedback.sql` [CREATED]
- `packages/shared/src/types/index.ts` [MODIFIED]
- `apps/api/src/services/extraction-feedback.service.ts` [CREATED]
- `apps/api/src/routes/extraction-feedback.routes.ts` [CREATED]
- `apps/api/src/index.ts` [MODIFIED]
- `apps/web/src/app/(app)/menu-scan/page.tsx` [MODIFIED]
- `apps/web/src/app/(app)/menu-scan/actions.ts` [MODIFIED]

## Dev Agent Record

- Agent: Claude Sonnet 4.6
- Date: 2026-03-13
- Status: done
