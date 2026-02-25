# Epic 9 — Migration Full-Stack vers Next.js & UI Professionnelle

## Contexte

FlowStock repose aujourd'hui sur des **pages HTML isolées** servies depuis `apps/api/public/` avec un layout partagé (`js/layout.js`). Ce modèle présente des limites qui trahissent l'état de prototype :

1. **Exposition du JWT** : presque toutes les pages affichent un champ de saisie pour le token (Dashboard, Ventes, Fournisseurs, Emplacements, Mouvements, Import, Formules, Chat). Pour un utilisateur final, cela est déroutant et peu sécurisé.
2. **Absence de hiérarchie visuelle** : cartes de données brutes, manque de profondeur (ombres, contrastes) et d'iconographie.
3. **Interactions manuelles répétitives** : boutons « Charger les estimations », « Rafraîchir » pour voir les données.
4. **Fragmentation visuelle** : chaque page recharge l'intégralité de l'interface, créant des sauts visuels entre les 13 pages métier.

## Objectif

Passer à une **Single Page Application (SPA)** sous **Next.js** pour :

- **Authentification transparente** : token géré via React Context, jamais affiché à l'utilisateur.
- **Navigation instantanée** : seul le contenu central change, la barre de navigation reste stable.
- **Composants professionnels** : Shadcn UI pour tableaux, formulaires, cartes ; Recharts pour graphiques.
- **Données chargées au montage** : plus de boutons « Charger » manuels ; useEffect / Server Components.

## Références

- `docs/front-end-spec.md` — Spec UI/UX et user flows
- `docs/frontend-react-next-avis.md` — Avis technique React/Next.js
- `apps/api/public/api-client.js` — Client API actuel à migrer vers hooks React
- `planning-artifacts/epics.md` — Epic 9 et Stories 9.1–9.5

## Architecture cible

| Aspect           | Actuel                         | Cible (Epic 9)                        |
|------------------|--------------------------------|---------------------------------------|
| Framework        | HTML + layout.js               | Next.js (App Router)                  |
| Auth             | Champs JWT manuels + api-client | AuthProvider + useAuth / useApi       |
| Navigation       | Liens vers .html, full reload  | Client-side routing, pas de reload    |
| Données          | Boutons « Charger »            | Chargement automatique (hooks)        |
| Composants UI    | HTML + Tailwind CDN            | Shadcn UI + Tailwind build            |
| Graphiques       | (à définir)                    | Recharts                              |

## Ordre recommandé des Stories

1. **9.1** — Invisible Auth & Session Management (fondation)
2. **9.2** — Shell Applicatif Moderne (Layout, Sidebar, Header)
3. **9.3** — Refonte du Dashboard Actionnable
4. **9.4** — Tableaux et Filtres Intelligents (Fournisseurs, Emplacements, Ventes)
5. **9.5** — Graphiques et Prévisions Immersives (Stats, Forecast)

## Cohérence avec Epic 8

L'Epic 8 (Tailwind, layout partagé) reste valide pour les pages HTML actuelles. L'Epic 9 introduit un **nouveau front** Next.js qui :

- Réutilise la charte Tailwind (primary, success, warning, error)
- Conserve l'API Express existante (`apps/api`) comme backend
- Remplace progressivement les pages HTML par des routes Next.js

Les deux epics peuvent coexister pendant une phase de transition (ancien front en `/legacy` ou désactivé progressivement).
