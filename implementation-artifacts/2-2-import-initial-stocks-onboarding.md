# Story 2.2: Import Initial Stocks (Onboarding)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **nouvel utilisateur**,  
I want **importer mes stocks existants depuis Excel/CSV**,  
so that **je n'ai pas à tout saisir manuellement au démarrage**.

## Acceptance Criteria

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

## Tasks / Subtasks

- [x] Task 1: API Endpoints d'import (AC: upload, parser, mapping, prévisualisation, validation, batch, rapport)
  - [x] 1.1 GET /products/import/template → retourne un fichier CSV template avec en-têtes recommandés (sku, name, description, unit, quantity, min_quantity, location_name, supplier_name, purchase_price, selling_price, lead_time_days)
  - [x] 1.2 POST /products/import/preview (multipart/form-data: file) → parse le fichier, détecte colonnes, retourne { columns: string[], sampleRows: object[], suggestedMapping: Record<string, string> }
  - [x] 1.3 POST /products/import (multipart/form-data: file, mapping?: JSON string) → exécute l'import avec mapping optionnel (colonnes utilisateur → champs produit). Retourne { success: number, errors: { row: number, message: string }[], ignored: number }
  - [x] 1.4 Parser CSV : utiliser une lib (csv-parse, papaparse, ou fast-csv) pour parsing robuste. Supporter encodage UTF-8, délimiteur auto-détecté (virgule, point-virgule)
  - [x] 1.5 Parser Excel : utiliser xlsx ou exceljs pour .xlsx/.xls. Mapper la première feuille par défaut
  - [x] 1.6 Détection colonnes : comparer les en-têtes (insensible casse, normaliser espaces) avec champs connus (sku↔sku/ref/code, name↔nom/name/product, quantity↔qty/qté/quantité, etc.)
  - [x] 1.7 Validation : quantité >= 0, sku et name obligatoires, unit dans enum product_unit (piece, kg, liter, box, pack). location_name et supplier_name → résolution par nom (création si inexistant ou ignorer selon stratégie)
  - [x] 1.8 Import batch : transaction par lot (ex: 100 lignes), commit des lignes valides, collecte erreurs. Ne pas tout rollback si une ligne échoue
  - [x] 1.9 Associer tenant_id à tous les produits créés via req.user.tenantId (comme 2.1)

- [x] Task 2: Logique métier et service (AC: validation, batch, rapport)
  - [x] 2.1 Créer product-import.service.ts : parseFile(), detectColumns(), suggestMapping(), validateRow(), importProducts(tenantId, rows, mapping)
  - [x] 2.2 Réutiliser createProduct du product.service.ts pour chaque ligne valide (ne pas dupliquer la logique)
  - [x] 2.3 Pour location_name/supplier_name : si mapping pointe vers une colonne, chercher par nom dans locations/suppliers du tenant ; si non trouvé, option : créer (Story 2.3/2.5) ou laisser null. Pour MVP : laisser null si non trouvé
  - [x] 2.4 Rapport : { imported: number, errors: { row: number, value?: string, message: string }[], ignored: number, totalRows: number }

- [x] Task 3: Interface utilisateur (AC: interface upload, mapping, prévisualisation)
  - [x] 3.1 Créer une page d'upload : soit une route /import-stocks servie par l'API (HTML + form), soit intégration dans un futur app web
  - [x] 3.2 Formulaire : input type=file accept=".csv,.xlsx,.xls", bouton "Prévisualiser"
  - [x] 3.3 Appel POST /products/import/preview avec Bearer token, affichage des colonnes détectées + mapping suggéré modifiable (dropdowns colonne → champ produit)
  - [x] 3.4 Tableau prévisualisation (10-20 premières lignes) avec colonnes mappées
  - [x] 3.5 Bouton "Importer" → POST /products/import avec file + mapping, affichage du rapport (X importés, Y erreurs avec détails)
  - [x] 3.6 Lien "Télécharger le template CSV" → GET /products/import/template

