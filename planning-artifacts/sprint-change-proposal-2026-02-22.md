# Proposition de changement de cap (Correct Course) — Flowstock

**Date :** 2026-02-22  
**Workflow :** Correct Course (BMAD)  
**Contexte :** Pivot stratégique vers la vision Flowstock (restauration + monde de la nuit)

---

## 1. Résumé du déclencheur

### Énoncé du problème

Un **changement de cap stratégique** a été décidé : le produit n’est plus positionné comme un « SaaS gestion de stocks IA pour PME » générique, mais comme **Flowstock**, un agent IA de gestion de stocks **spécialisé restauration et monde de la nuit** (bars, boîtes de nuit).

**Type de déclencheur (checklist 1.2) :** **Pivot stratégique / évolution de marché** — nouvelle proposition de valeur, nouvelle cible et nouvelles fonctionnalités cœur.

**Story déclenchante (checklist 1.1) :** N/A — le changement est initié par la vision produit, pas par une story en cours.

**Éléments de preuve / contexte :**

- Document de vision fourni (vision, proposition de valeur, fonctionnalités clés, architecture connecteur universel, user flow, objectifs B/M/A/D).
- Écart majeur avec le PRD actuel : cible (PME/e-commerce → restauration + nightlife), problème (Excel / manque de prévisions → blind spot pendant les rushs), solution (sync temps réel POS, comptage in-rush, Scan-to-Recipe, module Nightlife, connecteur universel).

---

## 2. Analyse d’impact

### 2.1 Impact sur les epics

| Epic actuel | Impact | Commentaire |
|-------------|--------|-------------|
| **Epic 1** (Foundation & Infrastructure) | **Modéré** | Auth / abonnements restent. À adapter : onboarding « Connexion API POS + scan carte IA » (Flowstock). |
| **Epic 2** (Gestion stocks de base) | **Fort** | CRUD stocks reste. À étendre : **ingrédients solides vs volumes liquides** (centilitres, fractions de bouteilles), lien avec fiches techniques / recettes. |
| **Epic 3** (Données ventes & calculs) | **Très fort** | **Connecteur universel** : remplace/ complète « intégration terminaux paiement ». Nouveaux adaptateurs POS (Lightspeed, Square, L’Addition, Zelty…), format standard interne. Webhooks ventes temps réel prioritaires. |
| **Epic 4** (Dashboard & visualisation) | **Très fort** | **Dashboard Rush** : suivi in-rush, alertes seuils critiques, ultra-lisible. Chat IA reste pertinent. Statistiques à aligner avec rush / closing. |
| **Epic 5** (Moteur IA) | **Fort** | Prédictions et apprentissage restent. À ajouter : analyse **historiques de rush** pour réapprovisionnement prédictif. Cold start inchangé. |
| **Epic 6** (Commandes intelligentes) | **Fort** | Recommandations + validation en un clic restent. À lier au **closing** : panier de commande fournisseur généré automatiquement après rapport d’écarts. |
| **Epic 7** (Factures & réception) | **Modéré** | Photo facture IA et réception restent utiles. Pas au cœur de la nouvelle vision. |
| **Epic 9** (UX / migration Next.js) | **Fort** | Interface à faire évoluer vers **Dashboard Rush** minimaliste et lisible ; parcours Onboarding / Raffinage / Service / Closing à refléter. |

**Nouveaux blocs fonctionnels à traduire en epics/stories :**

- **Connecteur universel POS** : adaptateurs (périphérie) + format standard (cœur). Décomposition B (Breakdown) des types de données standard.
- **Scan-to-Recipe** : scan carte/menu → IA suggère plats et quantités génériques → utilisateur affine fiches techniques à 100 %.
- **Module Nightlife** : lutte contre le coulage (ventes réelles vs stock théorique), gestion volumes liquides (cl, fractions de bouteilles).
- **Réapprovisionnement prédictif** : analyse historiques de rush → suggestions de commandes fournisseur en un clic (complète Epic 6).
- **Dashboard Rush** : vue temps réel pendant le service, alertes seuils critiques, notifications mobiles possibles.
- **Closing** : rapport d’écarts (théorique vs réel) + génération automatique du panier de commande fournisseur.

