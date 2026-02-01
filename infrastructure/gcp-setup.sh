#!/bin/bash
# Script de configuration de l'infrastructure GCP pour BMAD Stock Agent
# Usage: ./infrastructure/gcp-setup.sh <PROJECT_ID>

set -e

PROJECT_ID=$1
REGION="europe-west1"
ARTIFACT_REGISTRY="bmad-stock-agent"

if [ -z "$PROJECT_ID" ]; then
    echo "Usage: $0 <PROJECT_ID>"
    exit 1
fi

echo "🚀 Configuration de l'infrastructure GCP pour le projet: $PROJECT_ID"

# Définir le projet GCP
gcloud config set project $PROJECT_ID

# Activer les APIs nécessaires
echo "📦 Activation des APIs GCP..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    storage-component.googleapis.com \
    artifactregistry.googleapis.com \
    logging.googleapis.com \
    monitoring.googleapis.com \
    secretmanager.googleapis.com

# Créer Artifact Registry pour les images Docker
echo "🐳 Création de l'Artifact Registry..."
gcloud artifacts repositories create $ARTIFACT_REGISTRY \
    --repository-format=docker \
    --location=$REGION \
    --description="Docker images for BMAD Stock Agent" \
    || echo "Artifact Registry existe déjà"

# Créer Cloud SQL instance (PostgreSQL)
echo "🗄️  Création de l'instance Cloud SQL (PostgreSQL)..."
gcloud sql instances create bmad-stock-agent-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=$REGION \
    --root-password=changeme \
    --storage-type=SSD \
    --storage-size=10GB \
    || echo "Instance Cloud SQL existe déjà"

# Créer la base de données
echo "📊 Création de la base de données..."
gcloud sql databases create bmad_stock_agent \
    --instance=bmad-stock-agent-db \
    || echo "Base de données existe déjà"

# Créer Cloud Storage bucket pour les fichiers
echo "📦 Création du bucket Cloud Storage..."
gsutil mb -p $PROJECT_ID -l $REGION gs://$PROJECT_ID-bmad-stock-agent-files \
    || echo "Bucket existe déjà"

# Configurer les permissions du bucket
gsutil iam ch allUsers:objectViewer gs://$PROJECT_ID-bmad-stock-agent-files \
    || echo "Permissions déjà configurées"

echo "✅ Infrastructure GCP configurée avec succès!"
echo ""
echo "📝 Prochaines étapes:"
echo "1. Configurer les secrets dans Secret Manager:"
echo "   gcloud secrets create DATABASE_URL --data-file=-"
echo "2. Mettre à jour les mots de passe de la base de données"
echo "3. Configurer les variables d'environnement pour Cloud Run"