- [x] Task 4: Tests (AC: validation, batch, rapport)
  - [x] 4.1 Tests unitaires product-import.service : parse CSV/Excel, détection colonnes, validation lignes, import avec erreurs partielles
  - [x] 4.2 Tests intégration : POST /products/import/preview, POST /products/import avec fichier valide, fichier invalide, mapping personnalisé
  - [x] 4.3 Vérifier multi-tenant : import d'un tenant n'apparaît pas chez l'autre

## Dev Notes

- **Contexte Story 2.1 :** API CRUD produits opérationnelle (product.service.ts, product.routes.ts). Tables products, locations, suppliers existent (V007). Types ProductCreateInput dans packages/shared. RLS et tenant_id obligatoires. Utiliser createProduct pour chaque ligne valide.
- **Authentification :** Toutes les routes import doivent être protégées par authenticateToken ; tenant_id depuis req.user.tenantId.
- **Fichiers volumineux :** Limiter la taille (ex: 5 MB) via middleware. Pour très gros fichiers, envisager traitement asynchrone (hors scope MVP).
- **Unité (unit) :** Enum product_unit : piece, kg, liter, box, pack. Normaliser valeurs courantes (pc→piece, kg→kg, L→liter, etc.).
- **Excel :** Première feuille uniquement pour MVP. Lib recommandée : xlsx (SheetJS) ou exceljs.
- **Template CSV :** En-têtes : sku,name,description,unit,quantity,min_quantity,purchase_price,selling_price,lead_time_days. Optionnel : location_name,supplier_name (résolution par nom si fourni).
- **Stratégie location/supplier par nom :** Pour MVP, si colonne mappée mais nom non trouvé → laisser null. Éviter la création automatique d'emplacements/fournisseurs (Story 2.3 et 2.5).

### Project Structure Notes

- API : apps/api/src/ — routes sous routes/, services sous services/
- Nouveau fichier : apps/api/src/services/product-import.service.ts
- Routes : étendre product.routes.ts ou créer product-import.routes.ts (monté sous /products)
- Middleware : multer ou express-fileupload pour multipart. Vérifier si déjà présent ; sinon ajouter.
- Tests : apps/api/src/__tests__/products/product-import.integration.test.ts, __tests__/services/product-import.service.test.ts

### Références

- [Source: planning-artifacts/epics.md#Epic 2 - Story 2.2]
- [Source: implementation-artifacts/2-1-crud-stocks-de-base.md]
- [Source: apps/api/migrations/V007__create_locations_suppliers_products.sql]
- [Source: packages/shared/src/types/index.ts - ProductCreateInput, ProductUnit]
- [Source: apps/api/src/services/product.service.ts - createProduct]

## Dev Agent Record

### Agent Model Used

Auto

### Debug Log References

### Completion Notes List

- Service product-import.service.ts créé avec parseFile, suggestMapping, validateRow, getImportPreview, importProducts.
- Routes GET /products/import/template, POST /products/import/preview, POST /products/import ajoutées avec multer (5 MB limit).
- Page HTML /import-stocks avec formulaire, prévisualisation, mapping des colonnes, rapport d'import.
- Tests unitaires et intégration passants (129 tests).
- **Code review (AI) :** Rapport d'import complété avec champ `ignored` (AC 2.4). Middleware d'erreur global ajouté (index.ts) pour erreurs multer/type fichier. Endpoints import documentés dans OpenAPI. VALID_UNITS centralisé (export product.service, import routes). Test intégration ajouté : type de fichier refusé (.txt → 400). S'assurer de commiter tous les fichiers listés.

### File List

- apps/api/src/services/product-import.service.ts (new)
- apps/api/src/routes/product.routes.ts (modified)
- apps/api/src/index.ts (modified)
- apps/api/public/import-stocks.html (new)
- apps/api/src/__tests__/services/product-import.service.test.ts (new)
- apps/api/src/__tests__/products/product-import.integration.test.ts (new)
- apps/api/package.json (modified - deps multer, csv-parse, xlsx, @types/multer)
- apps/api/src/openapi/spec.ts (modified - endpoints import)
- apps/api/src/services/product.service.ts (modified - export VALID_UNITS)
