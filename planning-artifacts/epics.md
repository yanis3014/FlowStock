---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - docs/prd.md
  - docs/architecture.md
  - docs/front-end-spec.md
---

# bmad-stock-agent - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for bmad-stock-agent, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Le système doit permettre aux utilisateurs de créer, lire, mettre à jour et supprimer des stocks avec quantités, emplacements, et informations produits de base. Le moteur doit gérer les **unités discrètes** (pièces, steaks, pains) et les **volumes** (cl, L ; fractions de bouteilles pour bars/clubs).

FR2: Le système doit afficher un **Dashboard de Rush "Traffic Light"** : interface ultra-lisible avec produits critiques en jauges Vert (OK) / Orange (à surveiller) / Rouge (rupture imminente), mise à jour 5 à 10 secondes, utilisable en cuisine et au bar (mobile/tablette, high-contrast).

FR3: Le système doit calculer et afficher des estimations de temps de stock disponible pour chaque produit. Pour MVP, ces estimations peuvent être basiques (calcul simple consommation moyenne) et s'améliorer avec l'IA une fois disponible.

FR4: Le moteur IA doit analyser les données historiques de ventes (si disponibles) pour comprendre les tendances et patterns de consommation par produit.

FR5: Le moteur IA doit apprendre progressivement à partir des ventes quotidiennes même en l'absence de données historiques initiales, avec amélioration continue de la précision au fil du temps.

FR6: Le moteur IA doit prédire les ruptures de stocks avec une précision cible de >90% après 2 semaines d'historique de ventes (cold start avec modèles de base). Le système doit afficher le niveau de confiance actuel des prédictions.

FR7: Le système doit générer des recommandations de commande avec rapport explicatif détaillant pourquoi chaque commande est recommandée (tendance, stock actuel, prévision rupture).

FR8: Le système doit appliquer des limites de décision par défaut pour l'IA (seuils de confiance, montants maximums) pour contrôler le niveau d'autonomie. La configuration avancée de ces limites est reportée en V2.

FR9: Le système doit offrir deux modes de commande : validation automatique (après calibration) ou demande d'autorisation avant exécution, avec progression graduelle de l'autonomie.

FR10: Le système doit permettre l'upload de photos de factures fournisseurs pour extraction automatique des informations (quantités, prix, produits) via IA de reconnaissance.

FR11: Le système doit vérifier automatiquement que les quantités et prix extraits de la facture correspondent à la commande initiale et alerter en cas de différences.

FR12: Le système doit intégrer automatiquement les informations extraites de la facture dans la base de données de stocks sans nécessiter de saisie manuelle.

FR13: Le système doit demander une nouvelle photo si la facture est illisible ou si l'extraction IA détecte des ambiguïtés.

FR14: Le système doit afficher des courbes de prévision montrant quand les stocks vont tomber et quand recommander une commande.

FR15: Le système doit afficher des alertes visuelles pour les stocks faibles, ruptures imminentes, et anomalies détectées.

FR16: Le système doit afficher des statistiques de vente essentielles : ventes de la veille, stock actuel, et tendances basiques. Les analyses avancées (comparaisons détaillées, rapports complexes) sont reportées en V2.

FR17: *(Retiré de MVP - Le dashboard principal (FR2) sert de vue d'ensemble et remplace la checklist matinale)*

FR18: Le système doit maintenir un historique des mouvements de stocks (entrées, sorties, ajustements) pour traçabilité.

FR19: Le système doit permettre l'authentification sécurisée des utilisateurs avec gestion de comptes et permissions.

FR20: Le système doit réentraîner automatiquement le modèle IA quotidiennement sur les nouvelles données de ventes pour amélioration continue, avec optimisation des coûts (réentraînement incrémental, batch processing).

FR21: Le système doit permettre la saisie manuelle des données de ventes (date, produit, quantité vendue) pour alimenter le moteur IA.

FR22: Le système doit permettre l'import de données de ventes via fichier CSV avec validation et mapping des colonnes.

FR23: Le système doit fournir un **Connecteur Universel API (POS Sync)** : couche d'abstraction (Adapter Pattern) pour recevoir les flux de ventes en temps réel des logiciels de caisse (Lightspeed, L'Addition, Square) via webhooks/API, et traduire chaque commande validée en décrémentation de stock. Mode dégradé : saisie manuelle d'urgence si perte de synchro.

FR24: Le système doit permettre l'import initial des stocks existants via fichier CSV ou Excel pour faciliter l'onboarding des nouveaux clients.

FR25: Le système doit permettre la création et gestion des fournisseurs (nom, contact, produits associés) nécessaires pour les commandes.

FR26: Le système doit permettre la saisie manuelle des informations de facture si l'extraction IA échoue ou si l'utilisateur préfère saisir manuellement, avec validation des données.

FR27: Le système doit fournir des formules de calcul prédéfinies communes (ex: consommation moyenne, stock de sécurité, point de commande) que les utilisateurs peuvent utiliser directement.

FR28: Le système doit permettre aux utilisateurs de créer leurs propres formules de calcul personnalisées via un champ de saisie manuelle de fonctions mathématiques, similaire à Excel, pour répondre à leurs besoins spécifiques.

FR29: Le système doit valider la syntaxe des formules personnalisées avant exécution et afficher des messages d'erreur clairs en cas de formule invalide.

FR30: Le système doit supporter une structure d'abonnement à trois niveaux : Normal, Premium, et Premium Plus, avec fonctionnalités différenciées selon le niveau d'abonnement.

FR31: Le système doit restreindre l'accès aux fonctionnalités avancées (IA prédictions, commandes automatiques, photo facture IA) selon le niveau d'abonnement de l'utilisateur.

FR32: Le système doit permettre la gestion des abonnements (souscription, upgrade, downgrade) avec facturation automatique selon le niveau choisi.

FR33: Le système doit fournir une interface de chat conversationnel avec agent IA permettant d'accéder rapidement aux informations sur les stocks, avec mémoire contextuelle pour référencer des éléments de conversation précédents, disponible sur toutes les plateformes (desktop, tablette, mobile).

FR34: Le système doit permettre au chat IA de générer des recommandations de commande directement depuis la conversation lorsque l'IA détecte une rupture de stock imminente, avec possibilité de validation en un clic depuis le chat.

FR35: Le système doit offrir un **Scan-to-Recipe** : à partir d'une photo de menu ou de carte, l'IA (vision + NLP) doit générer automatiquement des fiches techniques théoriques (plats/cocktails décomposés en ingrédients avec quantités suggérées). Validation humaine simple après le scan ; apprentissage par correction (feedback loop). Cible : ≥90% de reconnaissance des ingrédients dès le premier essai.

FR36: Le système doit gérer un **moteur de stock hybride** : unités solides (pièces) et volumes liquides (cl, L), avec gestion des fractions de bouteilles (bars/nightlife) et des modificateurs de plats (cuisine). Décrémentation automatique à partir des ventes POS mappées aux recettes.

FR37: Le système doit générer des **commandes prédictives de clôture** : en fin de service, panier de commande fournisseur proposé automatiquement à partir du stock théorique restant et des prédictions de vente du lendemain, avec validation en un clic par le gérant.

FR38: Le système doit proposer un **module de déclaration de perte "Express"** (ex. 2 clics) pour enregistrer bouteilles cassées, verres offerts, pertes cuisine, et doit permettre l'analyse des écarts théorique/réel (détection d'anomalies / coulage) avec alertes sur écarts suspects.

### NonFunctional Requirements

NFR1: Le système doit répondre aux requêtes de visualisation de stocks en moins de 2 secondes. En mode rush, le dashboard doit se mettre à jour en moins de 10 secondes après une vente en caisse (cible : <5 secondes).

NFR2: Le système doit générer les prédictions IA en moins de 5 secondes pour maintenir l'engagement utilisateur.

NFR3: Le système doit supporter un minimum de 100 utilisateurs simultanés sans dégradation de performance.

NFR4: Le système doit garantir une disponibilité de 99% (uptime) pour MVP, avec 99.9% pour le Connecteur Universel (dashboard de rush opérationnel pendant le service). Plan d'amélioration vers 99.5% global en V2.