### 2.2 Impact sur les stories

- **Stories existantes** : nombre d’entre elles restent valides (auth, CRUD stocks, fournisseurs, factures, prédictions IA, commandes) mais doivent être **adaptées** (libellés, critères d’acceptation, données métier).
- **Stories à ajouter** : toutes celles couvrant le connecteur universel, Scan-to-Recipe, Nightlife, Dashboard Rush, Closing, et le nouveau parcours d’onboarding.
- **Stories à retirer ou reporter** : aucune suppression obligatoire ; certaines fonctionnalités « PME générique » peuvent être dépriorisées ou reportées en V2 (ex. analyses très avancées type Excel).

### 2.3 Conflits avec les artefacts

| Artefact | Conflits / mises à jour nécessaires |
|----------|-------------------------------------|
| **PRD** | **Réécriture cible et objectifs** : problème (blind spot rush), solution (sync POS, in-rush, réappro), cible (restauration + nightlife). **Nouveaux FR** : sync temps réel POS, comptage in-rush, Scan-to-Recipe, module Nightlife (coulage, liquides), connecteur universel, Dashboard Rush, Closing (rapport d’écarts + panier fournisseur). **FR existants** : à conserver ou adapter (ex. FR23 → intégration POS via connecteur universel). **MVP** : à redéfinir (priorité connecteur + Dashboard Rush + Scan-to-Recipe + closing). |
| **Architecture** | **Nouvelle couche « Connecteur universel »** : adaptateurs POS (périphérie) + format standard (cœur). Impact sur : intégrations, APIs, modèle de données (produits, ventes, unités liquides/solides). **Schémas** : à mettre à jour (flux POS → adaptateurs → cœur → dashboard / commandes). Pas de remise en cause de GCP / Docker / microservices, mais ajout d’un service ou module « POS Connector ». |
| **UX / UI** | **Parcours** : Onboarding (connexion API POS + scan carte IA), Raffinage (fiches techniques), Service (Dashboard Rush), Closing (rapport + panier). **Écrans** : Dashboard Rush minimaliste et ultra-lisible ; alertes in-rush ; possibilité de notifications mobiles. **UX Design** actuel à aligner avec ces parcours et objectifs. |
| **Brief** | **Brief produit** (docs/brief.md) : repositionnement complet (Flowstock, restauration + nightlife, problème blind spot, solution sync POS). À mettre à jour pour cohérence avec le PRD. |

### 2.4 Impact technique

- **Code / intégrations** : nouvelle couche d’abstraction POS (adaptateurs par logiciel de caisse) + modèle de données unifié (ex. `product_id`, `qty`, unités liquides).
- **Base de données** : modèle pour **ingrédients (solides)** et **volumes (liquides)** ; fiches techniques / recettes (plats → ingrédients + quantités) ; éventuellement écarts théorique/réel et métriques « coulage ».
- **APIs** : endpoints ou webhooks pour réception des ventes en temps réel depuis chaque POS ; API interne « format standard » pour le reste de l’appli.
- **Infrastructure** : pas de changement de plateforme (GCP/Docker) ; possible nouveau service ou module « POS Connector » / « Connecteur universel ».

---

## 3. Approche recommandée

### 3.1 Options évaluées (checklist section 4)

| Option | Évaluation | Effort | Risque |
|--------|------------|--------|--------|
| **1. Ajustement direct** (modifier/ajouter des stories dans le plan actuel) | **Non viable** seul | — | — |
| **2. Rollback** (revenir en arrière sur des stories livrées) | **Non pertinent** — le pivot ne vient pas d’un défaut de livraison | — | — |
| **3. Revue MVP / PRD** (redéfinir le périmètre et les objectifs) | **Nécessaire** | Élevé | Moyen |
| **4. Replanification fondamentale** (Brief → PRD → Architecture → Epics/Stories) | **Recommandé** | Élevé | Maîtrisé si séquence respectée |

