# Plan d’implémentation MVP — Frontend uniquement (SaaS Restauration)

**Source :** `implementation-artifacts/mvp-restaurant-implementation-plan.md` (version full-stack)  
**Référence écrans :** `ux-design/mvp_pages_saas_restaurant.docx`  
**Design system :** `ux-design/moodboard_saas_restaurant.html` (Warm Tech)  
**Généré :** 2026-02-25

---

## 1. Périmètre : frontend seulement

**Objectif :** Livrer toutes les **interfaces utilisateur** du MVP (18 écrans) dans `apps/web` (Next.js), sans développer les backends, intégrations ni services externes.

**In scope :**
- Design system Warm Tech (variables CSS, polices Sora / DM Sans, composants).
- Toutes les pages, routes, layouts et composants UI décrits dans le DOCX.
- Navigation (sidebar desktop, nav bas mobile), responsive, accessibilité de base.
- **Données :** mock / fixtures / JSON local ; ou appels vers l’**API existante** du projet quand des endpoints sont déjà disponibles (ex. auth, dashboard summary).
- Comportement UI uniquement : états de chargement, messages d’erreur simulés, indicateur « Données en cache » (texte + date mockée).

**Hors scope (explicitement reporté) :**
- Implémentation backend WebSockets / SSE (l’UI peut simuler des mises à jour ou utiliser du polling mocké).
- Vrais adaptateurs POS (Lightspeed OAuth, etc.) : l’écran « Connexion caisse » affiche l’UI et un flux simulé (ex. bouton « Connecter Lightspeed » → succès mock ; « Saisie manuelle » toujours visible).
- Appel IA/ML réel pour la photo de carte : l’écran permet upload/dépôt/caméra et affiche un **résultat mocké** (liste de plats/ingrédients) + correction manuelle en UI.
- Auth back-office côté serveur (rôle founder, whitelist IP) : l’UI admin peut être protégée par une vérification côté client ou une route dédiée ; pas d’implémentation serveur d’auth admin dans ce plan.
- Stripe réel, envoi de vrais emails, push notifications réelles : uniquement les écrans et flux UI (boutons, formulaires, états).

**Port :** App web sur **3002** (Grafana sur 3001). Déjà documenté dans AGENTS.md / package.json.

---

## 2. Ordre de développement (5 sprints — UI uniquement)

Même enchaînement que le plan full-stack, mais chaque livrable est **uniquement** des pages et composants dans `apps/web`, avec données mockées ou API existante.

| Sprint | Période   | Écrans à livrer (UI) | Objectif frontend |
|--------|-----------|----------------------|-------------------|
| **Sprint 1** | Semaines 1-2 | Connexion, Onboarding (4 écrans), Dashboard Accueil | Toutes les vues visibles ; parcours onboarding complet en UI ; données mock / API existante |
| **Sprint 2** | Semaines 3-4 | Mode Rush (2 écrans), Page Stocks, Admin Dashboard | Rush + détail stock en UI ; indicateur « cache » mocké ; liste stocks + tableau ; dashboard admin (données mock) |
| **Sprint 3** | Semaines 5-6 | Fiches Techniques, Suggestions IA, Admin Clients | Pages listes/détails ; cartes suggestions ; liste clients + profil client (mock) |
| **Sprint 4** | Semaines 7-8 | Paramètres, Abonnement/Facturation, Moniteur Technique | Formulaires paramètres ; écran abonnement/Stripe (UI) ; moniteur technique (données mock) |
| **Sprint 5** | Semaines 9-10 | Admin Abonnements, Feedback, Profil Client Admin | Tableaux et vues admin ; formulaire feedback ; profil client détaillé (mock) |

---

## 3. Partie A — Espace Client (Restaurateur) — Frontend only

### A.1 Authentification & Onboarding — 4 écrans

