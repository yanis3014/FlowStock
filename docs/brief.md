# Project Brief: SaaS Gestion de Stocks IA pour PME

---

## Introduction

Ce document sert de fondation pour le développement du produit. Il synthétise les insights du brainstorming approfondi et définit le périmètre MVP.

**Mode de création:** Interactif - Section par section avec validation

---

## Executive Summary

**Concept produit:** SaaS de gestion de stocks avec intelligence artificielle prédictive, conçu pour les restaurateurs et PME de la restauration. Beaucoup de rush, beaucoup de mouvements : l’outil donne une vision claire des stocks pendant le rush, des prévisions de rupture, une interface simple et des automatisations pour remplacer Excel et les solutions trop lourdes ou trop chères.

**Problème principal:** En période de rush, les restaurateurs perdent la visibilité sur leurs stocks (mouvements nombreux, peu de temps pour compter ou mettre à jour). Les solutions existantes sont trop chères ou inadaptées au rythme restauration ; Excel et le papier ne tiennent pas la cadence et génèrent ruptures, surstockage et stress.

**Marché cible:** Restaurateurs, cafés, petits commerces alimentaires avec pics d’activité marqués, cherchant simplicité et prix abordable (100-200€/mois).

**Proposition de valeur clé:** Gagner en clarté sur les stocks pendant le rush : vision claire et à jour en temps de forte activité, bonnes prévisions pour anticiper les ruptures, moins de cash dormant et moins de stress grâce à l’IA prédictive.

---

## Problem Statement

### État actuel et points de douleur : Le "Blind Service"

Aujourd'hui, les restaurateurs et gérants de bars gèrent leurs stocks dans l'urgence :

- **Le "Pilotage à l'aveugle" en Rush :** Pendant le service, le personnel ne sait pas précisément ce qu'il reste en cuisine ou au bar. L'information ne circule pas entre la caisse et le stock réel.

- **Le recomptage manuel critique :** Les managers perdent 15 à 30 minutes toutes les 2 heures pour recompter physiquement les stocks critiques (steaks, fûts, bouteilles premium) afin de mettre à jour le système ou prévenir la salle.

- **Saisie de fiches techniques pénible :** Configurer chaque ingrédient pour chaque plat est si chronophage que la plupart des restaurateurs abandonnent le suivi précis des stocks.

### Impact du problème : La perte de contrôle opérationnel

**Problèmes quantifiables identifiés :**

- **Ruptures surprises en plein rush :** Frustration client majeure ("Désolé, on n'en a plus") et perte de chiffre d'affaires immédiate.

- **Le "Coulage" (Pertes & Vols) :** Dans les bars et clubs, l'impossibilité de comparer les doses servies et les doses vendues en temps réel entraîne une perte de marge de 10 à 20%.

- **Dette de sommeil et management :** Les commandes fournisseurs sont passées tard le soir, sur une intuition physique ("je crois qu'il reste de la viande"), entraînant soit du gaspillage (DLC courtes), soit des ruptures le lendemain.

- **Friction Cuisine/Salle :** Tensions humaines dues au manque de visibilité sur les disponibilités produits.

### Pourquoi les solutions existantes échouent

1. **Outils administratifs vs opérationnels :** Les logiciels actuels sont faits pour la comptabilité le lendemain, pas pour aider le serveur ou le chef pendant le rush.

2. **Barrière à l'entrée (Configuration) :** Demander à un chef de saisir 200 fiches techniques manuellement est un échec garanti.

3. **Manque d'intégration "Live" :** Les stocks ne diminuent pas en temps réel avec la caisse, ou alors via des systèmes trop rigides et complexes.

4. **Pas d'IA métier :** Les solutions ne prédisent pas les besoins en fonction de la météo, du jour de la semaine ou des événements locaux.

### Urgence et importance : La survie des marges

**Urgence :** La restauration est un secteur de marges ultra-faibles (5-15%). Chaque steak jeté ou chaque verre "offert" non tracé grignote directement le profit net. Dans un contexte d'inflation des matières premières, l'imprécision n'est plus une option.

