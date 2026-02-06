# Story 3.2: Import CSV Ventes

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **gérant de PME**,  
I want **importer mes ventes depuis un fichier CSV**,  
so that **je peux importer mes données historiques ou mes exports d'autres systèmes**.

## Acceptance Criteria

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

## Tasks / Subtasks

- [x] Task 1: API Endpoints d'import (AC: upload, parser, mapping, prévisualisation, validation, batch, rapport, template)
  - [x] 1.1 GET /sales/import/template → retourne un fichier CSV template avec en-têtes recommandés (sale_date, product_sku, quantity_sold, unit_price, location_name, metadata)
  - [x] 1.2 POST /sales/import/preview (multipart/form-data: file) → parse le fichier CSV, détecte colonnes, retourne { columns: string[], sampleRows: object[], suggestedMapping: Record<string, string> }
  - [x] 1.3 POST /sales/import (multipart/form-data: file, mapping?: JSON string) → exécute l'import avec mapping optionnel (colonnes utilisateur → champs vente). Retourne { success: number, errors: { row: number, message: string }[], ignored: number, totalRows: number }
  - [x] 1.4 Parser CSV : utiliser csv-parse (déjà utilisé dans product-import.service.ts) pour parsing robuste. Supporter encodage UTF-8, délimiteur auto-détecté (virgule, point-virgule)
  - [x] 1.5 Détection colonnes : comparer les en-têtes (insensible casse, normaliser espaces) avec champs connus (date↔date/sale_date/vente_date, product_sku↔sku/product/code/produit, quantity_sold↔qty/qté/quantité/quantity, unit_price↔price/prix/prix_vente, location_name↔location/emplacement)
  - [x] 1.6 Validation : sale_date format valide (ISO8601 ou formats courants DD/MM/YYYY, YYYY-MM-DD), product_sku existe dans products du tenant, quantity_sold > 0, unit_price >= 0 si fourni, location_name → résolution par nom (optionnel, ignorer si non trouvé)
  - [x] 1.7 Import batch : transaction par lot (ex: 100 lignes), commit des lignes valides, collecte erreurs. Ne pas tout rollback si une ligne échoue
  - [x] 1.8 Associer tenant_id à toutes les ventes créées via req.user.tenantId (comme 3.1)
  - [x] 1.9 Définir source = 'csv' pour toutes les ventes importées (différent de 'manual' de la story 3.1)

- [x] Task 2: Logique métier et service (AC: validation, batch, rapport)
  - [x] 2.1 Créer sales-import.service.ts : parseFile(), detectColumns(), suggestMapping(), validateRow(), importSales(tenantId, rows, mapping)
  - [x] 2.2 Réutiliser createSale du sales.service.ts pour chaque ligne valide (ne pas dupliquer la logique)
  - [x] 2.3 Pour product_sku : chercher le produit par SKU dans products du tenant ; si non trouvé → erreur (obligatoire)
  - [x] 2.4 Pour location_name : si mapping pointe vers une colonne, chercher par nom dans locations du tenant ; si non trouvé, option : ignorer (laisser null) ou créer. Pour MVP : ignorer si non trouvé (comme story 2.2)
  - [x] 2.5 Calcul total_amount : si unit_price fourni, calculer total_amount = quantity_sold * unit_price (même logique que story 3.1)
  - [x] 2.6 Rapport : { imported: number, errors: { row: number, value?: string, message: string }[], ignored: number, totalRows: number }

- [x] Task 3: Interface utilisateur (AC: interface upload, mapping, prévisualisation)
  - [x] 3.1 Créer une page d'upload : soit une route /import-sales servie par l'API (HTML + form), soit intégration dans sales.html existante
  - [x] 3.2 Formulaire : input type=file accept=".csv", bouton "Prévisualiser"
  - [x] 3.3 Appel POST /sales/import/preview avec Bearer token, affichage des colonnes détectées + mapping suggéré modifiable (dropdowns colonne → champ vente)
  - [x] 3.4 Tableau prévisualisation (10-20 premières lignes) avec colonnes mappées
  - [x] 3.5 Bouton "Importer" → POST /sales/import avec file + mapping, affichage du rapport (X importés, Y erreurs avec détails ligne par ligne)
  - [x] 3.6 Lien "Télécharger le template CSV" → GET /sales/import/template

- [x] Task 4: Tests (AC: validation, batch, rapport)
  - [x] 4.1 Tests unitaires sales-import.service : parse CSV, détection colonnes, validation lignes, import avec erreurs partielles
  - [x] 4.2 Tests intégration : POST /sales/import/preview, POST /sales/import avec fichier valide, fichier invalide, mapping personnalisé
  - [x] 4.3 Vérifier multi-tenant : import d'un tenant n'apparaît pas chez l'autre
  - [x] 4.4 Tests validation : product_sku inexistant, date invalide, quantity_sold <= 0, unit_price < 0