NFR5: Toutes les données de stocks doivent être chiffrées en transit (HTTPS) et au repos (encryption at rest) pour conformité sécurité.

NFR6: Le système doit être conforme RGPD avec gestion du consentement, droit à l'effacement, et portabilité des données.

NFR7: Le système doit maintenir des logs d'audit pour toutes les actions critiques (modifications stocks, commandes, accès données) pour traçabilité et sécurité.

NFR8: Le système doit effectuer des backups automatiques quotidiens des données avec possibilité de restauration point-in-time.

NFR9: Le système doit être accessible via navigateurs web modernes (Chrome, Firefox, Safari, Edge - dernières 2 versions) et responsive pour mobile (iOS 14+, Android 10+).

NFR10: Le système doit supporter une architecture multi-tenant pour isoler les données de chaque entreprise cliente.

NFR11: Le système doit être scalable horizontalement pour supporter la croissance du nombre de clients sans refonte majeure.

NFR12: Le moteur IA doit être capable de fonctionner avec un minimum de données (cold start) en utilisant des modèles de base et apprentissage progressif.

NFR13: Le système doit garantir une précision minimale de 90% des prédictions de rupture après 2 semaines d'historique de ventes (cold start). Précision Scan-to-Recipe : ≥90% de reconnaissance des ingrédients dès le premier essai (objectif taux d'ajustement manuel des recettes vers <10%).

NFR14: Le système doit gérer les erreurs gracieusement avec messages d'erreur clairs et possibilité de récupération sans perte de données.