| Écran | Livrable frontend | Données |
|-------|-------------------|--------|
| **Connexion / Inscription** | Pages login/register ; formulaire (email, mot de passe, nom restaurant, ville) ; lien « Essai 30j » ; lien « Mot de passe oublié » ; option « Connexion Google » (bouton uniquement si pas d’intégration). | API auth existante si disponible ; sinon mock (redirection après submit). |
| **Onboarding 1 — Photo de carte** | Barre de progression 1/4 ; zone dépôt fichier / bouton caméra ; zone « traitement IA » (spinner ou message) ; liste plats + ingrédients/grammages (éditable en UI) ; « Ajouter un plat manuellement ». | **Mock :** après « upload », afficher une liste prédéfinie de plats/ingrédients (ex. fichier JSON). Pas d’appel ML réel. |
| **Onboarding 2 — Stocks initiaux** | Barre 2/4 ; zone import fichier (Excel/CSV) ou saisie manuelle ; liste ingrédients pré-remplie depuis l’étape 1 (state ou mock) ; DLC optionnel ; résumé « X importés, Y manquants ». | Données en state ou fixtures ; pas de parsing Excel côté serveur requis (optionnel : parsing côté client pour démo). |
| **Onboarding 3 — Connexion caisse** | Barre 3/4 ; cartes « Lightspeed », « Saisie manuelle » (bien visible) ; bouton « Connecter » Lightspeed → état « Connecté » ou « Échec » (mock) ; option « Je n’ai pas de caisse » ; étape 4/4 récap + « Lancer mon premier service ». | **Mock :** clic « Connecter » → succès/échec simulé ; aucun OAuth ni API POS réel. |

---

### A.2 Mode Rush — 2 écrans

| Écran | Livrable frontend | Données |
|-------|-------------------|--------|
| **Mode Rush — Alertes temps réel** | Bandeau « RUSH EN COURS » + pastille verte pulsante + heure ; liste alertes par criticité (Rouge / Orange / Vert) ; émoji, nom, portions, badge ; « Tout acquitter » ; « Voir tous les stocks ». | **Mock / fixtures :** liste d’alertes en JSON. Option : appel API existante si endpoint dashboard/alertes existe. |
| **Mode Rush — Détail stock rapide** | Liste scrollable ingrédients ; barres de niveau Rouge/Orange/Vert ; quantité + unité en grand ; filtre catégorie ; champ recherche ; bouton « Ajustement manuel » par ligne ; lien retour vers alertes. | **Mock / fixtures.** Pas de WebSocket/SSE : mise à jour possible via bouton « Rafraîchir » ou polling simulé (optionnel). |
| **Mode dégradé (UI)** | Indicateur texte : « Données en cache — dernière synchro il y a X min » (X = valeur mockée ou state). Affichage même liste que d’habitude. | State ou flag mock « mode dégradé » ; pas de vraie logique cache backend. |

*Déjà en place :* route `/rush`, design system, écran Alertes. À compléter : page Détail stock + indicateur dégradé en UI.

---

### A.3 Gestion des Stocks — 3 écrans

| Écran | Livrable frontend | Données |
|-------|-------------------|--------|
| **Dashboard Accueil** | Message « Bonjour [Prénom] — Service midi dans 2h » ; CTA « LANCER LE MODE RUSH » ; 4 KPIs (Food cost, Gaspillage évité, Ruptures évitées, Couverts) ; bloc Alertes urgentes ; bloc Suggestion IA du jour ; nav bas (mobile) / latérale (desktop). | API dashboard existante si disponible ; sinon mock (KPIs + alertes + 1 suggestion en dur). |
| **Page Stocks — Vue complète** | Tableau ingrédients (nom, quantité, unité, DLC, niveau, statut) ; barres colorées ; filtres catégorie/statut/DLC ; recherche ; bouton ajout ; édition quantité en ligne (UI) ; section « Historique 7j » (liste mock). | Mock / fixtures ; ou API existante si endpoints stocks présents. |
| **Page Fiches Techniques** | Liste plats ; détail fiche (ingrédients, quantités, unités) ; édition ; boutons « Création manuelle » / « Par photo » (UI) ; duplication ; affichage coût matière ; alerte « ingrédient absent » (badge UI). | Mock / fixtures. |

---

### A.4 Suggestions & Plats du jour — 1 écran

| Écran | Livrable frontend | Données |
|-------|-------------------|--------|
| **Page Suggestions IA** | Carte « Plat du jour recommandé » ; texte explicatif ; boutons « Valider ce plat du jour » / « Proposer une autre option » ; liste ingrédients à écouler (DLC &lt; 48h) ; historique acceptées/refusées (liste) ; section « Alerte gaspillage » ; version Starter : bloc verrouillé + CTA upgrade Pro. | **Mock :** un plat du jour + liste ingrédients + montant économie en dur ou fixture. |

---

### A.5 Compte & Paramètres — 2 écrans

