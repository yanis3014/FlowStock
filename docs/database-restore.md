# Restauration des sauvegardes base de données (Story 1.2)

## Sauvegardes automatiques

- **Développement / on-premise** : exécuter un backup quotidien via cron en utilisant le script `scripts/backup-database.sh` et un répertoire dédié (ex. `/backups`). Exemple : voir `scripts/cron-backup.example`. Exemple cron : `0 2 * * * /path/to/scripts/backup-database.sh /backups`
- **GCP Cloud SQL** : activer les **backups automatiques** dans la console Cloud SQL (sauvegardes quotidiennes, rétention configurable). La restauration se fait depuis la console (point-in-time ou backup complet).
- **Windows** : le script est en bash. Exécuter via WSL, Git Bash, ou utiliser `pg_dump` directement en PowerShell avec les mêmes variables (`DATABASE_URL` ou `POSTGRES_*`, voir `.env.example`).

## Restauration à partir d’un fichier pg_dump

1. Créer un fichier de backup (si besoin) :
   ```bash
   ./scripts/backup-database.sh ./backups
   ```
   Ceci produit `./backups/bmad_stock_agent_YYYYMMDD_HHMMSS.sql.gz`.

2. Décompresser (si le fichier est en .gz) :
   ```bash
   gunzip -k backups/bmad_stock_agent_YYYYMMDD_HHMMSS.sql.gz
   ```

3. Restaurer dans une base **vide** ou une base dédiée (la restauration écrase les objets existants si les noms correspondent) :
   ```bash
   # Avec DATABASE_URL
   psql "$DATABASE_URL" -f backups/bmad_stock_agent_YYYYMMDD_HHMMSS.sql

   # Ou avec variables POSTGRES_*
   PGHOST=localhost PGPORT=5432 PGUSER=bmad PGPASSWORD=... PGDATABASE=bmad_stock_agent \
     psql -f backups/bmad_stock_agent_YYYYMMDD_HHMMSS.sql
   ```

4. Vérifier les migrations : après une restauration, la table `schema_migrations` reflète l’état au moment du backup. Pour un environnement propre, vous pouvez réappliquer les migrations sur une base vide plutôt que de restaurer un dump.

## Restauration Cloud SQL (GCP)

- Dans la console GCP : Cloud SQL → votre instance → Backups → choisir un backup → Restore.
- La restauration crée une **nouvelle** instance ou restaure à un point dans le temps selon la configuration. Prévoir une fenêtre de maintenance.

## Références

- [Source: scripts/backup-database.sh] — Script de backup
- [Source: .env.example] — Variables DATABASE_URL / POSTGRES_*
