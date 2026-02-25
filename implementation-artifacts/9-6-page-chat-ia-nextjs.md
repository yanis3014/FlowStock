# Story 9.6: Page Chat IA (Next.js)

**Status:** done

<!-- Note: Run validate-create-story for quality check before dev-story. -->

## Story

**As a** gérant de PME,  
**I want** une page Chat IA intégrée dans l’app Next.js avec la même session que le reste de l’app,  
**so that** je pose des questions sur mes stocks sans quitter l’interface ni coller un token.

## Acceptance Criteria

1. **Given** l’utilisateur est connecté (session 9.1) **When** il ouvre la page Chat **Then** aucun champ « Token JWT » n’est affiché ; le token est fourni automatiquement via useApi / AuthContext.
2. **And** la zone de messages affiche l’historique de la conversation courante (GET /api/v1/chat/history ou équivalent selon API ML).
3. **And** l’utilisateur peut envoyer un message (POST /api/v1/chat/message) et recevoir la réponse de l’IA dans la même page.
4. **And** création / sélection de conversation (nouvelle conversation, liste des conversations) si l’API le permet.
5. **And** états de chargement (skeleton ou spinner) et messages d’erreur clairs (réseau, 401, erreur ML).
6. **And** le design est cohérent avec le shell et la charte (Tailwind, primary, bordures, accessibilité).

## Tasks / Subtasks

- [x] Task 1 — Remplacement du placeholder (AC: 1, 6)
  - Remplacer le contenu de `app/(app)/chat/page.tsx` (supprimer « Contenu à venir »).
  - Utiliser useAuth / useApi ; pas de champ token manuel. Redirection vers /login si non connecté.
  - Layout : zone messages (scroll), champ saisie + bouton Envoyer, cohérent avec chat.html.

- [x] Task 2 — Appels API Chat (ML Service) (AC: 2, 3, 4)
  - Configurer l’URL du ML Service (env NEXT_PUBLIC_ML_SERVICE_URL ou proxy via API).
  - GET historique : GET /api/v1/chat/history (conversation_id) ; afficher les messages.
  - POST message : POST /api/v1/chat/message { message, conversation_id? } ; afficher la réponse.
  - Si l’app appelle le ML Service en direct : envoyer le JWT dans l’en-tête Authorization (useApi ou fetch avec token du contexte).
  - Gérer conversation_id (création / reprise) selon réponses API.

- [x] Task 3 — Liste des conversations (AC: 4)
  - Si l’API expose GET /api/v1/chat/conversations : afficher une liste (sidebar ou dropdown) pour changer de conversation.
  - Bouton « Nouvelle conversation » qui vide l’état et appelle POST sans conversation_id.

- [x] Task 4 — UX et robustesse (AC: 5, 6)
  - Skeleton ou spinner pendant chargement historique et pendant envoi de message.
  - Messages d’erreur : « Erreur réseau », « Session expirée » (401 → redirection login), « Le service IA est indisponible » (5xx).
  - Accessibilité : aria-label sur la zone de saisie et le bouton, rôle region/live pour la zone messages si mises à jour dynamiques.

## Dev Notes

### Contexte Epic 9 et dépendances

- **Epic 9** : Migration SPA Next.js.
- **Stories 9.1–9.5** (done) : Auth, Shell, Dashboard, Tableaux, Stats/Prévisions.
- Référence legacy : `apps/api/public/chat.html` (token manuel, ML_SERVICE_URL, POST message, affichage messages).

### API Chat (ML Service)

| Endpoint | Méthode | Rôle |
|----------|---------|------|
| /api/v1/chat/message | POST | Envoyer un message ; body: { message, conversation_id? } ; renvoie réponse + conversation_id |
| /api/v1/chat/history | GET | Historique d’une conversation ; query: conversation_id |
| /api/v1/chat/conversations | GET / POST | Liste / création de conversations (si disponible) |

Authentification : Bearer JWT (tenant_id, user_id extraits côté ML).  
[Source: docs/api-specifications.md § 12]

### Structure de la page

- Pas de formulaire « Token JWT » : l’auth est gérée par le shell (9.1).
- Zone messages : liste des bulles (user / assistant) avec scroll automatique.
- Pied de page : input texte + bouton Envoyer (désactivé pendant envoi).