| Écran | Livrable frontend | Données |
|-------|-------------------|--------|
| **Page Paramètres Restaurant** | Formulaire : nom, adresse, type établissement, horaires ; section intégrations POS (statut mocké) ; seuils alertes ; toggles notifications (push/SMS/email) ; gestion utilisateurs (liste mock) ; lien export RGPD ; langue / fuseau. | State ou mock ; pas d’envoi réel d’emails/SMS. |
| **Page Abonnement & Facturation** | Affichage plan actuel ; comparatif plans ; bouton « Passer en Pro » + texte ROI ; zone « Paiement » (formulaire type Stripe en UI uniquement) ; historique paiements (liste mock) ; jours d’essai restants ; lien résiliation + modal « Pourquoi partez-vous ? ». | **Mock :** pas d’appel Stripe réel. |

---

## 4. Partie B — Back-Office Fondateur (Admin) — Frontend only

Toutes les vues en **desktop** ; données **mockées**. La protection des routes admin est hors scope backend : on peut afficher les écrans sous une route `/admin` avec un guard côté client simple (ex. redirect si pas de flag ou token mock) pour la démo.

| Bloc | Écrans | Livrable frontend | Données |
|------|--------|-------------------|--------|
| **B.1** | Dashboard Admin | KPIs (MRR, ARR, clients actifs, churn) ; graphique MRR 90j ; nouveaux inscrits ; conversion essai→payant ; alertes internes ; top 5 restaurants ; récap hebdo. | Mock (graphiques avec données en dur ou JSON). |
| **B.2** | Liste Clients ; Profil Client détaillé | Tableau clients (nom, ville, plan, date, MRR, dernière connexion) ; badges santé ; filtres ; recherche ; page profil (infos, POS, engagement, paiements, notes). | Mock (liste + détail en JSON). |
| **B.3** | Moniteur Technique | Statut intégrations POS ; latence / taux d’erreur ; clients impactés ; logs erreurs (liste) ; statut LLM ; alerte email (texte UI). | Mock. |
| **B.4** | Gestion Abonnements & Revenus | Liste abonnements ; échecs paiement ; MRR par plan ; mouvements du mois ; liens Stripe (UI). | Mock. |
| **B.5** | Feedback & Support | Liste feedbacks ; tags ; statuts ; tickets support (liste). | Mock. |

---

## 5. Design system et technique (frontend)

- **Design system :** déjà amorcé dans `apps/web` (`globals.css`, `tailwind.config.ts`) — variables Warm Tech, Sora, DM Sans. À réutiliser sur toutes les nouvelles pages et composants.
- **Composants :** réutiliser ou créer des composants (boutons, cartes, badges, barres de niveau, formulaires) conformes au moodboard.
- **Navigation :** nav bas sur mobile, sidebar sur desktop ; lien « Mode Rush » prioritaire (déjà en nav).
- **Responsive :** mobile-first pour Rush et onboarding ; desktop pour admin et vues denses.
- **État :** React state / Context ou store léger pour les flux multi-étapes (onboarding) et données mock ; pas d’obligation de backend.

---

## 6. Récapitulatif des livrables par sprint (frontend only)

| Sprint | Fichiers / zones à créer ou modifier dans `apps/web` |
|--------|------------------------------------------------------|
| **1** | Design system étendu si besoin ; pages onboarding 1/2/3/4 ; Dashboard Accueil (refonte `/dashboard`) ; auth login/register si pas déjà fait. |
| **2** | Page `/rush/stocks` (détail stock) ; indicateur « Données en cache » sur Rush ; Page Stocks (tableau) ; zone admin layout + Dashboard Admin ; données mock partout. |
| **3** | Pages Fiches Techniques (liste + détail) ; Page Suggestions IA ; Admin Liste Clients + Profil Client. |
| **4** | Pages Paramètres Restaurant et Abonnement/Facturation ; Moniteur Technique admin. |
| **5** | Admin Abonnements ; Feedback & Support ; Profil Client Admin (complément). |

---

## 7. Ce qui reste hors scope (à traiter plus tard)

- Backend WebSockets / SSE pour le Rush.
- Vraie intégration Lightspeed (OAuth, API).
- Service IA/ML pour la photo de carte.
- Auth admin côté serveur (rôle founder, whitelist IP).
- Stripe, envoi d’emails, push réelles.
- Parsing Excel/CSV côté serveur (optionnel côté client pour démo possible).

---

*Ce plan limite l’implémentation aux écrans et à l’UX dans `apps/web`. Les données sont en mock ou proviennent de l’API existante. Pour brancher les vrais services, utiliser le plan full-stack `mvp-restaurant-implementation-plan.md`.*
