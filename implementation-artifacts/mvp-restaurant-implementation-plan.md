# Plan d'implémentation MVP — SaaS Restauration

**Source :** `ux-design/mvp_pages_saas_restaurant.docx`  
**Référence workflow :** `_bmad/core/tasks/help.md` (phases, artefacts, catalogue BMAD)  
**Généré :** 2026-02-25

---

## 1. Contexte et périmètre

- **Document fondateur :** `ux-design/mvp_pages_saas_restaurant.docx` — architecture des 18 écrans MVP (12 client + 6 admin).
- **Design system :** `ux-design/moodboard_saas_restaurant.html` — Warm Tech (Sora, DM Sans, couleurs, composants).
- **Cible technique :** `apps/web` (Next.js) + API existante ; pas de génération d’application en un bloc — avancement par étapes.

### Port applicatif

- **3001** est utilisé par Grafana dans votre environnement.
- **Recommandation :** faire tourner l’app web sur un autre port (ex. **3002**) pour éviter le conflit.
  - Modifier `apps/web/package.json` : `"dev": "next dev -p 3002"` (et `start` si besoin).
  - Documenter le port dans le README / AGENTS.md.

---

## 2. Ordre de développement (selon le DOCX)

Le document MVP définit 5 sprints. Chaque sprint livre des **pages** ; les **stories** existantes dans `implementation-artifacts` et `sprint-status.yaml` doivent être alignées ou complétées pour couvrir ces écrans.

| Sprint | Période   | Pages à livrer (DOCX) | Objectif |
|--------|-----------|------------------------|----------|
| **Sprint 1** | Semaines 1-2 | Connexion, Onboarding (4 écrans), **Dashboard Accueil** | Premier restaurant qui termine l’onboarding |
| **Sprint 2** | Semaines 3-4 | **Mode Rush (2 écrans)**, Page Stocks, Admin Dashboard | Premier rush testé avec un vrai client |
| **Sprint 3** | Semaines 5-6 | Fiches Techniques, Suggestions IA, Admin Clients | Boucle complète : stock → rush → suggestion |
| **Sprint 4** | Semaines 7-8 | Paramètres, Abonnement/Stripe, Moniteur Technique | Première facturation réelle |
| **Sprint 5** | Semaines 9-10 | Admin Abonnements, Feedback, Profil Client Admin | Infrastructure de pilotage complète |

---

## 3. Partie A — Espace Client (Restaurateur)

### A.1 Authentification & Onboarding — 4 écrans (MVP Core)

| Écran | Priorité | Interface | Contenu clé |
|-------|----------|-----------|-------------|
| **Connexion / Inscription** | MVP Core | Mobile + Desktop | Email, mot de passe, nom restaurant, ville ; essai 30j ; option Google ; mot de passe oublié |
| **Onboarding 1 — Photo de carte** | MVP Core | Mobile + Desktop | Barre 1/4 ; dépôt/caméra ; IA temps réel ; liste plats + ingrédients/grammages ; réajustement ; ajout manuel |
| **Onboarding 2 — Stocks initiaux** | MVP Core | Mobile + Desktop | Barre 2/4 ; import Excel/CSV ou saisie ; pré-remplissage depuis étape 1 ; DLC optionnel ; résumé X importés / Y manquants |
| **Onboarding 3 — Connexion caisse** | MVP Core | Mobile + Desktop | Barre 3/4 ; **Sprint 1 : Lightspeed uniquement** (OAuth/clé API) + **« Saisie manuelle »** bien visible pour les autres ; statut temps réel ; étape 4/4 récap + « Lancer mon premier service ». Autres POS (L’Addition, Square, Zelty) en post–Sprint 1. |

**Lien artefacts :** Auth déjà en place (epic-1). À faire dans `apps/web` : pages/flow onboarding (4 étapes), **photo carte avec appel IA obligatoire en Sprint 1** (fallback : correction manuelle si l’IA rate — l’appel doit être fait, c’est la fonctionnalité « wow » de l’onboarding), connexion caisse (voir périmètre POS ci-dessous).

**Périmètre POS Sprint 1 :** Une seule intégration solide au lieu de quatre. Livrer **Lightspeed** en priorité (le plus répandu chez les indépendants français) avec une option **« Saisie manuelle »** bien visible pour les autres. Les autres POS (L’Addition, Square, Zelty) viendront après. Mieux vaut une intégration qui marche parfaitement que quatre à moitié.

---

### A.2 Mode Rush — 2 écrans (cœur produit, MVP Core)

