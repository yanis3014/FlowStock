# Infrastructure GCP

Scripts et configurations pour l'infrastructure Google Cloud Platform.

## Prérequis

1. **Google Cloud SDK** installé et configuré
2. **Projet GCP** créé avec billing activé
3. **Authentification** configurée: `gcloud auth login`

## Configuration Initiale

### Option 1: Script Shell (Recommandé)

```bash
chmod +x infrastructure/gcp-setup.sh
./infrastructure/gcp-setup.sh <PROJECT_ID>
```

Le script configure automatiquement:
- ✅ APIs GCP nécessaires
- ✅ Artifact Registry pour images Docker
- ✅ Cloud SQL (PostgreSQL) instance
- ✅ Cloud Storage bucket pour fichiers

### Option 2: Terraform (À venir)

Une configuration Terraform sera disponible pour une gestion plus avancée de l'infrastructure.

## Services Configurés

### Cloud Run
- **API Gateway**: Déployé depuis CI/CD
- **ML Service**: Déployé depuis CI/CD

### Cloud SQL
- **Instance**: `bmad-stock-agent-db`
- **Version**: PostgreSQL 15
- **Région**: europe-west1

### Cloud Storage
- **Bucket**: `{PROJECT_ID}-bmad-stock-agent-files`
- **Usage**: Photos de factures, exports CSV

### Artifact Registry
- **Repository**: `bmad-stock-agent`
- **Format**: Docker
- **Région**: europe-west1

## Secrets Management

Les secrets doivent être configurés dans Secret Manager:

```bash
# Database URL
echo "postgresql://user:password@/dbname" | \
  gcloud secrets create DATABASE_URL --data-file=-

# OpenAI API Key (pour ML service)
echo "sk-..." | \
  gcloud secrets create OPENAI_API_KEY --data-file=-
```

## Variables d'Environnement Cloud Run

Les services Cloud Run nécessitent ces variables:

**API Service:**
- `NODE_ENV=staging` ou `production`
- `DATABASE_URL` (depuis Secret Manager)
- `PORT=3000`

**ML Service:**
- `ENV=staging` ou `production`
- `OPENAI_API_KEY` (depuis Secret Manager)

## Coûts Estimés (MVP)

- **Cloud Run**: ~$0-10/mois (selon trafic)
- **Cloud SQL**: ~$7-10/mois (db-f1-micro)
- **Cloud Storage**: ~$0-1/mois (selon usage)
- **Artifact Registry**: Gratuit jusqu'à 0.5GB

**Total estimé MVP**: ~$10-20/mois

## Maintenance

### Mises à jour de la base de données
```bash
gcloud sql instances patch bmad-stock-agent-db --maintenance-window-day=SUN --maintenance-window-hour=3
```

### Backups

#### Cloud SQL (Production)
Les backups automatiques sont activés par défaut avec:
- **Fréquence**: Quotidienne
- **Rétention**: 7 jours (MVP), 30 jours (production)
- **Point-in-Time Recovery**: Fenêtre de 7 jours

Pour restaurer depuis un backup:
```bash
gcloud sql backups restore BACKUP_ID --backup-instance=bmad-stock-agent-db
```

Pour lister les backups disponibles:
```bash
gcloud sql backups list --instance=bmad-stock-agent-db
```

#### Développement Local
Scripts de backup/restore disponibles dans `infrastructure/scripts/`:

**Backup:**
```bash
# Linux/Mac
chmod +x infrastructure/scripts/backup-db.sh
./infrastructure/scripts/backup-db.sh [backup-name]

# Windows (Git Bash ou WSL)
bash infrastructure/scripts/backup-db.sh [backup-name]
```

**Restore:**
```bash
# Linux/Mac
chmod +x infrastructure/scripts/restore-db.sh
./infrastructure/scripts/restore-db.sh backups/backup_20260128_120000.sql

# Windows (Git Bash ou WSL)
bash infrastructure/scripts/restore-db.sh backups/backup_20260128_120000.sql
```

Les backups sont stockés dans `infrastructure/backups/` par défaut.
