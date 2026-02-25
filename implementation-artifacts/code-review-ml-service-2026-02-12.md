# Code Review – ML Service (Epic 5, Stories 5.1 / 5.2)

**Périmètre :** `apps/ml-service/` (accuracy tracker, inference, baseline, database, chat, main)  
**Date :** 2026-02-12  
**Workflow :** Revue de code ciblée

---

## 1. Résumé

Le service ML (FastAPI) assure : cold start du modèle baseline, inférence, suivi de précision longitudinal (accuracy_tracker), chat avec mémoire contextuelle, et accès base PostgreSQL avec contexte tenant (RLS). La structure est claire, les tests unitaires présents. Plusieurs points d’amélioration (sécurité, robustesse, API) sont identifiés ci‑dessous.

---

## 2. Points positifs

- **Documentation et traçabilité :** Références Epic/Story dans les docstrings (`accuracy_tracker`, `inference`, `baseline`, `config`).
- **Tests :** Bonne couverture pour `accuracy_tracker` (snapshots, évolution, tendance, reset par tenant).
- **Séparation des responsabilités :** `AccuracyTracker` / `BaselineConsumptionModel` / `inference` / `registry` bien découpés.
- **Métriques :** Latence et erreurs d’inférence enregistrées (`metrics`, `inference.py`).
- **Gestion du démarrage :** Échec de chargement du modèle loggé en warning sans faire crasher le service.

---

## 3. Problèmes identifiés

### CRITIQUE

1. **`Database.get_connection` : docstring trompeuse et API risquée**  
   - **Fichier :** `apps/ml-service/app/database.py` (l.47–60)  
   - **Code :** « Get a database connection with optional tenant context **(use as async context manager)** »  
   - **Problème :** La méthode ne retourne pas un context manager mais une connexion. L’appelant doit manuellement appeler `release_connection`, ce qui favorise les fuites de connexions en cas d’oubli ou d’exception.  
   - **Action :** Proposer un vrai context manager asynchrone, par ex. `@asynccontextmanager` qui fait `conn = await cls.get_connection(tenant_id)` puis `yield conn` puis `await cls.release_connection(conn)` dans un `finally`, et documenter/clarifier l’usage.

2. **`asyncpg.execute` : passage du paramètre `tenant_id`**  
   - **Fichier :** `apps/ml-service/app/database.py` (l.56–59)  
   - **Code :** `await connection.execute("SELECT set_tenant_context($1::uuid)", tenant_id)`  
   - **Problème :** En asyncpg, `execute(query, *args)` attend les paramètres comme arguments positionnels. Ici un seul paramètre est passé ; si `tenant_id` est une chaîne UUID valide, cela fonctionne. En revanche, si `tenant_id` est `None` (cas où on ne set pas le contexte), le `if tenant_id` évite l’appel, donc pas de bug direct. Vérifier que les appelants passent bien un UUID (string) et pas un objet UUID non sérialisable.  
   - **Action :** S’assurer que le type attendu est documenté (str UUID) et, si besoin, normaliser avec `str(tenant_id)` avant l’appel pour éviter des erreurs côté asyncpg.

### HAUTE SÉVÉRITÉ

3. **`_prepare_data` : hypothèse sur les colonnes sans noms**  
   - **Fichier :** `apps/ml-service/app/ml/accuracy_tracker.py` (l.201–209)  
   - **Code :** Si `"date"` ou `"quantity"` sont absents, on fait `df = data.iloc[:, :2].copy()` puis `df.columns = ["date", "quantity"]`.  
   - **Problème :** Toute donnée avec deux colonnes (même non temporelles) est interprétée comme date/quantity ; risque de résultats incohérents ou d’erreurs (ex. colonnes non convertibles en date).  
   - **Action :** Soit exiger des colonnes nommées et lever une erreur explicite si absentes, soit documenter clairement le contrat (première colonne = date, deuxième = quantity) et valider les types avant traitement.

4. **Exposition d’erreurs internes dans les réponses HTTP (chat)**  
   - **Fichier :** `apps/ml-service/app/routes/chat_routes.py` (ex. l.76–79, 110–111, 127–128)  
   - **Code :** `detail=f"Error processing chat message: {str(e)}"` (et équivalents).  
   - **Problème :** Les exceptions (y compris détails techniques ou messages SQL/DB) peuvent être renvoyées au client.  
   - **Action :** Logger l’exception complète côté serveur et renvoyer un message générique (ex. « Erreur lors du traitement du message ») ou un code d’erreur, sans exposer la cause technique.

5. **JWT : risque d’exposition du message d’erreur**  
   - **Fichier :** `apps/ml-service/app/middleware/auth.py` (l.64)  
   - **Code :** `detail=f"Invalid token: {str(e)}"`  
   - **Problème :** Certaines bibliothèques JWT peuvent inclure des détails sensibles dans l’exception.  
   - **Action :** Logger `e` côté serveur et renvoyer un message fixe du type « Invalid or expired token » pour les 401.

