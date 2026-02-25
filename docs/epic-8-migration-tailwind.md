# Epic 8 — Mise à jour après refonte Tailwind

## Contexte

- **Ancienne Story 8.1 (déjà livrée)** : Layout partagé + design system en variables CSS (`js/layout.js`, `css/design-system.css`, pages métier intégrées). Artifact : `implementation-artifacts/8-1-layout-partage-et-design-system-variables-css.md` (status: superseded).
- **Nouvelle Epic 8** : Professionalisation UI/UX **sous Tailwind CSS**. Les stories 8.1–8.5 ont été réécrites pour Tailwind (voir `planning-artifacts/epics.md` et `docs/stories/8.x.story.md`).

## Comment mettre à jour ?

Tu ne dois **pas** tout refaire. Stratégie en 3 points :

### 1. Réutiliser ce qui existe

- **Garder** `layout.js` et `design-system.css` tels quels pour l’instant.
- Le layout (nav + header) et les variables restent en place ; les pages continuent de fonctionner.

### 2. Traiter la nouvelle Story 8.1 comme la prochaine à développer

La **nouvelle** Story 8.1 = « Initialisation technique — Tailwind et charte (tailwind.config.js) ».

- **À faire** : ajouter Tailwind (CDN pour le MVP ou PostCSS) + créer `tailwind.config.js` avec la charte (primary, success, warning, error) alignée sur les valeurs actuelles de `design-system.css` (#3b82f6, #10b981, #f59e0b, #ef4444).
- **Ne pas faire** : supprimer ou réécrire le layout / design-system dans cette story. La coexistence Tailwind + design-system.css est OK pendant la transition.

### 3. Enchaîner avec les stories 8.2 → 8.5

- **8.2** : Remplacer le CSS custom du layout (nav + header) par des classes Tailwind ; à ce stade tu pourras progressivement ne plus dépendre des variables CSS pour le layout.
- **8.3** : Cartes, badges, tableaux en Tailwind.
- **8.4** : Boutons d’action et Chat en flex/grid Tailwind (responsive).
- **8.5** : Supprimer toutes les balises `<style>` dans les `.html` et migrer les styles restants vers Tailwind ou une feuille centralisée.

À la fin de l’Epic 8, Tailwind sera la source de vérité pour les styles ; `design-system.css` pourra être déprécié ou conservé pour quelques cas particuliers si besoin.

## Workflow BMAD recommandé

1. **Préparer le contexte story** (optionnel) : `/bmad` puis commande **CS** (Create Story) en ciblant la Story 8.1 actuelle — cela régénère un artifact d’implémentation à jour dans `implementation-artifacts/`.
2. **Développer la nouvelle 8.1** : suivre `docs/stories/8.1.story.md` (Tasks 1–3) : intégration Tailwind + `tailwind.config.js` + charte. Référence utile : `implementation-artifacts/8-1-tailwind-init.md` (créé pour cette mise à jour).
3. **Enchaîner** avec 8.2, 8.3, 8.4, 8.5 dans l’ordre.

## Résumé

| Ce qui était fait (ancienne 8.1) | Ce qu’on fait maintenant |
|----------------------------------|---------------------------|
| Layout partagé (nav + header)    | **Conservé** ; 8.2 le migrera en Tailwind |
| design-system.css (variables)    | **Conservé** pendant la transition ; 8.2–8.5 migrent vers Tailwind |
| **Nouveau**                      | **Story 8.1 actuelle** : Tailwind (CDN/PostCSS) + `tailwind.config.js` + charte |

Ainsi, ta story 8.1 déjà devée reste valide comme base ; la « mise à jour » = ajouter Tailwind par-dessus et suivre les nouvelles stories 8.1 (init) puis 8.2–8.5 pour la migration progressive.

## Utilisation de la charte Tailwind (Story 8.1 livrée)

Tailwind est intégré via CDN sur les 13 pages métier. La charte est définie dans `tailwind.config.js` et injectée inline pour le CDN. Classes utilitaires disponibles :

| Rôle     | Classes (exemples)                    | Valeur  |
|----------|---------------------------------------|---------|
| primary  | `bg-primary`, `text-primary`, `border-primary` | #3b82f6 |
| success  | `bg-success`, `text-success`          | #10b981 |
| warning  | `bg-warning`, `text-warning`, `border-warning` | #f59e0b |
| error    | `bg-error`, `text-error`              | #ef4444 |

**Exemples :** `bg-primary text-white p-4`, `text-success`, `border-warning`, `bg-error text-white rounded`.  
Pour les stories 8.2–8.5, utiliser ces classes à la place des variables CSS (--color-primary, etc.).