NFR15: Le système doit fournir un monitoring basique de la performance IA (précision globale, taux d'erreur) pour MVP. Les métriques détaillées (rappel, F1-score, analyses avancées) sont reportées en V2.

NFR16: Le système doit garantir une isolation stricte des données et modèles IA par tenant (multi-tenancy) pour éviter toute fuite de données entre clients.

NFR17: Le système doit fournir un mécanisme de rollback des modèles IA en cas de dérive de performance, avec alertes automatiques sur la qualité des prédictions.

NFR18: Le système doit maintenir un système de validation des prédictions IA en comparant les prédictions avec la réalité (ground truth) pour calculer la précision réelle et améliorer les modèles.

NFR19: Le système doit gérer les erreurs spécifiques à l'IA (fausses prédictions, modèles défaillants) avec mécanismes de correction manuelle et communication transparente aux utilisateurs.

NFR20: Le système doit permettre un **onboarding complet** (connexion POS + scan carte/menu) en moins de 15 minutes pour un établissement standard (cible : 80% des utilisateurs).

NFR21: Le système doit fournir un **mode dégradé** (saisie manuelle, offline-first) si la connectivité ou l'API POS est indisponible, sans perte de données.

### Additional Requirements

#### Requirements from Architecture Document

- **Projet Greenfield** : Aucun starter template ou projet existant (ou évolution monorepo). Stack recommandée : monorepo (Turborepo/Nx), API RESTful + Connecteur Universel (Adapter Pattern), Next.js/React + Tailwind, Node.js (TypeScript) ou FastAPI pour ML, PostgreSQL + Redis, Clerk/Auth0.
- **Connecteur Universel POS** : Webhooks (Lightspeed, L'Addition, Square) pour réception ventes en temps réel ; traduction en décrémentation de stock ; schéma de données agnostique Orders ; alerte perte de synchro ; mode dégradé saisie manuelle. Uptime Connecteur 99.9%.
- **Temps réel** : WebSockets (ou Socket.io) pour mise à jour du Dashboard de Rush sans rafraîchissement ; Redis pour état stock "live" pendant le rush (latence <100 ms).
- **Architecture Microservices Modulaire** : Services séparés pour API Gateway, Service Stocks, Service IA/ML, Service Commandes, Service Factures, Service Analytics. Communication via APIs RESTful avec possibilité d'ajout de message queue pour tâches asynchrones (entraînement IA).
- **Infrastructure Cloud** : Google Cloud Platform (GCP) recommandé avec Cloud Run pour déploiement containerisé, Vertex AI pour ML, Cloud SQL (PostgreSQL), InfluxDB/TimescaleDB pour time-series.
- **Containerisation Docker** : Tous les services doivent être containerisés avec Docker pour reproductibilité et maintenance long terme. Docker Compose pour développement local.
- **Monorepo Structure** : Structure monorepo recommandée pour faciliter le partage de code entre frontend, backend, et services IA.
- **Base de données** : PostgreSQL pour données relationnelles (stocks, commandes, utilisateurs) + base de données time-series (InfluxDB ou TimescaleDB) pour données de ventes historiques et métriques IA.
- **Frontend** : Framework moderne (React ou Vue.js) avec state management (Redux/Vuex), design system avec composants réutilisables.
- **Backend** : Node.js/Python selon expertise équipe, APIs RESTful avec OpenAPI/Swagger documentation.
- **IA/ML** : Python avec frameworks (TensorFlow/PyTorch), infrastructure ML (MLflow pour tracking, Kubernetes pour déploiement modèles).
- **Infrastructure** : Cloud (AWS/GCP/Azure) avec containers (Docker/Kubernetes), CI/CD (GitHub Actions/GitLab CI).
- **Monitoring** : Logging centralisé (ELK stack ou équivalent), monitoring performance (Prometheus/Grafana), alerting.
- **Sécurité** : OAuth2/JWT pour authentification, chiffrement données sensibles, WAF, rate limiting.
- **Multi-tenancy** : Isolation données par client (schema par tenant ou row-level security selon scale).
- **Cold start IA** : Modèles pré-entraînés sur données agrégées anonymisées + fine-tuning par client.
- **Réentraînement IA** : Pipeline automatisé quotidien avec validation avant déploiement nouveau modèle.
- **Testing** : Pyramide complète - Unit tests (80% couverture logique métier critique), Integration tests, E2E tests, Tests IA, Tests performance.

#### Requirements from UX Design Document

- **Interface Chat IA** : Le système doit fournir un chat conversationnel avec l'agent IA comme point d'entrée principal et interface universelle pour accéder rapidement aux informations sur les stocks. Disponible sur toutes les plateformes (desktop, tablette, mobile).
- **Mémoire contextuelle du chat** : Le chat doit avoir une mémoire contextuelle permettant de référencer des éléments de conversation précédents (ex: "combien d'ordi de telle marque" puis "leurs prix" - le chat se souvient du contexte).
- **Visualisation interactive des courbes** : Affichage intuitif et interactif des courbes de stocks et des prédictions IA avec pourcentage de certitude affiché à chaque fois, permettant comparaison de produits via bouton dédié.
- **Réapprovisionnement transparent** : Système de recommandations de commande proposé par l'agent IA avec explications détaillées (cause/explication de rupture, prix, quantité, fournisseur, date estimée arrivée, pourcentage fiabilité), mode aperçu, possibilité de modifier/refuser, code couleur clair pour urgences.
- **Workflow photo facture fluide** : Workflow de photo de facture qui n'est pas "magique" mais fluide et compréhensible : récapitulatif après chaque photo, possibilité de modifier si erreur détectée, ne s'ajoute pas automatiquement (demande autorisation), plusieurs photos possibles mais pas de répétition d'articles.
- **Responsive Design** : Interface responsive pour desktop (usage principal), tablette et mobile (consultation rapide).
- **Accessibilité WCAG AA** : Le système doit respecter les standards WCAG AA pour accessibilité (contraste couleurs, navigation au clavier, labels pour lecteurs d'écran, messages d'erreur clairs).
- **Progressive Disclosure Mobile** : Masquer la complexité sur mobile, exposer seulement l'essentiel pour une utilisation rapide.
- **Actions Rapides Mobile** : Permettre des actions critiques depuis mobile (validation commande, consultation stocks, réception notifications).
- **Synchronisation Temps Réel** : Garantir la cohérence des données entre desktop et mobile pour une expérience fluide multi-utilisateurs.
- **Flowstock / Rush** : Dashboard de Rush "Traffic Light" comme premier écran ; jauges Vert/Orange/Rouge ; Mobile-First (tablette, smartphone) ; design High-Contrast (cuisine, bars) ; contraste ≥ 4,5:1 ; cibles tactiles ≥ 44 px ; onboarding <15 min (connexion POS + Scan-to-Recipe) ; déclaration de perte en 2 clics.

### FR Coverage Map

FR1: Epic 3 - CRUD stocks + moteur hybride (unités/volumes)
FR2: Epic 4 - Dashboard de Rush Traffic Light
FR3: Epic 3 - Estimations basiques temps de stock
FR4: Epic 6 - Analyse tendances IA
FR5: Epic 6 - Apprentissage progressif IA
FR6: Epic 6 - Prédiction ruptures >90% (2 semaines)
FR7: Epic 6 - Recommandations commande avec explications
FR8: Epic 6 - Limites décision IA par défaut
FR9: Epic 6 - Modes commande (auto/validation)
FR10: Epic 7 - Upload photo facture
FR11: Epic 7 - Vérification facture vs commande
FR12: Epic 7 - Intégration automatique facture
FR13: Epic 7 - Nouvelle photo si illisible
FR14: Epic 4 - Courbes de prévision
FR15: Epic 4 - Alertes visuelles
FR16: Epic 4 - Statistiques essentielles
FR17: *(Retiré de MVP)*
FR18: Epic 3 - Historique mouvements stocks
FR19: Epic 1 - Authentification sécurisée
FR20: Epic 6 - Réentraînement automatique quotidien
FR21: Epic 3 - Saisie manuelle ventes
FR22: Epic 3 - Import CSV ventes
FR23: Epic 2 - Connecteur Universel POS Sync (webhooks, Adapter, décrémentation temps réel)
FR24: Epic 3 - Import initial stocks
FR25: Epic 3 - Gestion fournisseurs
FR26: Epic 7 - Saisie manuelle facture (fallback)
FR27: Epic 3 - Formules prédéfinies
FR28: Epic 3 - Formules personnalisées
FR29: Epic 3 - Validation syntaxe formules
FR30: Epic 1 - Structure abonnement 3 niveaux
FR31: Epic 1 - Restriction fonctionnalités par niveau
FR32: Epic 1 - Gestion abonnements (souscription/upgrade/downgrade)
FR33: Epic 4 - Chat IA conversationnel avec mémoire contextuelle
FR34: Epic 6 - Génération commandes depuis chat IA
FR35: Epic 5 - Scan-to-Recipe (photo menu/carte → fiches techniques IA)
FR36: Epic 3 - Moteur hybride (unités + volumes, fractions bouteilles, décrémentation POS)
FR37: Epic 6 - Commandes prédictives de clôture (panier fin de service, validation 1 clic)
FR38: Epic 8 - Anti-Coulage & déclaration de perte express (2 clics), alertes anomalies

## Epic List

### Epic 1: Foundation & Infrastructure
Permettre aux utilisateurs de s'inscrire, se connecter et gérer leur abonnement (Normal / Premium / Premium Plus), établissant les fondations techniques et l'authentification multi-tenant (Clerk/Auth0).
**FRs couverts :** FR19, FR30, FR31, FR32

### Epic 2: Connecteur Universel API (POS Sync) — Must-Have #1
Permettre la réception des ventes en temps réel depuis les caisses (Lightspeed, L'Addition, Square) via webhooks et la décrémentation automatique du stock sans saisie manuelle ; mode dégradé si perte de synchro.
**FRs couverts :** FR23

### Epic 3: Gestion Stocks de Base & Moteur Hybride
Permettre la gestion complète des stocks (CRUD), des unités et des volumes (liquides, fractions de bouteilles), l'historique des mouvements, l'import initial, les fournisseurs, la saisie/import des ventes et les formules de calcul (prédéfinies et personnalisées).
**FRs couverts :** FR1, FR3, FR18, FR21, FR22, FR24, FR25, FR27, FR28, FR29, FR36

### Epic 4: Dashboard de Rush "Traffic Light"
Permettre une vision ultra-lisible des produits critiques (jauges Vert/Orange/Rouge), mise à jour en temps réel (5–10 s), courbes de prévision, alertes, statistiques et chat IA contextuel ; mobile-first, high-contrast.
**FRs couverts :** FR2, FR14, FR15, FR16, FR33

### Epic 5: Scan-to-Recipe (IA Vision/NLP)
Permettre de générer des fiches techniques à partir d'une photo de menu ou de carte (IA vision + NLP), avec validation humaine et feedback loop ; cible ≥90 % de reconnaissance des ingrédients.
**FRs couverts :** FR35

### Epic 6: Moteur IA Prédictif & Commandes de Clôture
Permettre les prédictions de rupture (>90 % après 2 semaines), les recommandations de commande avec explications, la validation en 1 clic, les commandes prédictives de clôture (panier fin de service) et la génération de commandes depuis le chat IA.
**FRs couverts :** FR4, FR5, FR6, FR7, FR8, FR9, FR20, FR34, FR37

### Epic 7: Photo Facture IA & Réconciliation
Permettre l'upload de photos de factures, l'extraction IA, la vérification vs commande, l'intégration automatique en base et la saisie manuelle en fallback.
**FRs couverts :** FR10, FR11, FR12, FR13, FR26

### Epic 8: Anti-Coulage & Déclaration de perte
Permettre la déclaration de perte express (2 clics), l'analyse des écarts théorique/réel et les alertes sur anomalies (bars/clubs).
**FRs couverts :** FR38

---

## Epic 1: Foundation & Infrastructure

Permettre aux utilisateurs de s'inscrire, se connecter et accéder à leur compte avec gestion des abonnements selon leur niveau, établissant les fondations techniques du système.

**FRs couverts:** FR19, FR30, FR31, FR32

**Valeur utilisateur:** Système d'authentification sécurisé et gestion des abonnements pour différencier les fonctionnalités selon le plan choisi.

### Story 1.1: Project Setup & Infrastructure Foundation

As a **développeur**,  
I want **un projet configuré avec structure monorepo, Git, CI/CD, Docker, et infrastructure cloud de base**,  
so that **l'équipe peut commencer le développement dans un environnement structuré et déployable**.

**Acceptance Criteria:**

**Given** un nouveau projet greenfield  
**When** je configure l'infrastructure de base  
**Then** le repository Git est initialisé avec structure monorepo (frontend, backend, services IA)  
**And** le CI/CD pipeline est configuré (GitHub Actions/GitLab CI) avec build et tests basiques  
**And** Docker et Docker Compose sont configurés pour containerisation et développement local  
**And** l'infrastructure cloud GCP est configurée avec environnement de développement (Cloud Run, Cloud SQL)  
**And** un endpoint `/health` retourne status 200 avec informations basiques (version, timestamp)  
**And** la documentation README contient les instructions de setup local et déploiement  
**And** tous les services peuvent être démarrés localement via Docker Compose

### Story 1.2: Database Setup & Multi-Tenancy Foundation

As a **développeur**,  
I want **une base de données configurée avec support multi-tenant et base de données time-series**,  
so that **les données de chaque client sont isolées et sécurisées dès le départ**.

**Acceptance Criteria:**

**Given** l'infrastructure de base est configurée  
**When** je configure les bases de données  
**Then** PostgreSQL est configuré avec schéma de base pour multi-tenancy (tenant_id sur toutes les tables ou row-level security)  
**And** la base de données time-series est configurée (InfluxDB ou TimescaleDB) pour données de ventes historiques  
**And** les migrations de base de données sont configurées (ex: Alembic, Flyway, Prisma)  
**And** l'isolation des données est testée avec deux tenants différents (aucune fuite de données)  
**And** les backups automatiques quotidiens sont configurés  
**And** la documentation du schéma de base de données est créée

### Story 1.3: User Authentication & Registration

As a **utilisateur**,  
I want **m'inscrire et me connecter de manière sécurisée**,  
so that **mes données sont protégées et je peux accéder à mon compte**.

**Acceptance Criteria:**

**Given** un utilisateur non authentifié  
**When** je m'inscris avec email et mot de passe  
**Then** mon compte est créé avec validation email requise  
**And** je reçois un email de confirmation avec lien de validation  
**And** après validation, je peux me connecter avec JWT/OAuth2  
**And** ma session est sécurisée avec gestion de session appropriée  
**And** je peux récupérer mon mot de passe via reset par email  
**And** je suis associé à un tenant (entreprise) lors de l'inscription  
**And** les permissions basiques sont gérées (owner, admin, user)  
**And** le système protège contre les attaques (rate limiting, CSRF)  
**And** les tests d'authentification (unit + integration) sont passants

### Story 1.4: Subscription Tiers Management

As a **système**,  
I want **gérer les niveaux d'abonnement (Normal, Premium, Premium Plus)**,  
so that **les fonctionnalités sont correctement restreintes selon le plan de l'utilisateur**.

**Acceptance Criteria:**

**Given** un utilisateur authentifié  
**When** le système vérifie le niveau d'abonnement  
**Then** le modèle de données pour abonnements existe (niveau, date début, date fin, statut)  
**And** l'API permet de vérifier le niveau d'abonnement d'un utilisateur  
**And** le middleware/guard restreint l'accès aux fonctionnalités selon le niveau (Normal/Premium/Premium Plus)  
**And** l'interface admin permet de gérer les abonnements (souscription, upgrade, downgrade)  
**And** les logs des changements d'abonnement sont enregistrés  
**And** les tests de restriction d'accès par niveau sont passants  
**And** la facturation automatique selon le niveau choisi est configurée (intégration future)

---

## Epic 2: Connecteur Universel API (POS Sync)

Permettre la réception des ventes en temps réel depuis les caisses (Lightspeed, L'Addition, Square) via webhooks et la décrémentation automatique du stock sans saisie manuelle ; mode dégradé si perte de synchro.

**FRs couverts:** FR23

### Story 2.1: Endpoint Webhook POS & validation des payloads

As a **système POS (Lightspeed, L'Addition, Square)**,
I want **envoyer les événements de vente à une URL webhook sécurisée**,
so that **Flowstock reçoit les ventes en temps réel sans polling**.

**Acceptance Criteria:**

**Given** le connecteur POS est configuré pour un tenant  
**When** une vente est enregistrée en caisse  
**Then** le POS envoie un POST vers l'endpoint webhook Flowstock (configurable par tenant)  
**And** l'endpoint valide la signature / token selon le type de POS  
**And** le payload est validé (champs obligatoires : id externe, ligne(s) de vente, date/heure)  
**And** en cas de succès, l'API retourne 200 pour éviter les retries inutiles  
**And** les requêtes sont idempotentes (même id externe = pas de double décrémentation)  
**And** les erreurs 4xx/5xx sont loguées avec tenant_id pour diagnostic

### Story 2.2: Décrémentation automatique du stock à partir d'un événement vente

As a **restaurateur**,
I want **que chaque vente enregistrée en caisse décrémente automatiquement mon stock**,
so that **je n'ai pas à saisir manuellement les sorties**.

**Acceptance Criteria:**

**Given** un événement vente validé (Story 2.1) et un mapping produit POS → produit Flowstock  
**When** le service traite l'événement  
**Then** les quantités vendues sont déduites des stocks concernés (unités et/ou volumes)  
**And** un mouvement de type "vente POS" est enregistré dans l'historique (FR18)  
**And** les produits non mappés sont listés dans un rapport ou alerte (pas de silencieux drop)  
**And** la cohérence multi-tenant est garantie (isolation par tenant_id)  
**And** en cas d'erreur (stock insuffisant, produit inconnu), l'événement est mis en file pour retry ou manuel

### Story 2.3: Adapteur POS — Lightspeed

As a **utilisateur ayant des caisses Lightspeed**,
I want **connecter mon compte Lightspeed à Flowstock**,
so that **mes ventes sont synchronisées automatiquement**.

**Acceptance Criteria:**

**Given** un tenant avec abonnement incluant le connecteur POS  
**When** l'utilisateur configure la connexion Lightspeed (clé API / webhook)  
**Then** l'adapteur transforme les payloads Lightspeed en événements internes (Adapter Pattern)  
**And** le mapping catalogue Lightspeed → produits Flowstock est configurable (écran ou import)  
**And** les ventes sont traitées en temps réel après réception du webhook  
**And** la documentation des champs mappés et des limites (rate, format) est disponible

### Story 2.4: Adapteurs POS — L'Addition & Square

As a **utilisateur ayant des caisses L'Addition ou Square**,
I want **connecter ma caisse à Flowstock**,
so that **mes ventes sont synchronisées sans saisie manuelle**.

**Acceptance Criteria:**

**Given** un tenant ayant choisi L'Addition ou Square  
**When** l'utilisateur configure la connexion (webhook / API selon fournisseur)  
**Then** un adapteur dédié transforme les payloads en événements internes (même format que Story 2.2)  
**And** le mapping produits POS → Flowstock est configurable  
**And** le comportement (décrémentation, idempotence) est identique à Lightspeed  
**And** les deux connecteurs peuvent coexister (même code métier, adapters différents)

### Story 2.5: Mode dégradé et alertes perte de synchro

As a **restaurateur**,
I want **être alerté si la synchro POS est perdue et pouvoir basculer en saisie manuelle**,
so that **je ne perds pas la traçabilité en cas de panne**.

**Acceptance Criteria:**

**Given** un connecteur POS actif pour le tenant  
**When** aucun événement n'est reçu pendant une durée configurée (ex. 15 min) ou les webhooks renvoient des erreurs  
**Then** le système passe en mode dégradé (indicateur visible sur le Dashboard)  
**And** l'utilisateur est notifié (alerte in-app ou optionnellement email)  
**And** la saisie manuelle des ventes reste disponible (FR21) pour continuer à mettre à jour le stock  
**And** lorsque les webhooks reprennent, le mode dégradé est levé et l'utilisateur est informé  
**And** les métriques (dernier événement reçu, nombre d'échecs) sont exposées pour le support

---

## Epic 3: Gestion Stocks de Base & Moteur Hybride

Permettre la gestion complète des stocks (CRUD), des unités et des volumes (liquides, fractions de bouteilles), l'historique des mouvements, l'import initial, les fournisseurs, la saisie/import des ventes et les formules de calcul (prédéfinies et personnalisées).

**FRs couverts:** FR1, FR3, FR18, FR21, FR22, FR24, FR25, FR27, FR28, FR29, FR36

**Valeur utilisateur:** Remplacement d'Excel avec gestion complète des stocks, import initial pour faciliter l'onboarding, et traçabilité complète via l'historique.

**Valeur utilisateur:** Remplacement d'Excel avec gestion complète des stocks, import initial pour faciliter l'onboarding, et traçabilité complète via l'historique.

### Story 3.1: CRUD Stocks de Base

As a **gérant de PME**,  
I want **créer, voir, modifier et supprimer mes stocks**,  
so that **je peux gérer mon inventaire de base**.

**Acceptance Criteria:**

**Given** je suis un utilisateur authentifié  
**When** je crée un nouveau stock  
**Then** je peux saisir les informations produit (nom, description, SKU, quantité, unité, emplacement)  
**And** la validation des données fonctionne (quantité >= 0, champs obligatoires)  
**And** le stock est enregistré en base de données avec association au tenant  
**When** je consulte mes stocks  
**Then** je vois la liste de tous mes stocks avec leurs informations  
**When** je modifie un stock  
**Then** je peux mettre à jour toutes les informations  
**And** les modifications sont enregistrées  
**When** je supprime un stock  
**Then** je reçois une confirmation avant suppression  
**And** le stock est supprimé de la base de données  
**And** les messages de confirmation sont affichés pour toutes les actions  
**And** les erreurs sont gérées gracieusement (produit inexistant, validation échouée)  
**And** les tests unitaires et integration pour CRUD sont passants

### Story 3.2: Import Initial Stocks (Onboarding)

As a **nouvel utilisateur**,  
I want **importer mes stocks existants depuis Excel/CSV**,  
so that **je n'ai pas à tout saisir manuellement au démarrage**.

**Acceptance Criteria:**

**Given** je suis un nouvel utilisateur authentifié  
**When** j'upload un fichier CSV/Excel  
**Then** l'interface permet l'upload de fichier  
**And** le parser détecte automatiquement les colonnes  
**And** je peux mapper les colonnes vers les champs produits (nom, quantité, etc.)  
**And** une prévisualisation des données est affichée avant import  
**And** la validation des données importées fonctionne (format, valeurs)  
**And** l'import en batch gère les erreurs (lignes valides importées, erreurs reportées)  
**And** un rapport d'import est généré (succès, erreurs, lignes ignorées)  
**And** un template CSV/Excel est fourni en téléchargement

### Story 3.3: Gestion Emplacements

As a **gérant de PME**,  
I want **associer mes stocks à des emplacements (entrepôts, magasins)**,  
so that **je peux gérer des stocks multi-emplacements**.

**Acceptance Criteria:**

**Given** je suis un utilisateur authentifié  
**When** je crée un emplacement  
**Then** je peux définir le nom et les informations de l'emplacement  
**And** je peux modifier et supprimer des emplacements  
**When** j'associe un stock à un emplacement  
**Then** le stock est lié à l'emplacement  
**And** je peux voir les stocks par emplacement  
**And** la quantité totale par emplacement est calculée et affichée  
**And** je peux filtrer les stocks par emplacement dans l'interface  
**And** le système supporte les multi-emplacements (un produit peut avoir des quantités dans plusieurs emplacements)

### Story 3.4: Historique Mouvements Stocks

As a **gérant de PME**,  
I want **voir l'historique des mouvements de mes stocks**,  
so that **je peux tracer toutes les modifications et comprendre l'évolution**.

**Acceptance Criteria:**

**Given** je suis un utilisateur authentifié  
**When** un mouvement de stock se produit (création, modification quantité, suppression)  
**Then** le mouvement est automatiquement enregistré dans l'historique  
**And** les informations suivantes sont enregistrées : date/heure, type mouvement, utilisateur, ancienne valeur, nouvelle valeur, raison  
**When** je consulte l'historique d'un produit  
**Then** je vois tous les mouvements pour ce produit  
**And** je peux filtrer l'historique (date, type mouvement, utilisateur)  
**And** l'historique est limité selon le niveau d'abonnement (30 jours Normal, 90 jours Premium, illimité Premium Plus)  
**And** je peux exporter l'historique en CSV (selon niveau abonnement)

### Story 3.5: Gestion Fournisseurs

As a **gérant de PME**,  
I want **créer et gérer mes fournisseurs**,  
so that **je peux les associer à mes produits et commandes**.

**Acceptance Criteria:**

**Given** je suis un utilisateur authentifié  
**When** je crée un fournisseur  
**Then** je peux saisir les informations (nom, contact, email, téléphone, adresse)  
**And** je peux modifier et supprimer des fournisseurs  
**When** j'associe un produit à un fournisseur  
**Then** le produit est lié au fournisseur principal  
**And** je peux voir la liste des fournisseurs avec leurs produits associés  
**And** l'interface de gestion des fournisseurs est disponible  
**And** la validation des données fournisseur fonctionne (email valide, etc.)

---

### Suite Epic 3 — Capture Données Ventes & Formules

Permettre aux utilisateurs de capturer leurs données de ventes (manuelle, CSV, terminaux), utiliser des formules de calcul prédéfinies ou créer leurs propres formules, et obtenir des estimations basiques de temps de stock.

**FRs couverts:** FR21, FR22, FR23, FR27, FR28, FR29, FR3

**Valeur utilisateur:** Alimentation du système avec données de ventes et calculs personnalisables pour répondre aux besoins spécifiques de chaque PME, avec estimations basiques même sans IA.

### Story 3.6: Saisie Manuelle Ventes

As a **gérant de PME**,  
I want **saisir manuellement mes ventes quotidiennes**,  
so that **je peux alimenter le système avec mes données de ventes**.

**Acceptance Criteria:**

**Given** je suis un utilisateur authentifié  
**When** je saisis une vente  
**Then** je peux saisir la date, le produit, la quantité vendue, et le prix de vente (optionnel)  
**And** la validation des données fonctionne (produit existe, quantité > 0, date valide)  
**And** la vente est enregistrée en base de données time-series  
**And** je peux voir la liste des ventes récentes avec possibilité de modification/suppression  
**And** le calcul automatique des ventes totales par jour/produit fonctionne  
**And** les tests unitaires pour la logique de saisie sont passants

### Story 3.7: Import CSV Ventes

As a **gérant de PME**,  
I want **importer mes ventes depuis un fichier CSV**,  
so that **je peux importer mes données historiques ou mes exports d'autres systèmes**.

**Acceptance Criteria:**

**Given** je suis un utilisateur authentifié  
**When** j'upload un fichier CSV de ventes  
**Then** l'interface permet l'upload de fichier CSV  
**And** le parser CSV détecte automatiquement les colonnes (date, produit, quantité, prix)  
**And** je peux mapper les colonnes vers les champs ventes  
**And** une prévisualisation des données est affichée avant import  
**And** la validation des données fonctionne (produits existent, dates valides)  
**And** l'import en batch gère les erreurs (succès, erreurs reportées)  
**And** un rapport d'import est généré (succès, erreurs)  
**And** un template CSV est fourni en téléchargement

### Story 3.8: Formules Prédéfinies

As a **gérant de PME**,  
I want **utiliser des formules de calcul prédéfinies communes**,  
so that **je peux faire des calculs standards sans avoir à les créer**.

**Acceptance Criteria:**

**Given** je suis un utilisateur authentifié  
**When** j'accède aux formules de calcul  
**Then** les 8 formules prédéfinies sont disponibles (consommation moyenne, stock sécurité, point commande, taux rotation, jours stock restant, coût stock moyen, valeur stock, marge bénéficiaire)  
**And** l'interface affiche la liste des formules disponibles avec descriptions  
**And** je peux sélectionner une formule avec ses paramètres (ex: période pour consommation moyenne)  
**And** le calcul et l'affichage du résultat fonctionnent  
**And** je peux utiliser le résultat dans d'autres calculs  
**And** la documentation de chaque formule est disponible  
**And** les tests unitaires pour chaque formule sont passants

### Story 3.9: Saisie Manuelle Formules Personnalisées

As a **gérant de PME**,  
I want **créer mes propres formules de calcul personnalisées**,  
so that **je peux répondre à mes besoins spécifiques comme dans Excel**.

**Acceptance Criteria:**

**Given** je suis un utilisateur authentifié  
**When** je crée une formule personnalisée  
**Then** l'éditeur de formule avec champ de saisie texte est disponible  
**And** la syntaxe supporte les opérateurs (+, -, *, /, ^) et fonctions (SUM, AVG, MAX, MIN, COUNT, IF)  
**And** les références aux données fonctionnent (STOCK_ACTUEL, VENTES_7J, PRIX_ACHAT, etc.)  
**And** l'autocomplétion des variables et fonctions disponibles fonctionne  
**And** la validation syntaxe en temps réel fonctionne  
**And** les messages d'erreur clairs sont affichés si formule invalide  
**And** la prévisualisation du résultat avant sauvegarde fonctionne  
**And** les formules personnalisées sont sauvegardées par utilisateur  
**And** la bibliothèque de formules sauvegardées est accessible  
**And** les tests unitaires pour le parser et évaluateur de formules sont passants

### Story 3.10: Calculs Basiques Temps Stock (Sans IA)

As a **gérant de PME**,  
I want **voir une estimation basique du temps de stock disponible**,  
so that **je peux avoir une idée même sans IA encore calibrée**.

**Acceptance Criteria:**

**Given** je suis un utilisateur authentifié avec des stocks et des ventes  
**When** je consulte un produit  
**Then** le calcul de consommation moyenne basique fonctionne (moyenne ventes 30 derniers jours)  
**And** le calcul jours de stock restant fonctionne (stock_actuel / consommation_quotidienne_moyenne)  
**And** l'estimation temps stock par produit est affichée  
**And** un indicateur visuel s'affiche si estimation non fiable (pas assez de données)  
**And** un message clair indique que c'est une estimation basique qui s'améliorera avec IA

---

## Epic 4: Dashboard de Rush "Traffic Light"

Permettre aux utilisateurs d'accéder rapidement aux informations sur leurs stocks via un chat IA conversationnel, visualiser un dashboard avec vue d'ensemble, consulter des courbes de prévision, recevoir des alertes visuelles et voir des statistiques essentielles.

**FRs couverts:** FR2, FR14, FR15, FR16, FR33 + Exigences UX (Chat IA, mémoire contextuelle, visualisation interactive)

**Valeur utilisateur:** Interface simple et intuitive remplaçant Excel, avec accès conversationnel rapide via chat IA et visualisations claires pour une compréhension immédiate de l'état des stocks.

### Story 4.1: Chat IA Conversationnel avec Mémoire Contextuelle

As a **gérant de PME**,  
I want **accéder rapidement aux informations sur mes stocks via un chat IA conversationnel**,  
so that **je peux obtenir des réponses instantanées sans navigation complexe**.

**Acceptance Criteria:**

**Given** je suis un utilisateur authentifié  
**When** j'ouvre le chat IA  
**Then** l'interface chat est disponible sur toutes les plateformes (desktop, tablette, mobile)  
**And** je peux poser des questions sur mes stocks (ex: "combien d'ordinateurs de telle marque?")  
**And** le chat répond avec les informations demandées  
**And** le chat a une mémoire contextuelle (ex: après "leurs prix" se souvient de "ordinateurs de telle marque")  
**And** le chat peut communiquer avec le reste de l'application pour accéder aux informations sur les stocks  
**And** l'historique de conversation est sauvegardé  
**And** l'interface est simple et compréhensible sur mobile pour utilisation rapide

### Story 4.2: Dashboard Principal avec Vue d'Ensemble

As a **gérant de PME**,  
I want **voir un tableau de bord avec vue d'ensemble de mes stocks**,  
so that **je peux rapidement comprendre l'état de mon inventaire sans navigation complexe**.

**Acceptance Criteria:**

**Given** je suis un utilisateur authentifié  
**When** j'accède au dashboard  
**Then** la vue d'ensemble des stocks est affichée (liste/grid)  
**And** les quantités sont affichées avec distinction par couleurs (vert=OK, orange=attention, rouge=rupture)  
**And** les statistiques essentielles sont visibles (ventes veille, stock total, alertes)  
**And** les actions recommandées sont visibles (commandes à faire, stocks faibles)  
**And** le design est responsive (desktop + mobile)  
**And** le temps de chargement est < 2 secondes (NFR1)  
**And** les tests E2E pour le workflow dashboard sont passants

### Story 4.3: Visualisation Interactive des Courbes de Prévision

As a **gérant de PME**,  
I want **voir des courbes de prévision montrant quand mes stocks vont tomber**,  
so that **je peux comprendre visuellement les tendances et prévisions**.

**Acceptance Criteria:**

**Given** je suis un utilisateur authentifié avec des données de ventes  
**When** je consulte les courbes de prévision  
**Then** les courbes montrent quand les stocks vont tomber  
**And** les courbes montrent quand recommander une commande  
**And** le pourcentage de certitude est affiché à chaque fois (quand IA disponible)  
**And** je peux comparer des produits via bouton dédié  
**And** la visualisation est intuitive et interactive  
**And** les courbes sont affichées dans l'interface (dashboard, vue produit)

### Story 4.4: Alertes Visuelles

As a **gérant de PME**,  
I want **recevoir des alertes visuelles pour stocks faibles et ruptures**,  
so that **je peux réagir rapidement aux problèmes**.

**Acceptance Criteria:**

**Given** je suis un utilisateur authentifié  
**When** un stock devient faible  
**Then** une alerte visuelle claire est affichée (badges, couleurs, icônes)  
**And** les alertes pour ruptures imminentes sont affichées (prédiction IA quand disponible)  
**And** la liste des alertes est visible sur le dashboard  
**And** je peux filtrer par type d'alerte  
**And** je peux marquer une alerte comme "vue" ou "résolue"  
**And** les notifications optionnelles pour alertes critiques fonctionnent  
**And** le système d'alertes pour stocks faibles a un seuil configurable

### Story 4.5: Statistiques Essentielles

As a **gérant de PME**,  
I want **voir des statistiques de mes ventes et stocks**,  
so that **je peux comprendre mes tendances basiques**.

**Acceptance Criteria:**

**Given** je suis un utilisateur authentifié  
**When** je consulte les statistiques  
**Then** les ventes de la veille sont affichées  
**And** un graphique des ventes sur période (7 jours, 30 jours) est disponible  
**And** le stock actuel total est affiché (valeur, quantité)  
**And** le top produits vendus est affiché (selon niveau abonnement)  
**And** l'interface statistiques est simple et claire  
**And** l'export des données en CSV fonctionne (selon niveau abonnement)

---

## Epic 5: Scan-to-Recipe (IA Vision/NLP)

Permettre de générer des fiches techniques à partir d'une photo de menu ou de carte (IA vision + NLP), avec validation humaine et feedback loop ; cible ≥90 % de reconnaissance des ingrédients.

**FRs couverts:** FR35

### Story 5.1: Upload photo menu/carte et extraction IA (vision + NLP)

As a **chef ou gérant**,
I want **prendre en photo un menu ou une carte et obtenir une proposition de fiche technique**,
so that **je gagne du temps sur la création des fiches et réduis les oublis d'ingrédients**.

**Acceptance Criteria:**

**Given** je suis authentifié (niveau incluant Scan-to-Recipe)  
**When** j'upload une photo de menu ou de carte (format image accepté)  
**Then** le système envoie l'image au service IA (vision + NLP)  
**And** une liste d'items reconnus (plats, boissons) avec ingrédients proposés est retournée  
**And** chaque item affiche un niveau de confiance (ex. pourcentage)  
**And** je peux corriger ou compléter les ingrédients avant validation  
**And** les erreurs courantes (OCR, langue) sont documentées et si possible limitées par heuristiques

### Story 5.2: Validation humaine et enregistrement fiche technique

As a **chef**,
I want **valider ou modifier la fiche technique proposée puis l'enregistrer**,
so that **mes fiches sont exactes et reliées à mon catalogue**.

**Acceptance Criteria:**

**Given** une proposition de fiche technique (Story 5.1)  
**When** je valide ou modifie les champs (nom plat, ingrédients, quantités, unités)  
**Then** la fiche technique est enregistrée et reliée au produit/catalogue du tenant  
**And** je peux associer la fiche à un produit existant ou en créer un nouveau  
**And** l'historique des versions (optionnel) est tracé pour audit  
**And** après enregistrement, la fiche est utilisable pour les calculs de décrementation (moteur hybride)

### Story 5.3: Feedback loop et amélioration du modèle

As a **système**,
I want **collecter les corrections utilisateur sur les fiches générées**,
so that **le modèle IA s'améliore (reconnaissance ingrédients ≥90 %)**.

**Acceptance Criteria:**

**Given** un utilisateur a modifié une fiche technique générée par l'IA  
**When** les différences (ajouts/suppressions/corrections) sont enregistrées de façon anonymisée et agrégée  
**Then** ces données alimentent un pipeline de réentraînement ou fine-tuning (batch)  
**And** les métriques de reconnaissance (précision, rappel par catégorie) sont suivies  
**And** la cible ≥90 % de reconnaissance des ingrédients est mesurée et documentée

---

## Epic 6: Moteur IA Prédictif & Commandes de Clôture

Permettre les prédictions de rupture (>90 % après 2 semaines), les recommandations de commande avec explications, la validation en 1 clic, les commandes prédictives de clôture (panier fin de service) et la génération de commandes depuis le chat IA.

**FRs couverts:** FR4, FR5, FR6, FR7, FR8, FR9, FR20, FR34, FR37

**Valeur utilisateur:** Différenciation principale du produit avec prédictions IA précises pour anticiper les ruptures et optimiser les stocks, cœur de la valeur du produit.

### Story 6.1: Infrastructure ML & Modèles de Base

As a **système**,  
I want **une infrastructure ML opérationnelle avec modèles de base**,  
so that **l'IA peut fonctionner même sans données historiques (cold start)**.

**Acceptance Criteria:**

**Given** l'infrastructure de base est configurée  
**When** je configure l'infrastructure ML  
**Then** l'infrastructure ML est configurée (Python, TensorFlow/PyTorch, MLflow)  
**And** les modèles de base pré-entraînés sur données agrégées anonymisées sont disponibles  
**And** le pipeline d'entraînement est configuré  
**And** le système de déploiement modèles fonctionne (versioning, rollback)  
**And** le monitoring infrastructure ML fonctionne (ressources, latence)  
**And** la documentation architecture ML est créée

### Story 6.2: Analyse Tendances & Apprentissage Progressif

As a **système**,  
I want **analyser les tendances de consommation à partir des données de ventes**,  
so that **je peux comprendre les patterns et améliorer les prédictions**.

**Acceptance Criteria:**

**Given** des données de ventes sont disponibles  
**When** le système analyse les tendances  
**Then** l'algorithme d'analyse tendances fonctionne (saisonnalité, tendances linéaires, patterns)  
**And** l'apprentissage progressif à partir des ventes quotidiennes fonctionne  
**And** l'adaptation modèle par entreprise (fine-tuning) fonctionne  
**And** la gestion cold start fonctionne (fonctionnement avec minimum de données)  
**And** l'amélioration précision au fil du temps fonctionne  
**And** les logs apprentissage pour debugging sont disponibles

### Story 6.3: Prédiction Ruptures Stocks

As a **gérant de PME Premium/Premium Plus**,  
I want **recevoir des prédictions de rupture de stocks**,  
so that **je peux anticiper les problèmes et commander à temps**.

**Acceptance Criteria:**

**Given** je suis un utilisateur Premium/Premium Plus avec des données de ventes  
**When** je demande une prédiction de rupture  
**Then** l'algorithme prédiction rupture fonctionne (basé sur tendances et stock actuel)  
**And** la prédiction date de rupture estimée est générée  
**And** le niveau de confiance est affiché avec prédiction  
**And** les prédictions sont générées en < 5 secondes (NFR2)  
**And** les prédictions sont affichées dans l'interface (dashboard, vue produit)  
**And** un indicateur visuel s'affiche si prédiction non fiable (pas assez de données)  
**And** les tests validation précision prédictions sont passants

### Story 6.4: Réentraînement Automatique Quotidien

As a **système**,  
I want **réentraîner automatiquement les modèles IA quotidiennement**,  
so that **les prédictions s'améliorent continuellement avec les nouvelles données**.

**Acceptance Criteria:**

**Given** l'infrastructure ML est opérationnelle  
**When** le job automatique quotidien s'exécute  
**Then** le réentraînement incrémental fonctionne (optimisation coûts)  
**And** la validation nouveau modèle avant déploiement fonctionne (tests précision)  
**And** le rollback automatique fonctionne si nouveau modèle moins performant  
**And** les logs réentraînement sont disponibles (durée, performance, coûts)  
**And** le monitoring coûts infrastructure ML fonctionne  
**And** le batch processing pour optimiser ressources fonctionne

### Story 6.5: Monitoring Performance IA

As a **administrateur**,  
I want **monitorer la performance de l'IA**,  
so that **je peux garantir la qualité des prédictions et détecter les problèmes**.

**Acceptance Criteria:**

**Given** je suis un administrateur  
**When** je consulte le monitoring performance IA  
**Then** le dashboard monitoring affiche précision globale et taux d'erreur  
**And** la comparaison prédictions vs réalité (ground truth) fonctionne  
**And** le calcul précision réelle par entreprise fonctionne  
**And** les alertes s'affichent si précision < seuil (ex: < 70%)  
**And** les métriques par produit sont disponibles (quels produits bien prédits, lesquels moins)  
**And** l'historique performance dans le temps est disponible  
**And** les rapports performance pour équipe technique sont générés

---

### Suite Epic 6 — Commandes intelligentes & clôture

**FRs couverts (suite):** FR7, FR8, FR9, FR34, FR37

### Story 6.6: Génération Recommandations Commande

As a **gérant de PME Premium/Premium Plus**,  
I want **recevoir des recommandations de commande avec explications**,  
so that **je comprends pourquoi commander et je peux prendre des décisions éclairées**.

**Acceptance Criteria:**

**Given** je suis un utilisateur Premium/Premium Plus avec prédictions IA disponibles  
**When** le système génère des recommandations  
**Then** l'algorithme génération recommandations fonctionne (basé sur prédictions IA)  
**And** le calcul quantités recommandées fonctionne (basé sur stock actuel, consommation, délai livraison)  
**And** le rapport explicatif pour chaque recommandation est généré (tendance, stock actuel, prévision rupture, raison)  
**And** les recommandations sont affichées dans interface dédiée  
**And** le tri recommandations par priorité fonctionne (rupture imminente, stock faible, etc.)  
**And** les filtres recommandations fonctionnent (produit, fournisseur, urgence)  
**And** les explications détaillées incluent cause/explication rupture, prix, quantité, fournisseur, date estimée arrivée, pourcentage fiabilité

### Story 6.7: Validation Commande en Un Clic

As a **gérant de PME Premium/Premium Plus**,  
I want **valider une commande recommandée en un clic**,  
so that **je peux commander rapidement sans ressaisir les informations**.

**Acceptance Criteria:**

**Given** je suis un utilisateur Premium/Premium Plus avec recommandations disponibles  
**When** je clique sur "Commander"  
**Then** le bouton "Commander" est disponible sur chaque recommandation  
**And** la création automatique commande depuis recommandation fonctionne  
**And** la commande est pré-remplie (produits, quantités, fournisseur)  
**And** je peux modifier avant validation finale  
**And** la confirmation commande créée est affichée  
**And** la commande est enregistrée en base de données  
**And** l'historique commandes est disponible

### Story 6.8: Gestion Autonomie IA (Limites par Défaut)

As a **système**,  
I want **appliquer des limites de décision par défaut pour l'IA**,  
so that **les commandes automatiques sont contrôlées et sécurisées**.

**Acceptance Criteria:**

**Given** le système de recommandations est opérationnel  
**When** une recommandation est générée  
**Then** la configuration limites par défaut est appliquée (seuil confiance, montant maximum, etc.)  
**And** le mode "autorisation requise" est actif par défaut (toutes commandes nécessitent validation humaine)  
**And** la vérification limites avant génération recommandation fonctionne  
**And** le blocage recommandation si dépasse limites fonctionne  
**And** un message explicatif s'affiche si recommandation bloquée  
**And** les logs toutes les décisions IA sont enregistrés (recommandations générées, bloquées, validées)

### Story 6.9: Progression Autonomie Graduelle (Premium Plus)

As a **gérant de PME Premium Plus**,  
I want **activer les commandes automatiques après calibration IA**,  
so that **je peux automatiser complètement mes commandes une fois que j'ai confiance**.

**Acceptance Criteria:**

**Given** je suis un utilisateur Premium Plus  
**When** le système de calibration IA est prêt  
**Then** le système de calibration IA fonctionne (suivi précision sur période, ex: 3 mois)  
**And** l'indicateur niveau de confiance IA s'affiche (prêt pour automatisation ou non)  
**And** l'activation commandes automatiques fonctionne si précision > seuil (ex: 85%) et période calibration complète  
**And** le mode automatique fonctionne : commandes passées automatiquement si dans limites  
**And** les notifications commandes automatiques passées fonctionnent  
**And** je peux désactiver automatisation à tout moment  
**And** les logs détaillés commandes automatiques sont disponibles

### Story 6.10: Intégration Chat IA avec Génération Commandes

As a **gérant de PME Premium/Premium Plus**,  
I want **générer des recommandations de commande directement depuis le chat IA**,  
so that **je peux commander rapidement depuis la conversation quand l'IA détecte une rupture**.

**Acceptance Criteria:**

**Given** je suis un utilisateur Premium/Premium Plus avec chat IA et prédictions IA disponibles  
**When** le chat IA détecte une rupture de stock imminente dans la conversation  
**Then** le chat propose une recommandation de commande avec explications détaillées (cause rupture, prix, quantité, fournisseur, date estimée arrivée, pourcentage fiabilité)  
**And** je peux valider la commande directement depuis le chat en un clic  
**And** la commande est créée automatiquement depuis la recommandation du chat  
**And** je peux modifier la commande avant validation finale depuis le chat  
**And** la confirmation de commande créée est affichée dans le chat  
**And** l'historique de conversation inclut les commandes générées  
**And** le workflow est fluide et transparent avec toutes les informations visibles

---

## Epic 7: Photo Facture IA & Intégration Automatique

Permettre aux utilisateurs Premium Plus d'uploader des photos de factures, extraire automatiquement les informations via IA, vérifier contre les commandes, et intégrer automatiquement en base de données sans saisie manuelle.

**FRs couverts:** FR10, FR11, FR12, FR13, FR26 + Exigences UX (workflow photo facture fluide)

**Valeur utilisateur:** Élimination complète de la saisie manuelle chronophage avec extraction IA fiable et workflow fluide contrôlé par l'utilisateur, bouclant le cycle Prédiction → Commande → Réception → Intégration.

### Story 7.1: Upload Photo Facture

As a **gérant de PME Premium Plus**,  
I want **uploader une photo de facture**,  
so that **le système peut extraire automatiquement les informations**.

**Acceptance Criteria:**

**Given** je suis un utilisateur Premium Plus  
**When** j'upload une photo de facture  
**Then** l'interface permet l'upload photo (drag & drop ou sélection fichier)  
**And** les formats image sont supportés (JPG, PNG, PDF)  
**And** la validation taille fichier fonctionne (max 10MB)  
**And** la prévisualisation photo uploadée s'affiche  
**And** je peux associer la facture à une commande (sélection commande correspondante)  
**And** la gestion erreurs upload fonctionne (fichier invalide, trop volumineux)

### Story 7.2: Extraction IA Facture (OCR)

As a **système**,  
I want **extraire automatiquement les informations d'une facture via IA**,  
so that **les données sont capturées sans saisie manuelle**.

**Acceptance Criteria:**

**Given** une photo de facture est uploadée  
**When** le système extrait les informations  
**Then** l'intégration service OCR/IA fonctionne (ex: Google Vision API, AWS Textract, ou modèle custom)  
**And** l'extraction fonctionne : quantités, prix, produits, date, fournisseur, total  
**And** le mapping produits extraits → produits système fonctionne (reconnaissance nom/SKU)  
**And** la gestion cas ambiguïtés fonctionne (produit non reconnu, prix manquant)  
**And** le niveau de confiance extraction est affiché  
**And** la prévisualisation données extraites avant validation s'affiche  
**And** les tests avec différents formats factures sont passants

### Story 7.3: Vérification Automatique Commande vs Facture

As a **système**,  
I want **vérifier automatiquement que la facture correspond à la commande**,  
so that **je peux détecter les erreurs avant intégration**.

**Acceptance Criteria:**

**Given** une facture est extraite et associée à une commande  
**When** le système vérifie la correspondance  
**Then** la comparaison quantités facture vs commande initiale fonctionne  
**And** la comparaison prix facture vs prix commande fonctionne (tolérance configurable, ex: 5%)  
**And** la vérification produits facture vs produits commande fonctionne  
**And** la détection différences fonctionne (quantités, prix, produits manquants/supplémentaires)  
**And** les alertes visuelles pour différences détectées s'affichent  
**And** le rapport différences avec détails est généré  
**And** je peux valider manuellement si différences

### Story 7.4: Intégration Automatique BDD

As a **gérant de PME Premium Plus**,  
I want **que les données de facture soient intégrées automatiquement**,  
so that **mes stocks sont mis à jour sans saisie manuelle**.

**Acceptance Criteria:**

**Given** une facture est validée  
**When** l'intégration automatique s'exécute  
**Then** la mise à jour automatique stocks avec quantités facture fonctionne (après validation)  
**And** l'enregistrement entrée stock dans historique fonctionne  
**And** la mise à jour prix d'achat si différent fonctionne  
**And** l'association facture → commande fonctionne (lien traçabilité)  
**And** la confirmation intégration réussie s'affiche  
**And** la gestion erreurs intégration fonctionne (rollback si échec)  
**And** les logs toutes intégrations automatiques sont disponibles

### Story 7.5: Fallback Saisie Manuelle Facture

As a **gérant de PME Premium Plus**,  
I want **pouvoir saisir manuellement les données de facture si l'extraction IA échoue**,  
so that **je ne suis pas bloqué si la photo est illisible**.

**Acceptance Criteria:**

**Given** l'extraction IA a échoué ou confiance < seuil  
**When** je choisis saisie manuelle  
**Then** l'option "Saisie manuelle" est disponible  
**And** le formulaire saisie manuelle avec mêmes champs fonctionne (quantités, prix, produits)  
**And** la validation données saisie manuelle fonctionne  
**And** l'intégration BDD identique fonctionne (même workflow que extraction IA)  
**And** je peux choisir saisie manuelle même si extraction réussie  
**And** un message clair explique pourquoi extraction a échoué (si applicable)  
**And** le workflow photo facture est fluide : récapitulatif après chaque photo, possibilité modifier si erreur détectée, ne s'ajoute pas automatiquement (demande autorisation), plusieurs photos possibles mais pas de répétition d'articles

---

## Epic 8: Anti-Coulage & Déclaration de perte

Permettre la déclaration de perte express (2 clics), l'analyse des écarts théorique/réel et les alertes sur anomalies (bars/clubs).

**FRs couverts:** FR38

### Story 8.1: Déclaration de perte express (2 clics)

As a **restaurateur ou barman**,
I want **déclarer une perte (coulage, casse, erreur) en très peu de clics**,
so that **je garde une traçabilité sans perdre de temps en rush**.

**Acceptance Criteria:**

**Given** je suis authentifié et un produit a une perte à déclarer  
**When** j'ouvre l'écran (ou le widget) de déclaration de perte  
**Then** je peux sélectionner le produit (autocomplete ou liste courte) en 1 clic  
**And** je peux saisir la quantité perdue (et optionnellement la raison : coulage, casse, autre) en 1 clic ou 2  
**And** la perte est enregistrée et le stock est mis à jour immédiatement  
**And** un mouvement "perte" est visible dans l'historique (FR18)  
**And** le flux est utilisable sur mobile/tablette (cibles tactiles ≥ 44 px, NFR/UX)

### Story 8.2: Analyse des écarts théorique vs réel et alertes anomalies

As a **gérant ou responsable bar**,
I want **voir les écarts entre stock théorique (calculé) et stock réel (inventaire / pertes)**,
so that **je détecte les anomalies (vol, erreurs répétées) et peux agir**.

**Acceptance Criteria:**

**Given** des mouvements (ventes POS, pertes déclarées, réceptions) sont enregistrés  
**When** le système calcule le stock théorique (entrées − sorties − pertes)  
**Then** une vue ou rapport "écarts théorique / réel" est disponible (par produit ou global)  
**And** les alertes sont déclenchées lorsque l'écart dépasse un seuil configurable (ex. % ou valeur)  
**And** les alertes sont visibles sur le Dashboard (badge ou section dédiée) et optionnellement par notification  
**And** l'historique des écarts et alertes est consultable pour audit

---

## (Post-MVP) Épics optionnels

Les épics suivants (ex. Professionalisation UI/UX Tailwind, Migration Next.js) restent dans le backlog pour une phase post–Rush Edition. Les exigences UX (front-end-spec) et NFR restent référencées dans l'inventaire et la FR Coverage Map.