## Dev Notes

- **Contexte Story 3.1 :** API CRUD ventes opérationnelle (sales.service.ts, sales.routes.ts). Table sales existe (V009). Types SaleCreateInput dans packages/shared. RLS et tenant_id obligatoires. Utiliser createSale pour chaque ligne valide.
- **Authentification :** Toutes les routes import doivent être protégées par authenticateToken ; tenant_id depuis req.user.tenantId.
- **Fichiers volumineux :** Limiter la taille (ex: 5 MB) via middleware. Pour très gros fichiers, envisager traitement asynchrone (hors scope MVP).
- **Source 'csv' :** Pour cette story, toutes les ventes importées auront source = 'csv' (différent de 'manual' de la story 3.1). Cela permet de distinguer les sources de données pour analytics/ML.
- **Template CSV :** En-têtes recommandés : sale_date,product_sku,quantity_sold,unit_price,location_name. Optionnel : metadata (JSON string). Format date recommandé : YYYY-MM-DD ou ISO8601.
- **Stratégie location par nom :** Pour MVP, si colonne mappée mais nom non trouvé → laisser null. Éviter la création automatique d'emplacements (Story 2.3).
- **Résolution produit par SKU :** Le SKU doit être unique par tenant. Si plusieurs produits ont le même SKU (cas rare), utiliser le premier trouvé ou retourner erreur selon logique métier.
- **Gestion des erreurs batch :** Ne pas arrêter l'import si une ligne échoue. Continuer avec les lignes suivantes et rapporter toutes les erreurs à la fin. Transaction par lot pour performance.

### Project Structure Notes

- **API :** apps/api/src/ — routes sous routes/, services sous services/
- **Nouveau fichier :** apps/api/src/services/sales-import.service.ts
- **Routes :** étendre sales.routes.ts avec routes d'import (/sales/import/*)
- **Middleware :** Réutiliser multer ou express-fileupload déjà utilisé pour product-import (vérifier si présent)
- **Tests :** apps/api/src/__tests__/sales/sales-import.integration.test.ts, __tests__/services/sales-import.service.test.ts
- **Page HTML :** apps/api/public/import-sales.html ou intégration dans sales.html existante

### Architecture Compliance

- **Multi-tenant :** Toutes les requêtes en RLS avec app.current_tenant ; db.queryWithTenant(tenantId, ...). Table sales a tenant_id ; politique RLS déjà en place (V009).
- **Authentification :** Routes protégées par authenticateToken ; tenant_id depuis req.user.
- **Base de données :** PostgreSQL pour MVP. Table sales optimisée pour requêtes temporelles avec index sur sale_date.
- **API REST :** Suivre les mêmes patterns que /products/import : multipart/form-data pour upload, codes HTTP appropriés (200, 201, 400, 500).
- **Performance :** Import batch par transactions de 100 lignes pour éviter les transactions trop longues. Utiliser INSERT ... VALUES pour performance.

### Library & Framework Requirements

- **Backend :** Express.js 4.18+ avec TypeScript, express-validator pour validation
- **CSV Parsing :** csv-parse (déjà utilisé dans product-import.service.ts) - version sync pour simplicité MVP
- **File Upload :** multer ou express-fileupload (vérifier celui déjà utilisé dans product-import)
- **Base de données :** PostgreSQL 15+ avec pg (node-postgres)
- **Types :** TypeScript avec types partagés dans packages/shared
- **Tests :** Jest + Supertest pour tests intégration, tests unitaires pour logique métier

### File Structure Requirements

- **Service Layer :** apps/api/src/services/sales-import.service.ts
  - Fonctions : parseFile(file), detectColumns(headers), suggestMapping(columns), validateRow(row, mapping, tenantId), importSales(tenantId, rows, mapping)
  - Validation métier : vérifier product_sku existe, quantity_sold > 0, date valide, calcul total_amount
- **Route Layer :** apps/api/src/routes/sales.routes.ts (étendre)
  - GET /sales/import/template (retourne CSV template)
  - POST /sales/import/preview (multipart: file) → retourne preview
  - POST /sales/import (multipart: file, mapping?) → exécute import
- **Page HTML :** apps/api/public/import-sales.html ou intégration dans sales.html
  - Formulaire upload, mapping colonnes, prévisualisation, rapport d'import

### Testing Requirements

- **Tests unitaires :** sales-import.service.test.ts
  - Test parseFile avec CSV valide/invalide
  - Test detectColumns avec différents formats d'en-têtes
  - Test suggestMapping avec colonnes connues/inconnues
  - Test validateRow (product_sku existe, date valide, quantity_sold > 0)
  - Test importSales avec lignes valides/invalides, gestion erreurs partielles
