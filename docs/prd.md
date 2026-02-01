# SaaS Gestion de Stocks IA pour PME Product Requirements Document (PRD)

---

## Goals and Background Context

### Goals

- **Gain de temps et clarté pour PME** - Réduire de 70% le temps passé sur gestion de stocks vs Excel, interface visuelle claire remplaçant les lignes de fichier
- **Prédictions IA précises** - Atteindre >85% de précision dans les prédictions de rupture de stocks après 3 mois d'apprentissage
- **Optimisation cash flow** - Réduire de 30% le cash dormant dans les entrepôts grâce à meilleures prévisions
- **Réduction ruptures** - Diminuer de 60% les ruptures de stocks grâce aux prévisions IA
- **Adoption PME** - Atteindre 50 PME utilisatrices actives dans les 6 mois post-lancement avec 80% de rétention après 3 mois
- **Boucle valeur complète** - Automatiser le cycle Prédiction → Commande → Réception → Intégration sans saisie manuelle
- **Satisfaction utilisateurs** - Score NPS minimum de 50, 90% utilisateurs trouvent interface plus claire que Excel

### Background Context

Les PME et e-commerces gèrent actuellement leurs stocks via Excel ou des outils manuels peu performants, générant ruptures de stocks, surstockage (cash dormant), manque de prévisions précises, et synchronisation difficile multi-plateformes. Les solutions existantes sont trop chères (réservées aux grandes entreprises), complexes, et manquent de précision dans leurs prédictions.

Ce PRD définit le MVP d'un SaaS avec intelligence artificielle prédictive, conçu spécifiquement pour les PME (cafés, petits stores, petites entreprises) et e-commerces, offrant des prévisions précises de rupture de stocks, une interface visuelle simple, et des fonctionnalités d'automatisation pour remplacer les solutions manuelles. L'IA est le cœur différenciant du produit - sans elle, le produit n'a plus d'innovation vs Excel. Le MVP se concentre sur les 3 priorités critiques : (1) Moteur IA de prédictions, (2) Interface visuelle simple, (3) Système de commandes + photo facture IA.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2024-12-19 | 1.0 | Initial PRD creation from Project Brief | PM Agent |
| 2024-12-19 | 1.1 | Analysis and corrections applied: Added missing requirements (FR21-FR32), simplified MVP scope (FR16, FR17, FR8, NFR15), added subscription tiers structure, added customizable calculations feature | PM Agent |
| 2024-12-19 | 1.2 | Epic details completed: Added full epic breakdown with 7 epics, 35 stories total, detailed acceptance criteria for each story, logical sequencing ensured | PM Agent |
| 2026-01-28 | 1.3 | Implementation readiness corrections: Added FR33 (Chat IA conversationnel) and FR34 (Génération commandes depuis chat) to cover UX requirements | PM Agent |

---

## Requirements

### Functional

FR1: Le système doit permettre aux utilisateurs de créer, lire, mettre à jour et supprimer des stocks avec quantités, emplacements, et informations produits de base.

FR2: Le système doit afficher une vision globale des stocks en temps réel dans un tableau de bord centralisé avec distinction visuelle par couleurs pour faciliter la lecture rapide.

FR3: Le système doit calculer et afficher des estimations de temps de stock disponible pour chaque produit. Pour MVP, ces estimations peuvent être basiques (calcul simple consommation moyenne) et s'améliorer avec l'IA une fois disponible.

FR4: Le moteur IA doit analyser les données historiques de ventes (si disponibles) pour comprendre les tendances et patterns de consommation par produit.

FR5: Le moteur IA doit apprendre progressivement à partir des ventes quotidiennes même en l'absence de données historiques initiales, avec amélioration continue de la précision au fil du temps.

FR6: Le moteur IA doit prédire les ruptures de stocks avec une précision cible de 85% après 3 mois d'apprentissage par entreprise. Le système doit afficher le niveau de confiance actuel des prédictions.

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

FR23: Le système doit permettre l'intégration basique avec terminaux de paiement pour capture automatique des ventes (scope MVP limité aux intégrations principales).

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

### Non Functional

NFR1: Le système doit répondre aux requêtes de visualisation de stocks en moins de 2 secondes pour garantir une expérience utilisateur fluide.

NFR2: Le système doit générer les prédictions IA en moins de 5 secondes pour maintenir l'engagement utilisateur.

NFR3: Le système doit supporter un minimum de 100 utilisateurs simultanés sans dégradation de performance.

NFR4: Le système doit garantir une disponibilité de 99% (uptime) pour MVP, avec plan d'amélioration vers 99.5% en V2 pour assurer l'accès continu aux données critiques de stocks.

NFR5: Toutes les données de stocks doivent être chiffrées en transit (HTTPS) et au repos (encryption at rest) pour conformité sécurité.

NFR6: Le système doit être conforme RGPD avec gestion du consentement, droit à l'effacement, et portabilité des données.

NFR7: Le système doit maintenir des logs d'audit pour toutes les actions critiques (modifications stocks, commandes, accès données) pour traçabilité et sécurité.

NFR8: Le système doit effectuer des backups automatiques quotidiens des données avec possibilité de restauration point-in-time.

NFR9: Le système doit être accessible via navigateurs web modernes (Chrome, Firefox, Safari, Edge - dernières 2 versions) et responsive pour mobile (iOS 14+, Android 10+).

NFR10: Le système doit supporter une architecture multi-tenant pour isoler les données de chaque entreprise cliente.

NFR11: Le système doit être scalable horizontalement pour supporter la croissance du nombre de clients sans refonte majeure.

NFR12: Le moteur IA doit être capable de fonctionner avec un minimum de données (cold start) en utilisant des modèles de base et apprentissage progressif.

NFR13: Le système doit garantir la précision minimale de 85% des prédictions IA après 3 mois d'apprentissage par entreprise.

NFR14: Le système doit gérer les erreurs gracieusement avec messages d'erreur clairs et possibilité de récupération sans perte de données.