**Importance :** Flowstock transforme le stock d'une contrainte administrative en un outil de sérénité. En connectant la caisse au frigo via une IA qui "comprend" le menu, on redonne au manager son rôle premier : l'accueil et la qualité, pas l'inventaire dans le froid.

---

## Proposed Solution

### Concept et approche

**Agent IA Opérationnel "Live-Stock"** offrant :

1. **Dashboard de Rush "Real-Time" :** Interface visuelle ultra-lisible (code couleur Vert/Orange/Rouge) alimentée par une connexion API aux logiciels de caisse (POS). Le stock diminue à chaque commande validée en salle.

2. **Configuration "Scan-to-Recipe" :** IA de vision et de NLP capable de transformer une photo de menu/carte en fiches techniques automatiques avec quantités suggérées, supprimant la barrière de la saisie manuelle.

3. **Le "Connecteur Universel" :** Architecture agnostique permettant de brancher Flowstock sur n'importe quel système de caisse (Lightspeed, L'Addition, Square) en un clic.

4. **Réapprovisionnement Prédictif & Intelligent :** Calcul des commandes fournisseurs basé sur les ventes réelles, la météo et les événements locaux pour supprimer le gaspillage.

5. **Module "Anti-Coulage" (Bars/Clubs) :** Analyse spécifique des volumes liquides et détection d'écarts entre le théorique (ventes) et le réel (stock physique).

### Différenciateurs clés

**vs Gestion Manuelle (Excel/Papier) :**

- **Zéro Saisie Chronophage :** Synchronisation automatique via API vs saisie manuelle ligne par ligne.
- **Visibilité en Rush :** Aide à la décision immédiate en plein service vs constat d'échec après le service.
- **Fiabilité Totale :** Suppression de l'erreur humaine de calcul ou d'oubli.

**vs Solutions Traditionnelles (ERP/Back-office) :**

- **Outil Opérationnel vs Administratif :** Conçu pour être utilisé pendant le rush par les équipes, pas seulement par le comptable le lendemain.
- **Onboarding Éclair (IA) :** Configuration d'un établissement en quelques minutes via Scan-to-Recipe vs plusieurs jours de paramétrage manuel.
- **Prix "Horeca-Friendly" :** Positionnement abordable (100-200€/mois) avec une valeur ajoutée immédiate sur la marge brute.
- **Focus "Nightlife & Restauration" :** Gestion native des spécificités métier (fractions de bouteilles, pertes cuisine, modificateurs de plats) vs solutions génériques.

### Pourquoi cette solution réussira

1. **IA comme cœur différenciant** - Sans l'IA, pas d'innovation. C'est ce qui justifie le prix et l'adoption.
2. **Simplicité d'adoption** - Interface intuitive pour PME non-techniques
3. **Valeur immédiate** - Gain de temps visible dès le premier jour (vision stocks, prévisions)
4. **Apprentissage progressif** - Fonctionne même sans données historiques au départ
5. **Boucle valeur complète** - Prédiction → Commande → Réception → Intégration automatisée

### Vision produit haut niveau

**MVP:** Outil de gestion de stocks avec IA prédictive permettant aux PME de voir leurs stocks, recevoir des prévisions de rupture, commander intelligemment, et intégrer automatiquement les réceptions via photo de facture.

**Vision long terme :** Devenir le "Système Nerveux" de la chaîne d'approvisionnement Horeca. Une plateforme qui ne se contente pas de compter, mais qui automatise l'achat en direct auprès des producteurs/distributeurs, optimise les menus en fonction des marges réelles et crée un écosystème de données collaboratives pour réduire le gaspillage alimentaire à l'échelle d'une ville.

---

## Target Users

### Primary User Segment : Restaurateurs & Chefs de Cuisine

**Profil démographique/firmographique :**