| Écran | Priorité | Interface | Contenu clé |
|-------|----------|-----------|-------------|
| **Mode Rush — Alertes temps réel** | MVP Core | **Mobile** | Bandeau « RUSH EN COURS » + indicateur vert pulsant + heure ; alertes par criticité Rouge/Orange/Vert ; émoji, nom, portions, badge ; « X tables en cours, Y portions » ; « Tout acquitter » ; « Voir tous les stocks » ; 2 actions max ; push si app en arrière-plan ; mode nuit si soirée |
| **Mode Rush — Détail stock rapide** | MVP Core | **Mobile** | Liste scrollable ingrédients + niveau temps réel ; barres Rouge/Orange/Vert ; quantité + unité en grand ; filtre catégorie ; recherche ; ajustement manuel par ingrédient ; retour 1 tap ; synchro 30 s |

**État actuel :** Design system Warm Tech + écran **Alertes temps réel** implémentés dans `apps/web` (route `/rush`, design system dans `globals.css` + `tailwind.config.ts`).  
**À faire (Sprint 2, scope ferme) :**  
- Route **Détail stock rapide** (ex. `/rush/stocks` ou `/rush/detail`) ;  
- **Temps réel dans le scope Sprint 2** : WebSockets ou Server-Sent Events pour la mise à jour des alertes rush. Le polling HTTP 30 s est insuffisant en conditions réelles — un manager qui voit l’alerte 30 s après la rupture effective est trop tard. Les WebSockets/SSE ne sont pas « plus tard » : ils font partie du livrable Sprint 2.  
- Vérifier port (3002 si Grafana sur 3001).

---

### A.3 Gestion des Stocks — 3 écrans

| Écran | Priorité | Interface | Contenu clé |
|-------|----------|-----------|-------------|
| **Dashboard Accueil** | MVP Core | Mobile + Desktop | « Bonjour [Prénom] — Service midi dans 2h » ; bouton « LANCER LE MODE RUSH » ; 4 KPIs semaine (Food cost, Gaspillage évité, Ruptures évitées, Couverts) ; bloc Alertes urgentes ; bloc Suggestion IA du jour ; nav bas (mobile) / latérale (desktop) |
| **Page Stocks — Vue complète** | MVP Core | Mobile + Desktop | Tableau ingrédients (nom, quantité, unité, DLC, niveau, statut) ; barres colorées ; filtres catégorie/statut/DLC ; recherche ; ajout manuel ; modification quantité ; historique mouvements 7j |
| **Page Fiches Techniques** | MVP | Mobile + Desktop | Liste plats + fiche ; détail ingrédients/quantités/unités ; édition ; création manuelle ou photo ; duplication ; coût matière ; alerte ingrédient absent du stock |

**Lien artefacts :** Dashboard actuel (`/dashboard`) à faire évoluer vers **Dashboard Accueil** (message, CTA Rush, KPIs, alertes, suggestion IA). Page Stocks et Fiches à mapper avec epic-3 / stories existantes (CRUD stocks, formules, etc.).

---

### A.4 Suggestions & Plats du jour — 1 écran (MVP)

| Écran | Priorité | Interface | Contenu clé |
|-------|----------|-----------|-------------|
| **Page Suggestions IA** | MVP | Mobile + Desktop | Carte « Plat du jour recommandé » ; explication en langage naturel ; « Valider ce plat du jour » / « Proposer une autre option » ; ingrédients à écouler (DLC &lt; 48h) ; historique acceptées/refusées ; section Alerte gaspillage ; version Starter : section verrouillée + CTA upgrade Pro |

---

### A.5 Compte & Paramètres — 2 écrans (MVP)

| Écran | Priorité | Interface | Contenu clé |
|-------|----------|-----------|-------------|
| **Page Paramètres Restaurant** | MVP | Mobile + Desktop | Infos restaurant ; intégrations POS ; seuils alertes ; notifications push/SMS/email ; utilisateurs ; export RGPD ; langue/fuseau |
| **Page Abonnement & Facturation** | MVP | Mobile + Desktop | Plan actuel ; comparatif plans ; « Passer en Pro » + ROI ; Stripe ; historique paiements ; essai ; résiliation + rétention |

---

## 4. Partie B — Back-Office Fondateur (Admin)

| Bloc | Écrans | Priorité | Interface |
|------|--------|----------|-----------|
| **B.1** | Dashboard Admin — Vue générale | Admin MVP | Desktop |
| **B.2** | Liste Clients ; Profil Client détaillé | Admin MVP | Desktop |
| **B.3** | Moniteur Technique & Intégrations | Admin MVP | Desktop |
| **B.4** | Gestion Abonnements & Revenus | Admin MVP | Desktop |
| **B.5** | Feedback Clients & Support | Admin MVP | Desktop |

Détail de chaque écran : voir `ux-design/mvp_pages_extracted.txt` (extrait du DOCX) ou le DOCX original.