NFR15: Le système doit fournir un monitoring basique de la performance IA (précision globale, taux d'erreur) pour MVP. Les métriques détaillées (rappel, F1-score, analyses avancées) sont reportées en V2.

NFR16: Le système doit garantir une isolation stricte des données et modèles IA par tenant (multi-tenancy) pour éviter toute fuite de données entre clients.

NFR17: Le système doit fournir un mécanisme de rollback des modèles IA en cas de dérive de performance, avec alertes automatiques sur la qualité des prédictions.

NFR18: Le système doit maintenir un système de validation des prédictions IA en comparant les prédictions avec la réalité (ground truth) pour calculer la précision réelle et améliorer les modèles.

NFR19: Le système doit gérer les erreurs spécifiques à l'IA (fausses prédictions, modèles défaillants) avec mécanismes de correction manuelle et communication transparente aux utilisateurs.

---

## User Interface Design Goals

### Overall UX Vision

L'interface doit être **extrêmement simple et intuitive** pour des utilisateurs PME non-techniques. L'objectif est de remplacer Excel par une expérience visuelle moderne où les informations critiques sont immédiatement visibles sans navigation complexe. L'interface doit prioriser la **clarté visuelle** avec distinction par couleurs, graphiques faciles à comprendre, et accès rapide aux actions principales. Le design doit communiquer la **confiance et la simplicité** - les utilisateurs doivent se sentir en contrôle et comprendre immédiatement l'état de leurs stocks et les recommandations de l'IA.

### Key Interaction Paradigms

- **Dashboard-first approach** - Toutes les informations critiques visibles dès la connexion, pas de navigation profonde nécessaire
- **Action rapide** - Les actions les plus fréquentes (voir stocks, voir prévisions, voir statistiques) accessibles en <2 clics
- **Visual feedback** - Couleurs distinctes pour états (vert=OK, orange=attention, rouge=rupture), alertes visuelles claires
- **Progressive disclosure** - Détails disponibles sur demande, mais vue d'ensemble toujours visible
- **Confiance IA** - Transparence sur les prédictions (rapports explicatifs, niveaux de confiance visibles)
- **Mobile-friendly** - Interface responsive permettant consultation rapide sur mobile même si usage principal desktop

### Core Screens and Views

1. **Dashboard Principal** - Vue d'ensemble stocks, alertes, statistiques vente veille, actions recommandées
2. **Vue Stocks Détaillée** - Liste/grid des stocks avec quantités, emplacements, courbes de prévision, statuts
3. **Prédictions IA** - Écran dédié aux prévisions de rupture avec rapports explicatifs, courbes temporelles (Premium/Premium Plus)
4. **Commandes Intelligentes** - Liste des recommandations de commande avec rapports, validation en un clic (Premium/Premium Plus)
5. **Réception Factures** - Interface upload photo facture, extraction IA, vérification, confirmation intégration (Premium Plus uniquement)
6. **Statistiques et Analyses** - Graphiques ventes, tendances basiques (tous niveaux), analyses avancées (Premium/Premium Plus)
7. **Calculs Personnalisables** - Interface pour créer formules prédéfinies et personnalisées, champ de saisie manuelle fonctions mathématiques
8. **Gestion Abonnements** - Interface pour voir niveau actuel, fonctionnalités disponibles, upgrade/downgrade
9. **Authentification/Onboarding** - Login, création compte, configuration initiale (import stocks, saisie fournisseurs)

### Accessibility: WCAG AA

Le système doit respecter les standards WCAG AA pour accessibilité :
- Contraste couleurs suffisant pour textes et éléments visuels
- Navigation au clavier fonctionnelle
- Labels et descriptions pour lecteurs d'écran
- Messages d'erreur clairs et actionnables

### Branding

**Style visuel:** Moderne, professionnel, mais accessible. Palette de couleurs avec distinction claire pour les états (vert/orange/rouge pour stocks). Design épuré sans surcharge visuelle. Typographie lisible et hiérarchie claire. Pas de branding spécifique imposé pour MVP - focus sur fonctionnalité et clarté.

### Target Device and Platforms: Web Responsive

Application web responsive fonctionnant sur desktop (usage principal) et mobile (consultation rapide). Optimisée pour desktop mais utilisable sur mobile pour actions simples (vérification stocks, alertes, validation commandes).

---

## Structure d'Abonnement et Fonctionnalités par Niveau

### Niveau Normal (Abonnement de base)

**Fonctionnalités incluses:**
- Gestion stocks de base (CRUD)
- Tableau de bord visuel avec vue globale stocks
- Statistiques basiques (ventes veille, stock actuel)
- Alertes visuelles stocks faibles
- Calculs personnalisables (formules prédéfinies + saisie manuelle)
- Historique stocks (30 jours)
- Saisie manuelle ventes
- Import CSV stocks et ventes
- Gestion fournisseurs basique
- Saisie manuelle factures (pas d'extraction IA)

**Prix estimé:** 100€/mois

### Niveau Premium

**Fonctionnalités incluses (en plus de Normal):**
- Moteur IA de prédictions (prédiction ruptures)
- Recommandations de commande intelligentes avec rapports explicatifs
- Courbes de prévision avancées
- Statistiques et analyses avancées
- Historique stocks étendu (90 jours)
- Intégration terminaux de paiement (capture automatique ventes)
- Commandes avec validation en un clic (mode autorisation)
- Monitoring performance IA basique

**Prix estimé:** 150€/mois

### Niveau Premium Plus

**Fonctionnalités incluses (en plus de Premium):**
- Photo facture IA (extraction automatique, vérification, intégration)
- Commandes automatiques (après calibration IA)
- Configuration avancée limites IA
- Métriques IA détaillées (précision, rappel, F1-score)
- Historique complet illimité
- Support prioritaire
- API accès (pour intégrations futures)
- Toutes les fonctionnalités futures en priorité

**Prix estimé:** 200€/mois

### Matrice Fonctionnalités par Niveau

| Fonctionnalité | Normal | Premium | Premium Plus |
|----------------|--------|---------|--------------|
| Gestion stocks CRUD | ✅ | ✅ | ✅ |
| Tableau de bord visuel | ✅ | ✅ | ✅ |
| Statistiques basiques | ✅ | ✅ | ✅ |
| Calculs personnalisables | ✅ | ✅ | ✅ |
| Prédictions IA | ❌ | ✅ | ✅ |
| Commandes intelligentes | ❌ | ✅ | ✅ |
| Photo facture IA | ❌ | ❌ | ✅ |
| Commandes automatiques | ❌ | ❌ | ✅ |
| Intégration terminaux paiement | ❌ | ✅ | ✅ |
| Historique étendu | ❌ | ✅ | ✅ |
| API accès | ❌ | ❌ | ✅ |

---

## Calculs Personnalisables - Détails

### Formules Prédéfinies Disponibles

Le système fournira des formules prédéfinies communes que les utilisateurs peuvent utiliser directement :

1. **Consommation moyenne** - `MOYENNE(ventes_30_jours)`
2. **Stock de sécurité** - `CONSOMMATION_MOYENNE * DELAI_LIVRAISON * 1.5`
3. **Point de commande** - `STOCK_SECURITE + (CONSOMMATION_MOYENNE * DELAI_LIVRAISON)`
4. **Taux de rotation** - `VENTES_PERIODE / STOCK_MOYEN`
5. **Jours de stock restant** - `STOCK_ACTUEL / CONSOMMATION_QUOTIDIENNE`
6. **Coût stock moyen** - `SOMME(quantite * prix_achat) / SOMME(quantite)`
7. **Valeur stock** - `SOMME(quantite * prix_achat)`
8. **Marge bénéficiaire** - `(prix_vente - prix_achat) / prix_vente * 100`

### Saisie Manuelle de Formules

Les utilisateurs peuvent créer leurs propres formules via un champ de saisie similaire à Excel :

**Syntaxe supportée:**
- Opérateurs mathématiques : `+`, `-`, `*`, `/`, `^` (puissance)
- Fonctions mathématiques : `SUM()`, `AVG()`, `MAX()`, `MIN()`, `COUNT()`
- Références aux données : `STOCK_ACTUEL`, `VENTES_7J`, `PRIX_ACHAT`, etc.
- Conditions : `IF(condition, valeur_si_vrai, valeur_si_faux)`
- Dates : `DATE()`, `TODAY()`, `DAYS_BETWEEN()`

**Exemples de formules personnalisées:**
- `IF(STOCK_ACTUEL < STOCK_SECURITE, "COMMANDER", "OK")`
- `(VENTES_30J / 30) * DELAI_LIVRAISON * 1.2`
- `STOCK_ACTUEL * PRIX_ACHAT * 0.15` (coût immobilisation)

**Validation et erreurs:**
- Validation syntaxe en temps réel
- Messages d'erreur clairs (ex: "Fonction INEXISTANTE non reconnue")
- Suggestions de correction
- Test de la formule avant sauvegarde

**Interface utilisateur:**
- Éditeur de formule avec autocomplétion
- Liste des variables disponibles (aide contextuelle)
- Prévisualisation du résultat
- Bibliothèque de formules sauvegardées par utilisateur

---

## Technical Assumptions

### Repository Structure: Monorepo

Structure monorepo recommandée pour faciliter le partage de code entre frontend, backend, et services IA, tout en maintenant une séparation claire des responsabilités. Permet également une meilleure gestion des dépendances partagées et un déploiement coordonné.

### Service Architecture: Microservices modulaire

Architecture microservices modulaire avec services séparés pour :
- **API Gateway** - Point d'entrée unique, authentification, routage
- **Service Stocks** - Gestion CRUD stocks, historique, métadonnées
- **Service IA/ML** - Moteur de prédictions, entraînement, réentraînement quotidien
- **Service Commandes** - Gestion commandes, recommandations, validation
- **Service Factures** - Extraction IA factures, OCR, vérification
- **Service Analytics** - Statistiques, rapports, métriques

Cette architecture permet scalabilité indépendante (service IA peut scaler séparément), isolation des données, et évolutivité future. Communication via APIs RESTful avec possibilité d'ajout de message queue pour tâches asynchrones (entraînement IA).

### Testing Requirements: Unit + Integration + E2E

**Pyramide de tests complète:**
- **Unit tests** - Couverture minimale 80% pour logique métier critique (calculs stocks, prédictions IA)
- **Integration tests** - Tests APIs, intégrations services, base de données
- **E2E tests** - Scénarios utilisateurs critiques (workflow complet: prédiction → commande → réception)
- **Tests IA** - Validation précision modèles, tests regression sur prédictions
- **Tests performance** - Validation temps de réponse, charge, scalabilité

Tests automatisés dans CI/CD avec exécution sur chaque commit. Tests manuels pour UX/UI et validation utilisateur.

### Additional Technical Assumptions and Requests

- **Base de données:** PostgreSQL pour données relationnelles (stocks, commandes, utilisateurs) + base de données time-series (InfluxDB ou TimescaleDB) pour données de ventes historiques et métriques IA
- **Frontend:** Framework moderne (React ou Vue.js) avec state management (Redux/Vuex), design system avec composants réutilisables
- **Backend:** Node.js/Python selon expertise équipe, APIs RESTful avec OpenAPI/Swagger documentation
- **IA/ML:** Python avec frameworks (TensorFlow/PyTorch), infrastructure ML (MLflow pour tracking, Kubernetes pour déploiement modèles)
- **Infrastructure:** Cloud (AWS/GCP/Azure) avec containers (Docker/Kubernetes), CI/CD (GitHub Actions/GitLab CI)
- **Monitoring:** Logging centralisé (ELK stack ou équivalent), monitoring performance (Prometheus/Grafana), alerting
- **Sécurité:** OAuth2/JWT pour authentification, chiffrement données sensibles, WAF, rate limiting
- **Multi-tenancy:** Isolation données par client (schema par tenant ou row-level security selon scale)
- **Cold start IA:** Modèles pré-entraînés sur données agrégées anonymisées + fine-tuning par client
- **Réentraînement IA:** Pipeline automatisé quotidien avec validation avant déploiement nouveau modèle

---

## Epic List

**Epic 1: Foundation & Infrastructure**  
Établir l'infrastructure de base du projet, l'authentification, la gestion utilisateurs, et la configuration initiale permettant le déploiement d'une première version fonctionnelle.

**Epic 2: Gestion Stocks de Base**  
Créer les fonctionnalités CRUD de base pour la gestion des stocks (création, lecture, mise à jour, suppression) avec suivi des quantités et historique des mouvements.

**Epic 3: Moteur IA de Prédictions**  
Développer le moteur d'intelligence artificielle pour l'analyse des tendances, l'apprentissage progressif, et la prédiction des ruptures de stocks avec précision minimale 85%.

**Epic 4: Interface Visuelle & Tableau de Bord**  
Créer l'interface utilisateur visuelle avec tableau de bord centralisé, courbes de prévision, alertes visuelles, et statistiques pour remplacer l'expérience Excel.

**Epic 5: Système de Commandes Intelligentes**  
Implémenter le système de recommandations de commande avec rapports explicatifs, validation en un clic, et gestion de l'autonomie graduelle de l'IA.

**Epic 6: Photo Facture IA & Intégration Automatique**  
Développer la fonctionnalité d'extraction IA depuis photos de factures, vérification automatique, et intégration automatique en base de données sans saisie manuelle.

---

## Epic Details

### Epic 1: Foundation & Infrastructure

**Goal étendu:**  
Établir les fondations techniques du projet en créant l'infrastructure de base, le système d'authentification, la gestion des utilisateurs, et la configuration initiale permettant le déploiement d'une première version fonctionnelle. Cet epic délivre également une première fonctionnalité visible (page de santé/health check) pour valider que l'infrastructure est opérationnelle et que le déploiement fonctionne correctement.

#### Story 1.1: Project Setup & Infrastructure Foundation

As a **développeur**,  
I want **un projet configuré avec structure de base, Git, CI/CD, et déploiement initial**,  
so that **l'équipe peut commencer le développement dans un environnement structuré et déployable**.

**Acceptance Criteria:**
1. Repository Git initialisé avec structure de base (monorepo ou polyrepo selon décision technique)
2. CI/CD pipeline configuré (GitHub Actions/GitLab CI) avec build et tests basiques
3. Infrastructure cloud configurée (AWS/GCP/Azure) avec environnement de développement
4. Docker/Kubernetes configuré pour containerisation et déploiement
5. Documentation README avec instructions setup local et déploiement
6. Health check endpoint `/health` retournant status 200 avec informations basiques (version, timestamp)

#### Story 1.2: Database Setup & Multi-Tenancy Foundation

As a **développeur**,  
I want **une base de données configurée avec support multi-tenant**,  
so that **les données de chaque client sont isolées et sécurisées dès le départ**.

**Acceptance Criteria:**
1. PostgreSQL configuré avec schéma de base pour multi-tenancy (tenant_id sur toutes les tables ou schema par tenant)
2. Base de données time-series configurée (InfluxDB ou TimescaleDB) pour données de ventes historiques
3. Migrations de base de données configurées (ex: Alembic, Flyway)
4. Isolation des données testée avec deux tenants différents
5. Backup automatique configuré (quotidien)
6. Documentation schéma de base de données

#### Story 1.3: Authentication & User Management

As a **utilisateur**,  
I want **m'inscrire et me connecter de manière sécurisée**,  
so that **mes données sont protégées et je peux accéder à mon compte**.

**Acceptance Criteria:**
1. Système d'inscription avec email et mot de passe (validation email)
2. Système de connexion avec JWT/OAuth2
3. Gestion de session sécurisée
4. Récupération mot de passe (reset via email)
5. Association utilisateur à un tenant (entreprise)
6. Gestion des permissions basiques (owner, admin, user)
7. Protection contre attaques (rate limiting, CSRF)
8. Tests d'authentification (unit + integration)

#### Story 1.4: Subscription Tiers Management

As a **système**,  
I want **gérer les niveaux d'abonnement (Normal, Premium, Premium Plus)**,  
so that **les fonctionnalités sont correctement restreintes selon le plan de l'utilisateur**.

**Acceptance Criteria:**
1. Modèle de données pour abonnements (niveau, date début, date fin, statut)
2. API pour vérifier niveau d'abonnement d'un utilisateur
3. Middleware/guard pour restreindre accès fonctionnalités selon niveau
4. Interface admin pour gérer abonnements (souscription, upgrade, downgrade)
5. Logs des changements d'abonnement
6. Tests de restriction d'accès par niveau

---

### Epic 2: Gestion Stocks de Base

**Goal étendu:**  
Créer les fonctionnalités fondamentales de gestion des stocks permettant aux utilisateurs de créer, lire, mettre à jour et supprimer leurs stocks avec suivi des quantités, emplacements, et historique des mouvements. Cet epic fournit la base nécessaire pour toutes les autres fonctionnalités et délivre une valeur immédiate même sans IA.

#### Story 2.1: CRUD Stocks de Base

As a **gérant de PME**,  
I want **créer, voir, modifier et supprimer mes stocks**,  
so that **je peux gérer mon inventaire de base**.

**Acceptance Criteria:**
1. API CRUD complète pour stocks (POST, GET, PUT, DELETE)
2. Champs produits : nom, description, SKU, quantité, unité (pièce, kg, litre, etc.), emplacement
3. Validation des données (quantité >= 0, champs obligatoires)
4. Interface utilisateur pour CRUD stocks (formulaires, liste)
5. Messages de confirmation pour actions (création, modification, suppression)
6. Gestion des erreurs (produit inexistant, validation échouée)
7. Tests unitaires et integration pour CRUD

#### Story 2.2: Import Initial Stocks (Onboarding)

As a **nouvel utilisateur**,  
I want **importer mes stocks existants depuis Excel/CSV**,  
so that **je n'ai pas à tout saisir manuellement au démarrage**.

**Acceptance Criteria:**
1. Interface upload fichier CSV/Excel
2. Parser fichier avec détection automatique colonnes
3. Mapping colonnes → champs produits (nom, quantité, etc.)
4. Prévisualisation données avant import
5. Validation données importées (format, valeurs)
6. Import en batch avec gestion erreurs (lignes valides importées, erreurs reportées)
7. Rapport d'import (succès, erreurs, lignes ignorées)
8. Template CSV/Excel fourni en téléchargement

#### Story 2.3: Gestion Emplacements

As a **gérant de PME**,  
I want **associer mes stocks à des emplacements (entrepôts, magasins)**,  
so that **je peux gérer des stocks multi-emplacements**.

**Acceptance Criteria:**
1. CRUD emplacements (créer, modifier, supprimer)
2. Association stock → emplacement (un stock peut être dans un emplacement)
3. Vue stocks par emplacement
4. Quantité totale par emplacement
5. Filtre stocks par emplacement dans interface
6. Support multi-emplacements (un produit peut avoir des quantités dans plusieurs emplacements)

#### Story 2.4: Historique Mouvements Stocks

As a **gérant de PME**,  
I want **voir l'historique des mouvements de mes stocks**,  
so that **je peux tracer toutes les modifications et comprendre l'évolution**.

**Acceptance Criteria:**
1. Enregistrement automatique de tous les mouvements (création, modification quantité, suppression)
2. Champs historique : date/heure, type mouvement, utilisateur, ancienne valeur, nouvelle valeur, raison
3. Interface affichage historique par produit
4. Filtres historique (date, type mouvement, utilisateur)
5. Historique limité à 30 jours pour niveau Normal, 90 jours pour Premium, illimité pour Premium Plus
6. Export historique en CSV (selon niveau abonnement)

#### Story 2.5: Gestion Fournisseurs

As a **gérant de PME**,  
I want **créer et gérer mes fournisseurs**,  
so that **je peux les associer à mes produits et commandes**.

**Acceptance Criteria:**
1. CRUD fournisseurs (nom, contact, email, téléphone, adresse)
2. Association produit → fournisseur (un produit peut avoir un fournisseur principal)
3. Liste fournisseurs avec produits associés
4. Interface gestion fournisseurs
5. Validation données fournisseur (email valide, etc.)

---

### Epic 3: Capture Données Ventes & Calculs

**Goal étendu:**  
Permettre la capture des données de ventes nécessaires pour alimenter le moteur IA, tout en offrant des fonctionnalités de calculs personnalisables pour répondre aux besoins spécifiques de chaque PME. Cet epic délivre de la valeur immédiate avec les calculs et prépare les données pour l'IA.

#### Story 3.1: Saisie Manuelle Ventes

As a **gérant de PME**,  
I want **saisir manuellement mes ventes quotidiennes**,  
so that **je peux alimenter le système avec mes données de ventes**.

**Acceptance Criteria:**
1. Interface saisie vente (date, produit, quantité vendue, prix de vente optionnel)
2. Validation données (produit existe, quantité > 0, date valide)
3. Enregistrement ventes en base de données time-series
4. Liste des ventes récentes avec possibilité modification/suppression
5. Calcul automatique ventes totales par jour/produit
6. Tests unitaires logique de saisie

#### Story 3.2: Import CSV Ventes

As a **gérant de PME**,  
I want **importer mes ventes depuis un fichier CSV**,  
so that **je peux importer mes données historiques ou mes exports d'autres systèmes**.

**Acceptance Criteria:**
1. Interface upload fichier CSV ventes
2. Parser CSV avec détection colonnes (date, produit, quantité, prix)
3. Mapping colonnes → champs ventes
4. Prévisualisation données avant import
5. Validation données (produits existent, dates valides)
6. Import en batch avec gestion erreurs
7. Rapport d'import (succès, erreurs)
8. Template CSV fourni

#### Story 3.3: Formules Prédéfinies

As a **gérant de PME**,  
I want **utiliser des formules de calcul prédéfinies communes**,  
so that **je peux faire des calculs standards sans avoir à les créer**.

**Acceptance Criteria:**
1. Implémentation des 8 formules prédéfinies (consommation moyenne, stock sécurité, point commande, etc.)
2. Interface avec liste formules disponibles et descriptions
3. Sélection formule avec paramètres (ex: période pour consommation moyenne)
4. Calcul et affichage résultat
5. Possibilité d'utiliser résultat dans autres calculs
6. Documentation de chaque formule
7. Tests unitaires pour chaque formule

#### Story 3.4: Saisie Manuelle Formules Personnalisées

As a **gérant de PME**,  
I want **créer mes propres formules de calcul personnalisées**,  
so that **je peux répondre à mes besoins spécifiques comme dans Excel**.

**Acceptance Criteria:**
1. Éditeur de formule avec champ de saisie texte
2. Support syntaxe : opérateurs (+, -, *, /, ^), fonctions (SUM, AVG, MAX, MIN, COUNT, IF)
3. Références aux données : STOCK_ACTUEL, VENTES_7J, PRIX_ACHAT, etc.
4. Autocomplétion variables et fonctions disponibles
5. Validation syntaxe en temps réel
6. Messages d'erreur clairs si formule invalide
7. Prévisualisation résultat avant sauvegarde
8. Sauvegarde formules personnalisées par utilisateur
9. Bibliothèque formules sauvegardées
10. Tests unitaires parser et évaluateur de formules

#### Story 3.5: Calculs Basiques Temps Stock (Sans IA)

As a **gérant de PME**,  
I want **voir une estimation basique du temps de stock disponible**,  
so that **je peux avoir une idée même sans IA encore calibrée**.

**Acceptance Criteria:**
1. Calcul consommation moyenne basique (moyenne ventes 30 derniers jours)
2. Calcul jours de stock restant = stock_actuel / consommation_quotidienne_moyenne
3. Affichage estimation temps stock par produit
4. Indicateur visuel si estimation non fiable (pas assez de données)
5. Message clair que c'est une estimation basique qui s'améliorera avec IA

---

### Epic 4: Interface Visuelle & Tableau de Bord

**Goal étendu:**  
Créer une interface utilisateur visuelle moderne et intuitive qui remplace l'expérience Excel par un tableau de bord centralisé, des visualisations claires, et un accès rapide aux informations critiques. Cette interface doit être simple pour des utilisateurs PME non-techniques et délivrer de la valeur immédiate.

#### Story 4.1: Dashboard Principal

As a **gérant de PME**,  
I want **voir un tableau de bord avec vue d'ensemble de mes stocks**,  
so that **je peux rapidement comprendre l'état de mon inventaire sans navigation complexe**.

**Acceptance Criteria:**
1. Dashboard avec vue d'ensemble stocks (liste/grid)
2. Affichage quantités avec distinction par couleurs (vert=OK, orange=attention, rouge=rupture)
3. Statistiques essentielles visibles (ventes veille, stock total, alertes)
4. Actions recommandées visibles (commandes à faire, stocks faibles)
5. Design responsive (desktop + mobile)
6. Temps de chargement < 2 secondes (NFR1)
7. Tests E2E workflow dashboard

#### Story 4.2: Vue Stocks Détaillée

As a **gérant de PME**,  
I want **voir les détails de chaque stock avec toutes les informations**,  
so that **je peux gérer mes produits individuellement**.

**Acceptance Criteria:**
1. Page détail produit avec toutes informations (quantité, emplacement, fournisseur, historique)
2. Affichage estimation temps stock (basique puis IA quand disponible)
3. Courbes de prévision visuelles (quand IA disponible)
4. Actions rapides (modifier, supprimer, voir historique)
5. Navigation claire depuis dashboard
6. Design cohérent avec dashboard

#### Story 4.3: Alertes Visuelles

As a **gérant de PME**,  
I want **recevoir des alertes visuelles pour stocks faibles et ruptures**,  
so that **je peux réagir rapidement aux problèmes**.

**Acceptance Criteria:**
1. Système d'alertes pour stocks faibles (seuil configurable)
2. Alertes pour ruptures imminentes (prédiction IA quand disponible)
3. Alertes visuelles claires (badges, couleurs, icônes)
4. Liste des alertes sur dashboard
5. Filtre par type d'alerte
6. Possibilité de marquer alerte comme "vue" ou "résolue"
7. Notifications (optionnelles) pour alertes critiques

#### Story 4.4: Statistiques Basiques

As a **gérant de PME**,  
I want **voir des statistiques de mes ventes et stocks**,  
so that **je peux comprendre mes tendances basiques**.

**Acceptance Criteria:**
1. Affichage ventes de la veille
2. Graphique ventes sur période (7 jours, 30 jours)
3. Stock actuel total (valeur, quantité)
4. Top produits vendus (selon niveau abonnement)
5. Interface statistiques simple et claire
6. Export données en CSV (selon niveau)

---

### Epic 5: Moteur IA de Prédictions

**Goal étendu:**  
Développer le moteur d'intelligence artificielle qui analyse les tendances, apprend progressivement à partir des données de ventes, et prédit les ruptures de stocks avec précision. Ce moteur est le cœur différenciant du produit et nécessite une infrastructure ML robuste avec support cold start et amélioration continue.

#### Story 5.1: Infrastructure ML & Modèles de Base

As a **système**,  
I want **une infrastructure ML opérationnelle avec modèles de base**,  
so that **l'IA peut fonctionner même sans données historiques (cold start)**.

**Acceptance Criteria:**
1. Infrastructure ML configurée (Python, TensorFlow/PyTorch, MLflow)
2. Modèles de base pré-entraînés sur données agrégées anonymisées
3. Pipeline d'entraînement configuré
4. Système de déploiement modèles (versioning, rollback)
5. Monitoring infrastructure ML (ressources, latence)
6. Documentation architecture ML

#### Story 5.2: Analyse Tendances & Apprentissage Progressif

As a **système**,  
I want **analyser les tendances de consommation à partir des données de ventes**,  
so that **je peux comprendre les patterns et améliorer les prédictions**.

**Acceptance Criteria:**
1. Algorithme d'analyse tendances (saisonnalité, tendances linéaires, patterns)
2. Apprentissage progressif à partir des ventes quotidiennes
3. Adaptation modèle par entreprise (fine-tuning)
4. Gestion cold start (fonctionnement avec minimum de données)
5. Amélioration précision au fil du temps
6. Logs apprentissage pour debugging

#### Story 5.3: Prédiction Ruptures Stocks

As a **gérant de PME**,  
I want **recevoir des prédictions de rupture de stocks**,  
so that **je peux anticiper les problèmes et commander à temps**.

**Acceptance Criteria:**
1. Algorithme prédiction rupture basé sur tendances et stock actuel
2. Prédiction date de rupture estimée
3. Niveau de confiance affiché avec prédiction
4. Prédictions générées en < 5 secondes (NFR2)
5. Affichage prédictions dans interface (dashboard, vue produit)
6. Indicateur visuel si prédiction non fiable (pas assez de données)
7. Tests validation précision prédictions

#### Story 5.4: Réentraînement Automatique Quotidien

As a **système**,  
I want **réentraîner automatiquement les modèles IA quotidiennement**,  
so que **les prédictions s'améliorent continuellement avec les nouvelles données**.

**Acceptance Criteria:**
1. Job automatique quotidien pour réentraînement (cron/scheduler)
2. Réentraînement incrémental (optimisation coûts)
3. Validation nouveau modèle avant déploiement (tests précision)
4. Rollback automatique si nouveau modèle moins performant
5. Logs réentraînement (durée, performance, coûts)
6. Monitoring coûts infrastructure ML
7. Batch processing pour optimiser ressources

#### Story 5.5: Monitoring Performance IA

As a **administrateur**,  
I want **monitorer la performance de l'IA**,  
so that **je peux garantir la qualité des prédictions et détecter les problèmes**.

**Acceptance Criteria:**
1. Dashboard monitoring performance IA (précision globale, taux d'erreur)
2. Comparaison prédictions vs réalité (ground truth)
3. Calcul précision réelle par entreprise
4. Alertes si précision < seuil (ex: < 70%)
5. Métriques par produit (quels produits bien prédits, lesquels moins)
6. Historique performance dans le temps
7. Rapports performance pour équipe technique

---

### Epic 6: Système de Commandes Intelligentes

**Goal étendu:**  
Implémenter le système de recommandations de commande basé sur les prédictions IA, avec rapports explicatifs détaillant pourquoi chaque commande est recommandée, et gestion de l'autonomie graduelle de l'IA (validation humaine d'abord, puis automatisation progressive).

#### Story 6.1: Génération Recommandations Commande

As a **gérant de PME**,  
I want **recevoir des recommandations de commande avec explications**,  
so that **je comprends pourquoi commander et je peux prendre des décisions éclairées**.

**Acceptance Criteria:**
1. Algorithme génération recommandations basé sur prédictions IA
2. Calcul quantités recommandées (basé sur stock actuel, consommation, délai livraison)
3. Rapport explicatif pour chaque recommandation (tendance, stock actuel, prévision rupture, raison)
4. Affichage recommandations dans interface dédiée
5. Tri recommandations par priorité (rupture imminente, stock faible, etc.)
6. Filtres recommandations (produit, fournisseur, urgence)

#### Story 6.2: Validation Commande en Un Clic

As a **gérant de PME**,  
I want **valider une commande recommandée en un clic**,  
so that **je peux commander rapidement sans ressaisir les informations**.

**Acceptance Criteria:**
1. Bouton "Commander" sur chaque recommandation
2. Création automatique commande depuis recommandation
3. Pré-remplissage commande (produits, quantités, fournisseur)
4. Possibilité modification avant validation finale
5. Confirmation commande créée
6. Enregistrement commande en base de données
7. Historique commandes

#### Story 6.3: Gestion Autonomie IA (Limites par Défaut)

As a **système**,  
I want **appliquer des limites de décision par défaut pour l'IA**,  
so that **les commandes automatiques sont contrôlées et sécurisées**.

**Acceptance Criteria:**
1. Configuration limites par défaut (seuil confiance, montant maximum, etc.)
2. Mode "autorisation requise" par défaut (toutes commandes nécessitent validation humaine)
3. Vérification limites avant génération recommandation
4. Blocage recommandation si dépasse limites
5. Message explicatif si recommandation bloquée
6. Logs toutes les décisions IA (recommandations générées, bloquées, validées)

#### Story 6.4: Progression Autonomie Graduelle (Premium Plus)

As a **gérant de PME Premium Plus**,  
I want **activer les commandes automatiques après calibration IA**,  
so that **je peux automatiser complètement mes commandes une fois que j'ai confiance**.

**Acceptance Criteria:**
1. Système de calibration IA (suivi précision sur période, ex: 3 mois)
2. Indicateur niveau de confiance IA (prêt pour automatisation ou non)
3. Activation commandes automatiques si précision > seuil (ex: 85%) et période calibration complète
4. Mode automatique : commandes passées automatiquement si dans limites
5. Notifications commandes automatiques passées
6. Possibilité désactiver automatisation à tout moment
7. Logs détaillés commandes automatiques

---

### Epic 7: Photo Facture IA & Intégration Automatique

**Goal étendu:**  
Développer la fonctionnalité d'extraction IA depuis photos de factures, avec vérification automatique contre les commandes initiales, et intégration automatique en base de données. Cette fonctionnalité élimine la saisie manuelle chronophage et est réservée au niveau Premium Plus.

#### Story 7.1: Upload Photo Facture

As a **gérant de PME Premium Plus**,  
I want **uploader une photo de facture**,  
so that **le système peut extraire automatiquement les informations**.

**Acceptance Criteria:**
1. Interface upload photo (drag & drop ou sélection fichier)
2. Support formats image (JPG, PNG, PDF)
3. Validation taille fichier (max 10MB)
4. Prévisualisation photo uploadée
5. Association facture à commande (sélection commande correspondante)
6. Gestion erreurs upload (fichier invalide, trop volumineux)

#### Story 7.2: Extraction IA Facture (OCR)

As a **système**,  
I want **extraire automatiquement les informations d'une facture via IA**,  
so that **les données sont capturées sans saisie manuelle**.

**Acceptance Criteria:**
1. Intégration service OCR/IA (ex: Google Vision API, AWS Textract, ou modèle custom)
2. Extraction : quantités, prix, produits, date, fournisseur, total
3. Mapping produits extraits → produits système (reconnaissance nom/SKU)
4. Gestion cas ambiguïtés (produit non reconnu, prix manquant)
5. Niveau de confiance extraction affiché
6. Prévisualisation données extraites avant validation
7. Tests avec différents formats factures

#### Story 7.3: Vérification Automatique Commande vs Facture

As a **système**,  
I want **vérifier automatiquement que la facture correspond à la commande**,  
so that **je peux détecter les erreurs avant intégration**.

**Acceptance Criteria:**
1. Comparaison quantités facture vs commande initiale
2. Comparaison prix facture vs prix commande (tolérance configurable, ex: 5%)
3. Vérification produits facture vs produits commande
4. Détection différences (quantités, prix, produits manquants/supplémentaires)
5. Alertes visuelles pour différences détectées
6. Rapport différences avec détails
7. Possibilité validation manuelle si différences

#### Story 7.4: Intégration Automatique BDD

As a **gérant de PME Premium Plus**,  
I want **que les données de facture soient intégrées automatiquement**,  
so that **mes stocks sont mis à jour sans saisie manuelle**.

**Acceptance Criteria:**
1. Mise à jour automatique stocks avec quantités facture (après validation)
2. Enregistrement entrée stock dans historique
3. Mise à jour prix d'achat si différent
4. Association facture → commande (lien traçabilité)
5. Confirmation intégration réussie
6. Gestion erreurs intégration (rollback si échec)
7. Logs toutes intégrations automatiques

#### Story 7.5: Fallback Saisie Manuelle Facture

As a **gérant de PME Premium Plus**,  
I want **pouvoir saisir manuellement les données de facture si l'extraction IA échoue**,  
so that **je ne suis pas bloqué si la photo est illisible**.

**Acceptance Criteria:**
1. Option "Saisie manuelle" si extraction IA échoue ou confiance < seuil
2. Formulaire saisie manuelle avec mêmes champs (quantités, prix, produits)
3. Validation données saisie manuelle
4. Intégration BDD identique (même workflow que extraction IA)
5. Possibilité choisir saisie manuelle même si extraction réussie
6. Message clair expliquant pourquoi extraction a échoué (si applicable)

---

## Requirements Analysis - Faiblesses Identifiées

### Méthode 3: Explain Reasoning (CoT Step-by-Step)

**Analyse du raisonnement derrière les requirements:**

**Étape 1 - Identification des priorités:** Les requirements suivent les 3 priorités MVP identifiées (IA, Interface, Commandes), mais il y a une **dépendance circulaire** : FR3 (estimation temps stock) nécessite l'IA (FR4-FR6) qui n'est pas encore développée. **Problème:** Comment afficher des estimations sans IA fonctionnelle ?

**Étape 2 - Séquencement logique:** Les requirements sont présentés dans un ordre qui ne reflète pas les dépendances techniques. FR1-FR3 (gestion stocks de base) peuvent être développés indépendamment, mais FR4-FR6 (IA) nécessitent des données de ventes qui ne sont pas capturées explicitement. **Manque:** Requirements pour capture des données de ventes (terminaux paiement, saisie manuelle, imports).

**Étape 3 - Hypothèses implicites:** Plusieurs requirements supposent des capacités non explicitement définies :
- FR10-FR13 supposent un système OCR/IA de reconnaissance de factures, mais pas de requirement pour la qualité minimale d'extraction
- FR6 (précision 85%) suppose que c'est mesurable et atteignable, mais pas de requirement pour système de validation/ground truth
- FR20 (réentraînement quotidien) suppose infrastructure ML opérationnelle, mais pas de requirement pour monitoring de la dérive des modèles

**Étape 4 - Gaps fonctionnels:** 
- **Pas de requirement pour capture initiale des stocks** - Comment les utilisateurs entrent-ils leurs stocks existants au démarrage ?
- **Pas de requirement pour gestion des fournisseurs** - FR11 compare avec "commande initiale" mais pas de requirement pour créer/gérer commandes
- **Pas de requirement pour gestion des emplacements multiples** - FR1 mentionne "emplacements" mais pas de détails sur multi-entrepôts/multi-magasins
- **Pas de requirement pour gestion des unités** - Comment gérer produits vendus en unités différentes (kg, pièces, litres) ?

**Étape 5 - Risques de scope creep:** 
- FR16 (statistiques) est vague - "tendances, comparaisons" peut devenir très large
- FR17 (checklist matinale) semble être un "nice-to-have" plutôt qu'un must-have MVP
- FR18 (historique) est nécessaire mais pas de requirement pour durée de rétention ou archivage

### Méthode 4: Critique and Refine

**Faiblesses identifiées et améliorations proposées:**

**Faiblesse 1: Manque de requirements pour capture données de ventes**
- **Problème:** L'IA (FR4-FR6) nécessite des données de ventes, mais aucun requirement ne définit comment ces données sont capturées
- **Impact:** Blocage pour développement IA - pas de données = pas d'apprentissage
- **Amélioration proposée:** Ajouter FR21-FR23 pour capture ventes (saisie manuelle, import CSV, intégration terminaux paiement basique)

**Faiblesse 2: Requirements IA trop ambitieux pour MVP**
- **Problème:** FR6 (précision 85% après 3 mois) et FR13 (garantie précision) sont des engagements forts sans mécanisme de validation clair
- **Impact:** Risque de ne pas atteindre les objectifs, perte de crédibilité
- **Amélioration proposée:** Modifier FR6 pour "précision cible 85%" avec système de monitoring (FR15 existe mais pas assez détaillé), ajouter requirement pour dashboard de confiance IA

**Faiblesse 3: Photo facture IA - Pas de fallback manuel**
- **Problème:** FR10-FR13 supposent que l'extraction IA fonctionne toujours, mais pas de requirement pour saisie manuelle si IA échoue
- **Impact:** Blocage utilisateur si facture non lisible ou extraction échoue
- **Amélioration proposée:** Ajouter FR24 pour permettre saisie manuelle en fallback avec validation utilisateur

**Faiblesse 4: Requirements non-fonctionnels trop stricts pour MVP**
- **Problème:** NFR4 (99.5% uptime) est très ambitieux pour MVP, nécessite infrastructure redondante coûteuse
- **Impact:** Coûts infrastructure élevés, complexité opérationnelle
- **Amélioration proposée:** Réduire à 99% pour MVP, avec plan d'amélioration vers 99.5% en V2

**Faiblesse 5: Multi-tenancy non détaillée**
- **Problème:** NFR10 mentionne multi-tenant mais pas de requirement pour isolation des données IA (modèles partagés vs séparés)
- **Impact:** Risque de fuite de données entre clients, problèmes de confidentialité
- **Amélioration proposée:** Ajouter NFR16 pour isolation stricte des données et modèles IA par tenant

**Faiblesse 6: Cold start IA non spécifique**
- **Problème:** FR5 et NFR12 mentionnent cold start mais pas de requirement pour qualité minimale acceptable au démarrage
- **Impact:** Mauvaise expérience utilisateur les premiers jours/semaines
- **Amélioration proposée:** Ajouter requirement pour indicateurs de confiance visibles dès le début, avec communication claire sur amélioration progressive

**Faiblesse 7: Gestion erreurs IA insuffisante**
- **Problème:** NFR14 mentionne gestion erreurs mais pas spécifiquement pour erreurs IA (fausses prédictions, modèles défaillants)
- **Impact:** Confiance utilisateur ébranlée si IA fait des erreurs critiques
- **Amélioration proposée:** Ajouter NFR17 pour système de rollback modèles IA, alertes sur dérive performance, mécanisme de correction manuelle

### Méthode 7: Identify Potential Risks and Unforeseen Issues

**Risques techniques identifiés:**

**Risque 1: Dépendance données externes non contrôlées**
- **Description:** FR4-FR6 supposent accès aux données de ventes via terminaux paiement, mais ces intégrations peuvent être instables ou indisponibles
- **Impact:** Blocage apprentissage IA, précision insuffisante
- **Mitigation:** Ajouter requirement pour capture manuelle obligatoire en parallèle, pas de dépendance exclusive aux APIs externes

**Risque 2: Coûts infrastructure IA imprévisibles**
- **Description:** FR20 (réentraînement quotidien) peut générer des coûts ML très élevés si mal optimisé (100 clients = 100 réentraînements/jour)
- **Impact:** Rentabilité compromise, coûts > revenus
- **Mitigation:** Ajouter requirement pour optimisation coûts (réentraînement incrémental, batch processing, modèles partagés quand possible)

**Risque 3: Qualité OCR factures variable**
- **Description:** FR10-FR13 supposent extraction fiable, mais factures varient énormément (formats, langues, qualités photo)
- **Impact:** Taux d'erreur élevé, frustration utilisateurs, perte de confiance
- **Mitigation:** Ajouter requirement pour validation humaine obligatoire si confiance < seuil, amélioration progressive modèles OCR

**Risque 4: Scalabilité réentraînement IA**
- **Description:** NFR11 (scalabilité) et FR20 (réentraînement quotidien) peuvent entrer en conflit - 1000 clients = 1000 modèles à réentraîner quotidiennement
- **Impact:** Infrastructure surchargée, coûts exponentiels, latence élevée
- **Mitigation:** Ajouter requirement pour stratégie de réentraînement intelligent (seulement si données significatives nouvelles, batch par priorité)

**Risque 5: Conformité RGPD pour données IA**
- **Description:** NFR6 mentionne RGPD mais pas spécifiquement pour données utilisées pour entraînement IA (données agrégées, modèles partagés)
- **Impact:** Violation réglementaire, amendes, perte confiance
- **Mitigation:** Ajouter requirement pour consentement explicite utilisation données pour IA, anonymisation avant agrégation, droit à l'exclusion

**Risque 6: Performance dégradée avec croissance**
- **Description:** NFR1-NFR2 (temps réponse) peuvent être difficiles à maintenir avec croissance nombre de clients et complexité modèles IA
- **Impact:** Expérience utilisateur dégradée, churn
- **Mitigation:** Ajouter requirement pour caching intelligent, pré-calcul prédictions, optimisation requêtes

**Risques métier identifiés:**

**Risque 7: Adoption lente = données insuffisantes = IA peu performante**
- **Description:** Cercle vicieux : besoin données pour IA performante, mais besoin IA performante pour adoption
- **Impact:** Échec produit, pas assez de valeur pour justifier prix
- **Mitigation:** Ajouter requirement pour valeur immédiate sans IA (gestion stocks basique), IA comme amélioration progressive

**Risque 8: Concurrence réagit rapidement**
- **Description:** Grandes entreprises peuvent lancer solution PME abordable rapidement avec leurs ressources
- **Impact:** Perte avantage concurrentiel
- **Mitigation:** Focus sur différenciation IA précise, rapidité exécution, relation clients PME

### Méthode 8: Challenge from Critical Perspective (YAGNI)

**Requirements à questionner ou retirer pour MVP:**

**Question 1: FR17 - Checklist matinale est-elle vraiment nécessaire MVP ?**
- **Argument contre:** C'est un "nice-to-have" qui peut être remplacé par dashboard principal (FR2)
- **Verdict:** **RETIRER de MVP** - Le dashboard principal peut servir de checklist, ajouter en V2 si demande utilisateurs

**Question 2: FR16 - Statistiques détaillées sont-elles MVP ?**
- **Argument contre:** "Tendances, comparaisons" est vague et peut devenir très large. MVP devrait se concentrer sur statistiques essentielles (ventes veille mentionnées dans FR16)
- **Verdict:** **SIMPLIFIER** - Limiter à ventes veille et stock actuel, reporter analyses avancées en V2

**Question 3: FR8 - Configuration limites IA est-elle MVP ?**
- **Argument contre:** Pour MVP, on peut avoir des limites par défaut raisonnables sans interface de configuration complexe
- **Verdict:** **SIMPLIFIER** - Limites par défaut pour MVP, configuration avancée en V2

**Question 4: NFR15 - Métriques performance IA détaillées sont-elles MVP ?**
- **Argument contre:** Monitoring basique suffit pour MVP, métriques détaillées (précision, rappel, F1) sont pour optimisation avancée
- **Verdict:** **SIMPLIFIER** - Monitoring basique (précision globale) pour MVP, métriques détaillées en V2

**Question 5: Architecture microservices est-elle nécessaire MVP ?**
- **Argument contre:** Microservices ajoutent complexité opérationnelle, monolithe modulaire peut suffire pour MVP avec <100 clients
- **Verdict:** **QUESTIONNER** - Évaluer si monolithe modulaire peut suffire pour MVP, microservices si scale prévu rapidement

**Question 6: FR18 - Historique complet est-il MVP ?**
- **Argument contre:** Historique basique (derniers 30 jours) peut suffire pour MVP, historique complet peut être coûteux en stockage
- **Verdict:** **SIMPLIFIER** - Historique 30-90 jours pour MVP, historique complet en V2

**Requirements manquants critiques identifiés:**

**Manque critique 1: Capture données de ventes**
- **Ajouter:** FR21-FR23 pour saisie manuelle ventes, import CSV, intégration terminaux basique

**Manque critique 2: Onboarding initial**
- **Ajouter:** FR24 pour import stocks existants (CSV, Excel), configuration initiale

**Manque critique 3: Gestion fournisseurs basique**
- **Ajouter:** FR25 pour créer/gérer fournisseurs, associer produits à fournisseurs

**Manque critique 4: Fallback manuel factures**
- **Ajouter:** FR26 pour saisie manuelle si extraction IA échoue

**Manque critique 5: Validation/ground truth pour IA**
- **Ajouter:** NFR18 pour système de validation prédictions vs réalité, calcul précision réelle

---

## Recommandations Suite à l'Analyse

### Priorités d'Action Immédiates

1. **Ajouter requirements manquants critiques** (FR21-FR26, NFR16-NFR18)
2. **Simplifier requirements MVP** (FR16, FR17, FR8, NFR15)
3. **Clarifier dépendances** entre requirements (séquencement logique)
4. **Réviser NFR4** (99.5% → 99% pour MVP)
5. **Questionner architecture** (microservices vs monolithe modulaire pour MVP)

### Questions à Résoudre Avant Développement

1. Comment capturer les données de ventes au démarrage ? (Saisie manuelle ? Import ? APIs ?)
2. Quelle stratégie cold start IA acceptable pour les premiers jours ?
3. Architecture microservices nécessaire dès MVP ou peut-on commencer monolithe ?
4. Comment valider la précision IA de 85% sans ground truth initial ?
5. Quel fallback si extraction facture IA échoue complètement ?

---

## Next Steps

### UX Expert Prompt

**Pour créer l'architecture UX/UI détaillée :**

```
@ux-expert Crée l'architecture UX/UI détaillée pour le SaaS de gestion de stocks IA pour PME. 
Utilise le PRD disponible dans docs/prd.md comme référence complète.

Points clés à traiter :
- Interface extrêmement simple pour utilisateurs PME non-techniques
- Dashboard-first approach avec toutes informations critiques visibles
- Distinction visuelle par couleurs (vert/orange/rouge pour états stocks)
- Support calculs personnalisables avec éditeur de formules type Excel
- Gestion des 3 niveaux d'abonnement (Normal, Premium, Premium Plus)
- Responsive design (desktop principal, mobile consultation)
- Accessibilité WCAG AA

Le PRD contient 7 épics avec 32 stories détaillées, requirements fonctionnels et non-fonctionnels complets, 
et structure d'abonnement définie. Crée les wireframes, user flows, et design system nécessaires.
```

### Architect Prompt

**Pour créer l'architecture technique détaillée :**

```
@architect Crée l'architecture technique complète pour le SaaS de gestion de stocks IA pour PME.
Utilise le PRD disponible dans docs/prd.md comme référence complète.

Points techniques clés du PRD :
- Architecture microservices modulaire (API Gateway, Service Stocks, Service IA/ML, Service Commandes, Service Factures, Service Analytics)
- Base de données : PostgreSQL (relationnel) + InfluxDB/TimescaleDB (time-series)
- Infrastructure ML pour prédictions IA avec réentraînement quotidien
- Multi-tenancy avec isolation stricte des données
- Support cold start IA (fonctionnement sans données historiques)
- Calculs personnalisables avec parser/évaluateur de formules
- Structure d'abonnement avec restriction fonctionnalités par niveau
- Sécurité : OAuth2/JWT, chiffrement, RGPD, logs audit
- Performance : <2s visualisation stocks, <5s prédictions IA
- Scalabilité horizontale

Le PRD contient 7 épics avec 32 stories, requirements techniques détaillés, et assumptions techniques.
Crée l'architecture complète avec choix technologiques, patterns, intégrations, et infrastructure.
```

---

*Analyse effectuée le 19 décembre 2024 via méthodes d'élicitation 3, 4, 7, 8*