- Propriétaires de restaurants indépendants ou petites chaînes (1-5 établissements).
- Établissements de type Brasserie, Fast-food premium, ou Bistronomie.
- Revenus : CA dépendant fortement de la maîtrise du "Food Cost" (coût matière).
- Niveau technique : Faible à moyen (veulent un outil qui marche "tout seul" sur leur iPad de caisse).

**Comportements et workflows actuels :**

- Calcul du stock "à l'œil" ou via des inventaires physiques hebdomadaires pénibles.
- Transmission d'informations orale entre la cuisine et la salle pendant le rush.
- Commandes fournisseurs passées par SMS ou appels tard le soir.
- Saisie de fiches techniques inexistante ou jamais mise à jour sur Excel.

**Besoins et points de douleur spécifiques :**

1. **Éviter le "Sold Out" imprévu :** Ne pas avoir à s'excuser auprès d'un client parce qu'un produit manque.
2. **Maîtrise de la marge brute :** Identifier instantanément si le coût d'un plat dérive (inflation, surdosage).
3. **Réduction de la charge mentale :** Supprimer la peur d'avoir oublié de commander un ingrédient critique pour le service du lendemain.
4. **Simplification de l'Onboarding :** Pouvoir configurer son stock en 5 minutes, pas en 5 jours.

**Objectifs qu'ils cherchent à atteindre :**

- **Sérénité en Rush :** Savoir que la caisse et la cuisine sont synchronisées.
- **Zéro Gaspillage :** Optimiser les stocks périssables (DLC).
- **Gain de temps :** Automatiser la corvée des commandes de fin de service.

### Secondary User Segment : Gérants de Bars & Nightclubs

**Profil démographique/firmographique :**

- Établissements de nuit à fort volume ou bars à cocktails spécialisés.
- Environnement bruyant, sombre, avec une rotation rapide du personnel (turnover).
- Focus majeur sur les liquides et spiritueux à forte valeur.

**Comportements et workflows actuels :**

- Gestion des bouteilles au "poids" ou à la vue à la fin de la nuit.
- "Coulage" accepté comme une fatalité (verres offerts, serveurs qui boivent, erreurs de dosage).
- Difficulté extrême à faire un inventaire précis dans l'obscurité du club.

**Besoins et points de douleur spécifiques :**

1. **Lutte contre le coulage :** Détecter l'écart exact entre le Gin vendu et le Gin sorti du stock.
2. **Réapprovisionnement "Live" :** Savoir quelle station de bar est presque vide sans quitter le bureau ou le dancefloor.
3. **Gestion des volumes :** Précision au centilitre (fractions de bouteilles).

**Objectifs qu'ils cherchent à atteindre :**

- **Récupérer la marge perdue :** Réduire le coulage de 15% à moins de 2%.
- **Transparence du personnel :** Responsabiliser les barmans via un suivi rigoureux.
- **Vitesse de service :** Ne jamais tomber en rupture de "fûts" ou de bouteilles phares au pic de la soirée.

---

## Goals & Success Metrics

### Business Objectives