- **Tests intégration :** sales-import.integration.test.ts
  - GET /sales/import/template (200, Content-Type: text/csv)
  - POST /sales/import/preview avec fichier valide/invalide
  - POST /sales/import avec fichier valide, mapping personnalisé, erreurs partielles
  - Isolation tenant (import d'un tenant invisible pour autre tenant)
- **Coverage :** Viser 80%+ couverture pour logique métier critique (parsing, validation, import)

### Previous Story Intelligence

- **Story 2.2 (Import Stocks) :** Patterns d'import CSV établis avec product-import.service.ts. Réutiliser les mêmes patterns : parseFile(), detectColumns(), suggestMapping(), validateRow(), import batch. Colonnes alias pour détection automatique. Template CSV avec en-têtes recommandés. Page HTML avec upload, mapping, prévisualisation, rapport.
- **Story 3.1 (Saisie Manuelle Ventes) :** API CRUD ventes opérationnelle. Table sales avec structure complète. Service sales.service.ts avec createSale(). Routes /sales protégées par authenticateToken. Validation product_id existe, quantity_sold > 0, calcul total_amount. Page HTML sales.html avec liste, formulaire création/édition.

**Apprentissages clés de Story 2.2 :**
- Utiliser csv-parse (sync) pour parsing CSV robuste
- Détection colonnes avec alias insensible casse (français/anglais)
- Mapping suggéré automatique avec possibilité de modification
- Validation ligne par ligne avec collecte erreurs
- Import batch par transactions (100 lignes) pour performance
- Rapport détaillé avec succès/erreurs/ignorés
- Template CSV téléchargeable pour guider utilisateur
- Page HTML avec workflow : upload → preview → mapping → import → rapport

**Apprentissages clés de Story 3.1 :**
- Utiliser createSale() pour chaque ligne valide (ne pas dupliquer logique)
- Vérifier product_id existe et appartient au tenant
- Calcul total_amount = quantity_sold * unit_price si unit_price fourni
- Source 'manual' pour saisie manuelle, 'csv' pour import CSV
- location_id optionnel, ignorer si non trouvé
- RLS automatique via db.queryWithTenant

### References

- [Source: planning-artifacts/epics.md#Epic 3 - Story 3.2]
- [Source: docs/prd.md#FR22 - Import CSV ventes]
- [Source: apps/api/migrations/V009__create_sales.sql - Table sales structure]
- [Source: implementation-artifacts/2-2-import-initial-stocks-onboarding.md - Patterns import CSV]
- [Source: implementation-artifacts/3-1-saisie-manuelle-ventes.md - Patterns API CRUD ventes]
- [Source: apps/api/src/services/product-import.service.ts - Service import CSV produits]
- [Source: apps/api/src/services/sales.service.ts - Service CRUD ventes]
- [Source: apps/api/src/routes/sales.routes.ts - Routes ventes]
- [Source: apps/api/public/import-stocks.html - Page HTML import stocks]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Service sales-import.service.ts créé avec parseFile, suggestMapping, validateRow, importSales
- Routes d'import ajoutées dans sales.routes.ts : GET /sales/import/template, POST /sales/import/preview, POST /sales/import
- Page HTML import-sales.html créée avec workflow complet : upload → preview → mapping → import → rapport
- Tests unitaires créés pour parsing CSV et détection colonnes
- Tests d'intégration créés pour tous les endpoints avec validation multi-tenant
- Source 'csv' ajouté au contexte de createSale pour distinguer les sources de données
- Import batch par transactions de 100 lignes pour performance

### File List

- apps/api/src/services/sales-import.service.ts (nouveau)
- apps/api/src/services/sales.service.ts (modifié - ajout source optionnel dans context)
- apps/api/src/routes/sales.routes.ts (modifié - ajout routes import)
- apps/api/src/index.ts (modifié - ajout route /import-sales)
- apps/api/public/import-sales.html (nouveau)
- apps/api/src/__tests__/services/sales-import.service.test.ts (nouveau)
- apps/api/src/__tests__/sales/sales-import.integration.test.ts (nouveau)

- apps/api/src/services/sales-import.service.ts (nouveau)
- apps/api/src/services/sales.service.ts (modifié - ajout source optionnel dans context)
- apps/api/src/routes/sales.routes.ts (modifié - ajout routes import)
- apps/api/src/index.ts (modifié - ajout route /import-sales)
- apps/api/public/import-sales.html (nouveau)
- apps/api/src/__tests__/services/sales-import.service.test.ts (nouveau)
- apps/api/src/__tests__/sales/sales-import.integration.test.ts (nouveau)
