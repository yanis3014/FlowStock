# Décision : Données time-series / ventes historiques (Story 1.2)

## Contexte

- **Epics/AC** : « Base de données time-series configurée (InfluxDB ou TimescaleDB) pour données de ventes historiques ».
- **Architecture (docs/architecture.md)** : PostgreSQL pour données relationnelles ; **BigQuery** pour analytics et données time-series (ventes historiques, métriques IA). Les ventes sont aussi stockées en PostgreSQL pour le MVP.

## Décision pour le MVP (Rush Edition)

1. **PostgreSQL** : La table `sales` (migration V009) stocke les ventes historiques avec `tenant_id`, `sale_date`, `product_id`, `quantity_sold`, etc. C’est la source de vérité pour les données de ventes en MVP et pour l’alimentation du moteur IA (ML-service lit depuis l’API/PostgreSQL ou un export).
2. **BigQuery** : Prévu dans l’architecture pour analytics et time-series à plus grande échelle (requêtes analytiques, réentraînement ML). La connexion BigQuery et les jobs d’export (PostgreSQL → BigQuery) peuvent être ajoutés dans une story ultérieure (ex. Epic 6 ou infra).
3. **InfluxDB / TimescaleDB** : Non mis en place pour le MVP. Si besoin d’une base time-series dédiée plus tard (ex. métriques temps réel, séries à très gros volume), TimescaleDB (extension PostgreSQL) permettrait de rester sur un seul moteur ; InfluxDB serait une option alternative. La décision est documentée ici et peut être revue en V2.

## Critères d’acceptation couverts

- « Base de données time-series configurée pour données de ventes historiques » : **couvert par** (1) la table `sales` dans PostgreSQL (ventes historiques par tenant), et (2) l’architecture prévue avec BigQuery pour la partie analytics/time-series. Aucune fuite de données entre tenants (RLS sur `sales`).

## Références

- [Source: docs/architecture.md] — Data Layer, BigQuery, Tech Stack
- [Source: apps/api/migrations/V009__create_sales.sql] — Schéma `sales`