- **Acquisition Utilisateurs MVP :** Atteindre 50 établissements (restaurants et bars) actifs dans les 6 mois post-lancement.
- **Rétention :** Maintenir un taux de rétention de 85% après 3 mois (l'outil doit devenir "l'oxygène" du restaurant).
- **Objectif de Revenus (MRR) :** Atteindre 10K€ MRR dans les 12 mois (50-100 clients sur des abonnements de 100-200€/mois).
- **Précision du Scan-to-Recipe :** Atteindre une précision de 90% sur l'extraction automatique des ingrédients dès le premier scan de carte.
- **Performance IA Prédictive :** Atteindre une précision de prédiction des ruptures de stock >90% après seulement 2 semaines d'historique de ventes.

### User Success Metrics (La valeur pour le restaurateur)

- **Réduction du Stress "In-Rush" :** Diminution de 80% des ruptures de stock "surprise" signalées par les clients.
- **Gain de Temps Administratif :** Réduction de 75% du temps passé sur les inventaires et commandes (passer de 1h/jour sur Excel à 15 min/jour sur Flowstock).
- **Maîtrise de la Marge (Food Cost) :** Réduction de 5% à 10% des pertes alimentaires grâce à une meilleure rotation des produits périssables.
- **Lutte contre le "Coulage" (Bars/Clubs) :** Diminution de 50% des écarts inexpliqués entre les stocks théoriques et réels sur les alcools forts.
- **Adoption de l'IA :** 90% des utilisateurs valident les suggestions de commandes intelligentes sans modification majeure après 1 mois.

### Key Performance Indicators (KPIs) Techniques (Pour le dev)

- **Vitesse de Synchro API (Latency) :** Mise à jour du stock théorique en moins de 5 secondes après la validation d'une commande sur le POS.
- **Taux de Complétion Onboarding :** % d'utilisateurs ayant scanné leur carte et connecté leur API de caisse en moins de 15 minutes (cible : 80%).
- **Uptime du Connecteur Universel :** Disponibilité de 99.9% pour garantir que le dashboard de rush est toujours opérationnel pendant le service.
- **Taux d'Ajustement des Recettes :** Pourcentage de modifications manuelles apportées aux recettes générées par l'IA (objectif : baisse constante vers <10%).

---

## MVP Scope

### Core Features (Must Have) - "The Rush Edition"

**1. Le Connecteur Universel API (POS Sync)**

- **Description :** Couche d'abstraction (Adapter Pattern) permettant de traduire les flux de ventes en temps réel provenant des logiciels de caisse (Lightspeed, L'Addition, Square) en décrémentation de stock.
- **Rationale :** FONDATION - Permet de supprimer le décalage entre la vente en salle et l'état du frigo. C'est ce qui règle le problème du "travail à l'aveugle".

**2. Dashboard de Rush "Traffic Light"**

- **Description :** Interface ultra-lisible affichant les produits critiques sous forme de jauges de couleurs (Vert : OK, Orange : À surveiller, Rouge : Rupture imminente). Mise à jour toutes les 5 à 10 secondes.
- **Rationale :** CRITIQUE - C'est l'outil de pilotage du manager pendant le service. Remplace le recomptage physique manuel.

**3. Configuration IA "Scan-to-Recipe"**

- **Description :** Système de vision IA (OCR + LLM) qui analyse la photo d'un menu pour créer automatiquement des fiches techniques théoriques (ex: décomposer un cocktail ou un plat en ses ingrédients de base).
- **Rationale :** DIFFÉRENCIATEUR - Lève le principal frein à l'adoption : la flemme de paramétrer manuellement chaque recette.

**4. Moteur de Stock Hybride (Liquide/Solide)**

- **Description :** Gestion native des unités (steaks, pains) ET des volumes (cl de Gin, litres de lait). Capacité à gérer les fractions de bouteilles pour le monde de la nuit.
- **Rationale :** INDISPENSABLE - Permet de couvrir à la fois la cuisine (restauration) et le bar (coulage).

**5. Commandes Prédictives de Clôture**

- **Description :** Génération automatique d'un panier de commande dès la fin du service, basé sur le stock théorique restant et les prédictions de vente du lendemain.
- **Rationale :** VALEUR QUOTIDIENNE - Permet au gérant de valider ses commandes fournisseurs en 1 clic avant de rentrer chez lui.

**6. Photo de Facture IA & Réconciliation**

- **Description :** Extraction IA des factures fournisseurs pour mettre à jour le stock réel et détecter les erreurs de livraison ou les hausses de prix matières.
- **Rationale :** GAIN DE TEMPS - Automatise l'entrée de stock sans saisie manuelle.

### Out of Scope for MVP (V2/V3)

- **Synchronisation E-commerce (Shopify/Amazon) :** On se concentre exclusivement sur le "Physical Retail/Horeca" pour le moment.
- **Prédictions Météo complexes :** Le moteur se basera d'abord sur l'historique de ventes simple avant d'intégrer des données externes.
- **Multi-sites / Centralisation de franchises :** On vise d'abord l'établissement indépendant unique.
- **Analyses de rentabilité avancées (P&L détaillé) :** On reste sur le flux de stock opérationnel.
- **Inventaire par reconnaissance vidéo (caméra dans le frigo) :** Remplacé par l'intelligence des flux API.

