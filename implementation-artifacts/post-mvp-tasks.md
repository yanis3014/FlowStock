# Tâches techniques post-MVP

Tâches à traiter après la livraison du MVP (non bloquantes pour la mise en production).

---

## E2E – Configuration Playwright

- **Tâche :** Corriger configuration E2E (port 3010, env vars).
- **Contexte :** Les tests E2E (auth-flow, dashboard) sont écrits mais peuvent échouer selon l’environnement (port déjà utilisé, réutilisation d’un autre serveur). Le port E2E par défaut a été passé à 3010 pour limiter les conflits.
- **Actions :**
  - Vérifier/corriger `e2e/playwright.config.ts` (E2E_PORT, webServer, reuseExistingServer).
  - S’assurer que `npm run e2e` lance bien l’API sur le port configuré et que les tests reçoivent du JSON (ex. `/csrf-token`), pas du HTML.
  - Documenter dans le README ou dans les scripts la variable `E2E_PORT` (ex. `E2E_PORT=3010 npm run e2e`).
- **Priorité :** Moyenne.

---

*Dernière mise à jour : 2026-02-09*