**Authentification back-office (obligatoire dès MVP) :** Les routes `/admin` ne doivent jamais être accessibles sans contrôle d’accès. Même en MVP, une route admin sans auth est un risque. À prévoir au minimum : **auth séparée** avec un rôle dédié (ex. `founder` / `admin`) et/ou **whitelist IP** pour l’accès fondateur. À inclure dès la première livraison d’écrans admin (Sprint 2).

---

## 5. Gestion des erreurs et mode dégradé

Si l’API POS est down ou le réseau coupe pendant un rush, l’écran Rush doit **rester utilisable**. Ce n’est pas un détail — c’est ce qui détermine si les restaurateurs font confiance à l’outil en conditions réelles.

**Exigences :**

- **Mode offline partiel :** affichage des **dernières données connues** (cache local ou session), sans écran blanc ni erreur bloquante.
- **Indicateur visuel explicite :** par ex. « Données en cache — dernière synchro il y a 4 min » (ou « Connexion POS interrompue ») pour que le manager sache qu’il ne voit pas du temps réel.
- **Comportement prévisible :** pas de perte de données saisies côté client ; reprise de la synchro dès que la connexion revient, avec mise à jour des alertes (WebSocket/SSE ou polling de reprise).

À spécifier dans les stories Sprint 2 (Mode Rush) : stratégie de cache, TTL, message utilisateur et reprise de synchro.

---

## 6. Tests utilisateurs entre sprints

Le plan ne doit pas seulement livrer des écrans : il doit prévoir des **moments formels d’observation terrain** pour valider l’usage avant d’enchaîner.

**Règle recommandée :** En fin de Sprint 1, **session d’observation terrain** (environ 2 h) avec 3 à 5 restaurants bêta : voir comment ils utilisent l’onboarding et le Dashboard Accueil, avant de démarrer le Sprint 2. Les retours alimentent les priorités et les ajustements du Sprint 2.

Idéalement, prévoir un créneau similaire (observation ou debrief court) en fin de Sprint 2 (usage du Mode Rush en conditions réelles) et après les sprints suivants si la ressource le permet.

---

## 7. Phases et alignement avec help.md

- **Phases (help.md) :** 1-discover → 2-define → 3-build → 4-ship ; rester dans le module, respecter l’ordre des étapes requises.
- **Artefacts :** les livrables (pages, routes, composants) doivent être tracés dans `implementation-artifacts` (stories, code-review, sprint-status).
- **Recommandation :** pour chaque sprint, créer ou mettre à jour une **story** dans `implementation-artifacts` dont le titre reflète les écrans du DOCX (ex. « Sprint 1 — Onboarding 4 écrans + Dashboard Accueil »), et lier les tâches techniques (routes, appels API, design system).

---

## 8. Prochaines actions recommandées

1. **Port :** Changer le port de l’app web à **3002** (ou autre) dans `apps/web/package.json` et documenter (README / AGENTS.md).
2. **Sprint 1 (actuel) :**  
   - Finaliser **Dashboard Accueil** dans `apps/web` (message bienvenue, CTA « LANCER LE MODE RUSH », 4 KPIs, alertes urgentes, suggestion IA, nav bas/latérale selon device).  
   - Onboarding 4 écrans : connexion/inscription déjà en place ; flow 1/2/3/4 avec **photo carte (appel IA obligatoire, fallback manuel)** ; stocks initiaux ; **connexion caisse : Lightspeed uniquement + option « Saisie manuelle »** bien visible.  
   - En fin de Sprint 1 : **session d’observation terrain 2 h** avec 3–5 restaurants bêta avant de lancer le Sprint 2.
3. **Sprint 2 :**  
   - Mode Rush : écran **Détail stock rapide** + **WebSockets ou SSE** pour alertes temps réel (pas seulement polling 30 s).  
   - **Mode dégradé** : écran Rush utilisable avec données en cache + indicateur « Données en cache — dernière synchro il y a X min ».  
   - Auth back-office (rôle founder / whitelist IP) dès la livraison Admin Dashboard.  
   - Livrer Page Stocks (vue complète) et Admin Dashboard.
4. **Suivi :** Mettre à jour `implementation-artifacts/sprint-status.yaml` (et epics/stories) pour refléter les écrans DOCX et les sprints ci-dessus.

---

*Ce plan est le fil conducteur pour implémenter les 18 écrans du MVP en s’appuyant sur le DOCX et le workflow décrit dans help.md.*

**Révision 2026-02-25 :** Intégration des retours — temps réel Rush (WebSockets/SSE en Sprint 2), photo carte IA obligatoire Sprint 1 avec fallback manuel, auth back-office, périmètre POS (Lightspeed seul en Sprint 1), mode dégradé / gestion d’erreurs, tests utilisateurs entre sprints.