### MVP Success Criteria

- **Précision de l'IA de scan de menu :** >85% de reconnaissance des ingrédients dès le premier essai.
- **Latence de synchronisation :** <10 secondes entre l'encaissement et la mise à jour du Dashboard.
- **Temps d'Onboarding :** <15 minutes pour un établissement standard.

---

## Post-MVP Vision

### Phase 2 Features : L'Intelligence Contextuelle

**Intégrations & Écosystème :**

- **Connexion Terminaux de Paiement (TPE) :** Réconciliation directe entre les paiements et les stocks pour détecter les erreurs de saisie en caisse.
- **Synchronisation avec les Plateformes de Livraison :** (UberEats, Deliveroo) pour décompter les stocks des commandes "hors salle" en temps réel.
- **Export Comptable Automatisé :** Traduction des mouvements de stocks en écritures comptables pour faciliter le bilan.

**IA de Précision Contextuelle :**

- **Météo & Terrasses :** Ajustement des prédictions de stock en fonction de la météo (ex: +30% de stock de bière et salades si grand soleil prévu).
- **Intelligence Événementielle :** Intégration des calendriers locaux (matchs de foot, concerts, festivals à proximité) qui impactent radicalement le flux des bars et restaurants.
- **Apprentissage Collaboratif (Benchmarking) :** Analyse anonymisée des "Food Costs" pour alerter le gérant si son prix d'achat fournisseur est au-dessus de la moyenne du secteur.

**Automatisation Opérationnelle :**

- **Menu Engineering IA :** Suggestion de modification de la carte en fonction de la rentabilité réelle et de la vitesse de rotation des stocks.
- **Commandes 100% Autonomes :** Passage automatique des commandes auprès des fournisseurs habituels après une période de calibration validée.

### Long-term Vision (1-2 ans) : Le Système Nerveux de l'Horeca

**Plateforme Intelligente de Gestion Totale :**