### 3.2 Recommandation : **Replanification fondamentale (Option 4)**

**Justification :**

- Le changement est un **pivot produit** (nouvelle cible, nouveau problème, nouvelles fonctionnalités cœur), pas un correctif sur l’existant.
- Le PRD et l’architecture actuels ne décrivent pas le connecteur universel, le Scan-to-Recipe, le module Nightlife ni le Dashboard Rush ; les garder tels quels créerait des incohérences durables.
- Une **mise à jour en séquence** (Brief → PRD → Architecture → Epics/Stories) permet de garder une trace claire des décisions et d’éviter de coder sur une base obsolète.
- Le travail déjà fait (auth, stocks, IA, commandes, factures, UX de base) reste **réutilisable** une fois le PRD et l’architecture alignés sur Flowstock.

**Effort estimé :** Élevé (mise à jour de plusieurs artefacts et replanification des epics/stories).  
**Impact planning :** Replanification majeure ; les sprints actuels devraient être réorientés après mise à jour du PRD et de l’architecture.  
**Risque :** Moyen si la séquence Brief → PRD → Archi → Epics est suivie ; élevé si on développe sans mettre à jour les documents.

---

## 4. Propositions de changement détaillées

### 4.1 Brief (docs/brief.md)

- **Section à mettre à jour :** Executive Summary, Problem Statement, Proposed Solution, Marché cible, Proposition de valeur.
- **Contenu actuel :** SaaS stocks IA pour PME / e-commerce ; problème = Excel / ruptures / manque de prévisions.
- **Contenu proposé :**  
  - **Produit :** Flowstock — agent IA de gestion de stocks pour **restauration et monde de la nuit** (bars, boîtes).  
  - **Problème :** « Blind spot » opérationnel pendant les rushs (personnel sans visibilité sur les produits critiques).  
  - **Solution :** Système synchronisé en temps réel avec les logiciels de caisse (POS) via API ; visibilité immédiate et réapprovisionnement automatisé.  
  - **Cible :** Restauration (restaurants, traiteurs) et nightlife (bars, clubs).  
  - **Valeur :** Visibilité en temps réel pendant le service, alertes critiques, fiches techniques (Scan-to-Recipe), lutte contre le coulage (nightlife), réappro prédictif et closing (rapport d’écarts + panier fournisseur).

### 4.2 PRD (docs/prd.md)

- **Sections à mettre à jour en priorité :**
  - **Goals and Background Context** : objectifs et contexte alignés sur Flowstock (blind spot, sync POS, in-rush, restauration + nightlife).
  - **Functional Requirements** :  
    - **À ajouter** : sync temps réel avec POS (connecteur universel) ; comptage in-rush et alertes seuils ; Scan-to-Recipe (scan carte/menu, IA suggère recettes, utilisateur affine) ; module Nightlife (coulage, volumes liquides) ; réapprovisionnement prédictif basé sur historiques de rush ; Dashboard Rush (vue temps réel, lisible) ; Closing (rapport d’écarts théorique/réel, génération panier fournisseur).  
    - **À adapter** : FR23 (intégration terminaux) → intégration via connecteur universel POS ; FR2/FR16 → inclure Dashboard Rush et vue in-rush.
  - **User Interface Design Goals** : parcours Onboarding (connexion API POS + scan carte), Raffinage (fiches techniques), Service (Dashboard Rush, notifications), Closing (rapport + panier).
  - **MVP scope** : redéfinir les priorités (ex. connecteur 1–2 POS, Dashboard Rush, Scan-to-Recipe de base, closing avec panier, puis Nightlife et autres POS).

- **Format proposé pour les nouveaux FR (exemples) :**
  - FRxx: Le système doit se connecter aux logiciels de caisse (POS) via une couche d’adaptateurs et un format de données standard pour recevoir les ventes en temps réel.
  - FRyy: Le système doit afficher un Dashboard Rush avec suivi des stocks pendant le service et alertes automatiques de seuils critiques.
  - FRzz: Le système doit permettre le Scan-to-Recipe : scan de la carte/menu, suggestion IA des plats et quantités d’ingrédients, affinage par l’utilisateur jusqu’à 100 % de précision.