### MOYENNE SÉVÉRITÉ

6. **`BaselineConsumptionModel.__init__` : cas `daily_consumption == 0`**  
   - **Fichier :** `apps/ml-service/app/ml/models/baseline.py` (l.31)  
   - **Code :** `self.daily_consumption = max(1e-6, float(daily_consumption)) if daily_consumption > 0 else 0.0`  
   - **Problème :** Pour `daily_consumption == 0`, on obtient `0.0` ; `predict_days_until_stockout` gère bien `<= 0` (retour infini ou 0). Cohérent mais le comportement « 0 = pas de consommation » pourrait être documenté dans la docstring de la classe ou de `predict_days_until_stockout`.

7. **`AccuracyTracker` : pas de limite sur le nombre de snapshots**  
   - **Fichier :** `apps/ml-service/app/ml/accuracy_tracker.py`  
   - **Problème :** Les snapshots sont stockés en mémoire sans borne. En production, sur une longue période, la liste peut croître indéfiniment.  
   - **Action :** Introduire une limite (ex. 100 ou 500 snapshots par tenant) ou une fenêtre temporelle, avec éviction des plus anciens (FIFO ou par date).

8. **CORS : origines en dur**  
   - **Fichier :** `apps/ml-service/app/main.py` (l.54–59)  
   - **Code :** `allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"]`  
   - **Problème :** En staging/production, d’autres origines seront nécessaires.  
   - **Action :** Lire les origines depuis une variable d’environnement (ex. `CORS_ORIGINS`) avec une valeur par défaut pour le dev.

9. **`main.py` : import `lifespan` depuis `app.database`**  
   - **Fichier :** `apps/ml-service/app/main.py` (l.24)  
   - **Problème :** Le lifespan initialise la DB et charge le modèle. Si un autre module importe `database` avant le démarrage de l’app, l’ordre d’initialisation peut être sensible. Actuellement cohérent car le lifespan est exécuté par FastAPI au démarrage. À noter pour éviter des imports circulaires ou des appels directs à `Database.initialize()` ailleurs sans passer par le lifespan.

### FAIBLE / SUGGESTIONS

10. **Cohérence des logs (accuracy_tracker)**  
    - **Fichier :** `apps/ml-service/app/ml/accuracy_tracker.py` (l.136–141)  
    - **Suggestion :** Utiliser `logger.info(..., extra={...})` ou des champs structurés si vous centralisez les logs (ex. JSON) pour faciliter l’analyse.

11. **`openai` dans `pyproject.toml`**  
    - **Fichier :** `apps/ml-service/pyproject.toml`  
    - **Suggestion :** Dépendance `openai` présente ; l’endpoint `/ml/openai/predict-stock` renvoie 501. Vérifier que les appels réels à OpenAI (quand implémentés) utiliseront bien cette dépendance et que la version est compatible.

12. **Tests : `test_accuracy_tracker` et données vides**  
    - **Fichier :** `apps/ml-service/tests/ml/test_accuracy_tracker.py` (l.80–84)  
    - **Code :** `tracker.evaluate_accuracy(model, pd.DataFrame())`  
    - **Suggestion :** Le code gère `len(actual_data) == 0` ; ajouter éventuellement un test avec `actual_data is None` si ce chemin est autorisé par la signature (actuellement la signature n’annote pas `Optional[pd.DataFrame]`).

---

## 4. Recommandations prioritaires

| Priorité | Action |
|----------|--------|
| 1 | Exposer un context manager async pour `Database.get_connection` et documenter son usage. |
| 2 | Valider ou restreindre les entrées dans `_prepare_data` (colonnes attendues ou contrat clair + erreur explicite). |
| 3 | Ne plus exposer le détail des exceptions dans les réponses HTTP (chat + auth). |
| 4 | Limiter le nombre de snapshots par tenant dans `AccuracyTracker` (ou fenêtre temporelle). |
| 5 | Configurer CORS via variable d’environnement. |

---

## 5. Checklist rapide

- [x] Context manager pour `get_connection` — Appliqué.
- [x] Contrat / validation pour `_prepare_data` — Appliqué.
- [x] Messages d’erreur HTTP génériques (chat, auth)
- [x] Limite ou éviction des snapshots (accuracy) — Appliqué.
- [x] CORS depuis env — Appliqué.
- [x] Docstring `daily_consumption == 0` (baseline) — Appliqué.

---

*Rapport généré dans le cadre de la revue de code du projet BMAD Stock Agent. Corrections appliquées le 2026-02-12. Tests ajoutés : test_evaluate_accuracy_raises_on_single_column_data, test_snapshots_evicted_when_over_limit.*