- **Extension à la gestion RH (Labor Cost) :** Prédire le besoin en personnel en fonction des prévisions de stocks et de ventes (si gros rush prévu, l'IA suggère un extra).
- **Écosystème "Zéro Gaspillage" :** Plateforme de revente des surplus entre établissements partenaires ou via des applications anti-gaspillage.
- **Marketplace Fournisseurs intégrée :** Commande directe au producteur via Flowstock avec mise en concurrence automatique sur les prix.

**IA de Haute Précision :**

- **Prédictions Hyper-locales :** Modèles d'IA entraînés spécifiquement sur le comportement du quartier ou du type de cuisine.
- **Recommandations Proactives :** "Le prix du saumon va exploser la semaine prochaine, je vous conseille de stocker maintenant ou de changer votre suggestion du jour."

### Expansion Opportunities

- **Spécialisation par Verticales :** Modules spécifiques pour la "Boulangerie" (gestion des farines/pétrissage), "Hôtellerie" (petit-déjeuners) ou "Food-Trucks" (mobilité).
- **Expansion Internationale :** Support multi-devises, gestion des taxes locales (TVA spécifique restauration) et adaptation aux habitudes de consommation par pays.
- **White-Label pour Distributeurs :** Proposer la technologie Flowstock directement aux grands distributeurs de boissons/nourriture pour qu'ils l'offrent à leurs clients restaurateurs.

---

## Technical Considerations

### Platform Requirements

- **Target Platforms:** Web Responsive (Desktop + Mobile)
- **Browser/OS Support:** Chrome, Firefox, Safari, Edge (dernières 2 versions), iOS 14+, Android 10+
- **Performance Requirements:** 
  - Temps de chargement page <2s
  - Prédictions IA <5s
  - Interface réactive (pas de lag visible)

### Technology Preferences

**Frontend :**

- **Stack :** Next.js ou React avec Tailwind CSS.
- **UX/UI :** Design System "High-Contrast" (lisible en cuisine et dans l'obscurité des bars). Focus sur le Mobile-First (tablettes/smartphones).
- **Temps Réel :** Intégration de WebSockets (ou Socket.io) pour la mise à jour instantanée du dashboard sans rafraîchissement.

**Backend :**

- **Language :** Node.js (TypeScript) ou Python (FastAPI) pour sa rapidité d'exécution et sa facilité d'intégration avec les librairies IA.
- **Architecture :** API RESTful avec une couche d'abstraction (Adapter Pattern) pour le Connecteur Universel POS.

**Database :**

- **Relationnelle :** PostgreSQL (via Prisma ou Supabase) pour la gestion complexe des fiches techniques et des relations Ingrédients/Plats.
- **Cache/Performance :** Redis pour stocker les états de stock "en direct" pendant le rush et garantir une latence <100ms.

**IA/ML :**

- **Vision & NLP :** Utilisation de modèles SOTA (GPT-4o, Gemini 1.5 Pro) pour le "Scan-to-Recipe" et l'extraction de factures.
- **Prédictions :** Modèles de séries temporelles (Prophet, XGBoost) pour l'analyse des tendances et les stocks critiques.

**Hosting/Infrastructure :** Cloud (AWS ou Vercel/Supabase pour la vélocité), avec une infrastructure Serverless pour l'évolutivité.

### Architecture Considerations

- **Repository Structure :** Monorepo (Turborepo ou Nx) pour partager les types entre le Frontend et le Backend (crucial pour la cohérence des fiches techniques).
- **Integration Requirements :**
  - **Webhooks :** Priorité aux intégrations par Webhooks pour recevoir les ventes des POS (Lightspeed, Square, etc.) en temps réel.
  - **Connecteur Universel :** Système de "Traductions" modulaire pour transformer n'importe quel JSON de vente en décrémentation de stock standardisée.
- **Security/Compliance :**
  - **Authentification :** Clerk ou Auth0 (support Multi-tenant pour les groupes de restaurants).
  - **Conformité :** RGPD (données clients/fournisseurs), Chiffrement AES-256 pour les clés API de caisse.
  - **Audit Logs :** Historique complet de chaque mouvement de stock (pour repérer le coulage ou les erreurs).

---

## Constraints & Assumptions

### Constraints

- **Budget IA Opérationnel :** Le coût des tokens (OpenAI/Google) pour le scan de carte et les prédictions doit être optimisé pour ne pas dépasser 10% du prix de l'abonnement (Pricing cible : 100-200€/mois).
- **Timeline :**
  - **Mois 1-3 :** Développement du Connecteur Universel + Sync POS de base.
  - **Mois 4-6 :** IA Scan-to-Recipe + Dashboard de Rush.
  - **Mois 7-9 :** Moteur prédictif + Beta-test en conditions réelles (service soir).
- **Resources :** **Profils Clés :** 1 Fullstack Engineer (expert API/Webhooks), 1 ML Engineer (expert Vision/Time-series), 1 Product Designer spécialisé en interfaces "Ops/Field" (pas juste du SaaS de bureau).

### Key Assumptions

- Les logiciels de caisse (POS) leaders disposent d'APIs accessibles ou de Webhooks fonctionnels.
- Les restaurateurs acceptent d'utiliser un outil numérique en complément de leur caisse s'il réduit leur stress.
- La connectivité Internet dans les établissements est suffisante pour le temps réel (sinon prévoir un mode dégradé "Offline-First").

---

## Risks & Open Questions

### Key Risks

- **Risque d'Adoption Opérationnelle :** Le personnel en rush peut percevoir l'outil comme une contrainte supplémentaire s'il n'est pas 100% invisible.
  - **Impact :** Abandon de l'outil, données de stock faussées.
  - **Mitigation :** Focus "Zero-Saisie", interface "High-Contrast" ultra-rapide, intégration native dans le workflow existant.

- **Risque de Dépendance API (POS) :** Si le logiciel de caisse (Lightspeed, etc.) change son API ou tombe en panne, Flowstock perd sa source de données.
  - **Impact :** Dashboard de rush figé.
  - **Mitigation :** Architecture de "Connecteur Universel" robuste, système d'alerte en cas de perte de synchro, mode de saisie manuelle d'urgence.

- **Risque de Précision des Recettes (Scan-to-Recipe) :** Une erreur de l'IA sur un ingrédient coûteux (ex: dose d'alcool) peut fausser tout l'inventaire.
  - **Impact :** Perte de confiance du gérant sur la rentabilité affichée.
  - **Mitigation :** Système de validation humaine simple après le scan, apprentissage par correction (Feedback Loop).

- **Risque de "Coulage" non déclaré :** Le système suit les ventes, mais pas les bouteilles cassées ou les verres offerts "sous le manteau".
  - **Impact :** Écart entre stock théorique et réel.
  - **Mitigation :** Module de déclaration de perte "Express" (2 clics) et analyse d'anomalies par l'IA pour alerter sur les écarts suspects.

### Open Questions

- **Fidélité du Temps Réel :** Quelle est la latence acceptable pour un chef de rang ? (Le 5-10 secondes est-il suffisant ou faut-il du quasi-instantané ?).
- **Pricing "Nightlife" :** Doit-on avoir un prix différent pour les boîtes de nuit (volume de données plus élevé, gestion du coulage critique) vs les petits cafés ?
- **Stratégie Cold Start :** Comment proposer des prédictions fiables dès la première semaine sans historique ? (Utilisation de modèles "benchmarks" par type de cuisine).

---

## Appendices

### A. Research Summary & Pivot Horeca

**Brainstorming Session (Update Février 2026) :**

- **Pivot Majeur :** Passage d'une gestion de stock généraliste PME à une solution spécialisée "In-Rush" pour la Restauration et le monde de la Nuit.
- **Insight Terrain :** Les chefs de rang travaillent "à l'aveugle". Le manager perd son temps à recompter manuellement.
- **Innovation Clé :** Le Scan-to-Recipe via IA Vision pour briser la barrière psychologique de la configuration manuelle.

**Documents de référence :**

- `docs/pos-integration-mapping.md` - Liste des endpoints APIs (Lightspeed, L'Addition, Square).
- `docs/ai-vision-specs.md` - Spécifications de l'OCR pour les cartes de menus et factures.

### B. Stakeholder Input (Horeca Role Playing)

- **Cuisiniers :** "Je veux savoir si je dois décongeler des steaks avant que le serveur ne vienne me crier dessus."
- **Barmans :** "Besoin de savoir en un coup d'œil si j'ai encore du Gin en réserve sans quitter mon poste."
- **Gérants :** "Marre du coulage et des inventaires le dimanche soir à minuit."

---

## Next Steps

### Immediate Technical Actions (Pour Cursor)

1. **Architecture du Connecteur Universel :** Créer le schéma de données "Agnostique" capable de recevoir des Orders de différentes sources POS.
2. **POC Scan-to-Recipe :** Tester l'extraction d'ingrédients à partir d'une photo de menu via l'API OpenAI/Gemini.
3. **Dashboard "Rush Mode" :** Maquettage d'une interface mobile/tablette ultra-lisible avec jauges de stock en temps réel.
4. **Logique de Décrémentation :** Coder la fonction qui transforme un "Burger" vendu en "-1 Pain, -1 Steak, -20g Fromage" en base de données.

### PM Handoff

Ce Brief est la source de vérité pour la transformation de Flowstock.

**Pour la génération du PRD dans Cursor :**

- Prioriser le Module de Synchronisation API Live (Must-Have #1).
- Développer la logique de Gestion des Volumes Liquides pour le secteur de la nuit.
- S'assurer que chaque User Story se concentre sur le gain de temps et la réduction du stress en plein service.

---

*Document mis à jour le 22 Février 2026*  
*Focus : Restauration, Nightlife & Real-time Stock Management*