(Le détail exhaustif des FR sera fait lors de la mise à jour effective du PRD par le PM.)

### 4.3 Architecture (docs/architecture.md)

- **Composants à ajouter / modifier :**
  - **Connecteur universel POS** :  
    - **Périphérie :** adaptateurs par POS (Lightspeed, Square, L’Addition, Zelty, etc.) traduisant les APIs respectives vers un format commun.  
    - **Cœur :** modèle de données unifié (ex. `product_id`, `qty`, `unit`, type solide/liquide) utilisé par le reste de l’application.
  - **Modèle de données :**  
    - Ingrédients (solides) et volumes (liquides, centilitres, fractions de bouteilles).  
    - Fiches techniques / recettes (plats → lignes ingrédient + quantité).  
    - Données nécessaires au calcul du coulage (ventes réelles, stock théorique).
  - **APIs / événements :** webhooks ou polling pour ventes en temps réel ; API interne « format standard » pour alimenter dashboard, IA et commandes.
- **Schémas / diagrammes :** ajouter un schéma de flux : POS → Adaptateurs → Format standard → Services métier (stocks, IA, commandes, dashboard).
- **Choix technologiques :** pas de changement de stack (GCP, Docker, microservices) ; ajout d’un module ou service dédié au connecteur POS.

### 4.4 Epics et Stories (planning-artifacts/epics.md)

- **Stratégie proposée :**
  - **Conserver** les epics 1, 2, 5, 6, 7 en les **renommant / adaptant** aux nouveaux libellés et critères d’acceptation (onboarding, stocks avec solides/liquides, IA, commandes, factures).
  - **Refondre** Epic 3 (Données ventes) autour du **connecteur universel** (adaptateurs + format standard + webhooks/API ventes temps réel).
  - **Refondre** Epic 4 (Dashboard) autour du **Dashboard Rush** (temps réel, alertes, lisibilité) tout en gardant le chat IA et les statistiques utiles.
  - **Ajouter** au moins un epic dédié : **Scan-to-Recipe** (scan carte, IA, fiches techniques).
  - **Ajouter** au moins un epic dédié : **Module Nightlife** (coulage, volumes liquides).
  - **Intégrer** le **Closing** (rapport d’écarts + panier fournisseur) dans Epic 6 ou un epic dédié « Closing & Réappro ».
- **Stories :** à détailler lors de la prochaine création/mise à jour des epics (workflow Create Epics and Stories), en s’appuyant sur le PRD et l’architecture mis à jour.

### 4.5 UX (planning-artifacts/ux-design-specification.md)

- **Parcours à documenter ou mettre à jour :**
  - **Onboarding :** Connexion API POS (choix du logiciel, credentials) + scan de la carte/menu via IA.
  - **Raffinage :** Validation et édition des fiches techniques suggérées par l’IA (Scan-to-Recipe).
  - **Service (Rush) :** Utilisation du Dashboard Rush (vue temps réel, alertes) ; notifications mobiles si prévu.
  - **Closing :** Consultation du rapport d’écarts (théorique vs réel) et génération / validation du panier de commande fournisseur.
- **Écrans :** Dashboard Rush minimaliste et ultra-lisible ; écrans Scan-to-Recipe (scan, suggestion, édition fiche) ; écran/vue Closing (rapport + panier).

---

## 5. Handoff pour la mise en œuvre

### 5.1 Classification du changement

**Portée : Majeure** — Replanification fondamentale avec implication PM et Architect.

- Les modifications concernent les objectifs produit, le périmètre MVP, l’architecture (connecteur universel) et la structure des epics/stories.
- Une mise à jour « directe » des seules stories sans toucher au Brief/PRD/Architecture serait incohérente.

### 5.2 Destinataires et responsabilités

| Rôle / Agent | Responsabilités |
|--------------|-----------------|
| **Product Manager (John)** | Mise à jour du PRD (objectifs, contexte, FR/NFR, MVP, parcours) à partir de la vision Flowstock et de la présente proposition. Validation du Brief mis à jour. |
| **Architect (Winston)** | Mise à jour de l’architecture : connecteur universel (adaptateurs + format standard), modèle de données (solides/liquides, recettes, coulage), schémas et intégrations. |
| **UX Designer (Sally)** | Mise à jour de la spec UX : parcours Onboarding / Raffinage / Service / Closing, Dashboard Rush, écrans Scan-to-Recipe et Closing. |
| **Product Manager + Scrum Master (Bob)** | Après mise à jour du PRD et de l’architecture : recréation ou mise à jour des Epics et Stories (workflow Create Epics and Stories), puis Check Implementation Readiness et ajustement du sprint planning. |

### 5.3 Critères de succès

- Brief, PRD, Architecture et UX reflètent la vision Flowstock (restauration + nightlife, blind spot, sync POS, in-rush, Scan-to-Recipe, Nightlife, Dashboard Rush, Closing).
- Le connecteur universel est décrit (périphérie + cœur) et le modèle de données inclut ingrédients/volumes et recettes.
- Les epics et stories sont cohérents avec le nouveau PRD et couvrent au minimum : connecteur POS, Dashboard Rush, Scan-to-Recipe, Nightlife, Closing.
- Un prochain Check Implementation Readiness valide l’alignement Brief / PRD / Architecture / Epics avant de reprendre le développement.

### 5.4 Ordre recommandé des prochaines étapes

1. **Mise à jour du Brief** (docs/brief.md) — PM ou Analyst, avec validation PM.
2. **Mise à jour du PRD** (docs/prd.md) — PM : objectifs, FR/NFR, MVP, parcours.
3. **Mise à jour de l’Architecture** (docs/architecture.md) — Architect : connecteur universel, modèle de données, diagrammes.
4. **Mise à jour de la spec UX** (planning-artifacts/ux-design-specification.md) — UX Designer : parcours et écrans Flowstock.
5. **Create/Update Epics and Stories** — PM avec SM : epics et stories alignés sur le PRD mis à jour.
6. **Check Implementation Readiness** — Architect : vérification de l’alignement de tous les artefacts.
7. **Sprint Planning** (ou Correct Course si besoin) — SM : nouveau plan de sprint basé sur les epics/stories à jour.

---

## 6. Checklist Correct Course (résumé)

- **1.1** Story déclenchante : N/A (pivot stratégique).
- **1.2** Problème : Pivot stratégique — nouvelle vision Flowstock.
- **1.3** Preuve : Document de vision fourni ; écart explicite avec PRD/Architecture actuels.
- **2.1–2.5** Epics : Plusieurs epics impactés (1–4, 5, 6, 9) ; nouveaux blocs à couvrir (connecteur, Scan-to-Recipe, Nightlife, Dashboard Rush, Closing).
- **3.1–3.4** Artefacts : PRD, Architecture, UX, Brief à mettre à jour.
- **4.1–4.4** Option retenue : Replanification fondamentale (Brief → PRD → Archi → Epics/Stories).
- **5.1–5.5** Proposition : Résumé, impact, approche, plan d’action, handoff décrits ci-dessus.
- **6.1–6.5** Revue et handoff : Proposition soumise à votre validation ; handoff vers PM / Architect / UX / SM comme indiqué.

---

**Souhaitez-vous approuver cette proposition pour passer à la mise en œuvre (mise à jour du Brief, puis PRD, puis Architecture, etc.) ?**  
Répondez par **Oui** pour valider, **Non** pour rejeter, ou **Réviser** en indiquant les ajustements souhaités.

---

**Statut :** ✅ **Approuvée par l'utilisateur le 2026-02-22.** Handoff vers PM / Architect / UX / SM pour exécution de la replanification.
