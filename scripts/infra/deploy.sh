#!/bin/bash

# ========================================
# scripts/deploy.sh
# Script de déploiement Docker pour soundSHINE Bot
# ========================================

set -e

# Configuration (à adapter selon votre serveur)
SERVER_USER="soundshine"
SERVER_HOST="your-server.com"
SERVER_PATH="/home/soundshine/soundshine-bot"
DOCKER_IMAGE="soundshine-bot"
DOCKER_TAG="latest"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERREUR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCÈS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[ATTENTION]${NC} $1"
}

# Vérifications pré-déploiement
check_prerequisites() {
    log "🔍 Vérifications pré-déploiement..."
    
    # Vérifier que Docker est installé localement
    if ! command -v docker &> /dev/null; then
        error "Docker n'est pas installé localement"
    fi
    
    # Vérifier la connexion SSH
    if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_HOST" exit 2>/dev/null; then
        error "Impossible de se connecter au serveur $SERVER_HOST"
    fi
    
    # Vérifier que les variables d'environnement sont définies
    if [ -z "$BOT_TOKEN" ] || [ -z "$CLIENT_ID" ]; then
        warning "Variables d'environnement manquantes (BOT_TOKEN, CLIENT_ID)"
        warning "Assurez-vous qu'elles sont configurées sur le serveur"
    fi
    
    success "Vérifications pré-déploiement OK"
}

# Build de l'image Docker
build_image() {
    log "🔨 Build de l'image Docker..."
    
    docker build -t "$DOCKER_IMAGE:$DOCKER_TAG" . || error "Échec du build Docker"
    
    success "Image Docker buildée: $DOCKER_IMAGE:$DOCKER_TAG"
}

# Sauvegarde de la base de données
backup_database() {
    log "💾 Sauvegarde de la base de données..."
    
    ssh "$SERVER_USER@$SERVER_HOST" "
        cd $SERVER_PATH
        if [ -f data/bot.db ]; then
            cp data/bot.db data/bot.db.backup.\$(date +%Y%m%d_%H%M%S)
            echo 'Sauvegarde créée'
        else
            echo 'Aucune base de données à sauvegarder'
        fi
    " || warning "Échec de la sauvegarde (non critique)"
}

# Déploiement sur le serveur
deploy_to_server() {
    log "🚀 Déploiement sur le serveur..."
    
    # 1. Sauvegarder l'image Docker
    docker save "$DOCKER_IMAGE:$DOCKER_TAG" | gzip > /tmp/soundshine-bot.tar.gz
    
    # 2. Transférer l'image
    log "📤 Transfert de l'image Docker..."
    scp /tmp/soundshine-bot.tar.gz "$SERVER_USER@$SERVER_HOST:/tmp/"
    
    # 3. Transférer les fichiers de configuration
    log "📤 Transfert des fichiers de configuration..."
    rsync -avz --exclude node_modules --exclude .git --exclude logs --exclude data \
        . "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/"
    
    # 4. Déployer sur le serveur
    ssh "$SERVER_USER@$SERVER_HOST" "
        cd $SERVER_PATH
        
        # Charger l'image Docker
        docker load < /tmp/soundshine-bot.tar.gz
        rm /tmp/soundshine-bot.tar.gz
        
        # Arrêter l'ancien conteneur
        docker-compose down || true
        
        # Démarrer le nouveau conteneur
        docker-compose up -d
        
        # Vérifier le statut
        sleep 5
        docker-compose ps
    " || error "Échec du déploiement"
    
    # Nettoyer l'image locale
    rm /tmp/soundshine-bot.tar.gz
    
    success "Déploiement terminé"
}

# Vérification post-déploiement
verify_deployment() {
    log "🔍 Vérification post-déploiement..."
    
    # Attendre que le service soit prêt
    sleep 10
    
    # Vérifier le statut du conteneur
    ssh "$SERVER_USER@$SERVER_HOST" "
        cd $SERVER_PATH
        docker-compose ps
        docker-compose logs --tail=20
    "
    
    # Vérifier l'endpoint de santé
    if curl -f -s "http://$SERVER_HOST:3000/health" > /dev/null; then
        success "Service accessible et fonctionnel"
    else
        warning "Service non accessible immédiatement (peut prendre quelques secondes)"
    fi
}

# Notification Discord
notify_discord() {
    local status="$1"
    local message="$2"
    
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        log "📢 Envoi de notification Discord..."
        
        curl -H "Content-Type: application/json" \
             -X POST \
             -d "{
                 \"embeds\": [{
                     \"title\": \"🚀 Déploiement soundSHINE Bot\",
                     \"description\": \"$message\",
                     \"color\": $(if [ "$status" = "success" ]; then echo "3066993"; else echo "15158332"; fi),
                     \"fields\": [
                         {
                             \"name\": \"Serveur\",
                             \"value\": \"$SERVER_HOST\",
                             \"inline\": true
                         },
                         {
                             \"name\": \"Image\",
                             \"value\": \"$DOCKER_IMAGE:$DOCKER_TAG\",
                             \"inline\": true
                         },
                         {
                             \"name\": \"Timestamp\",
                             \"value\": \"$(date -u +'%Y-%m-%d %H:%M:%S UTC')\",
                             \"inline\": true
                         }
                     ]
                 }]
             }" \
             "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1 || warning "Échec de l'envoi de notification Discord"
    fi
}

# Fonction principale
main() {
    local start_time=$(date +%s)
    
    log "🚀 Début du déploiement soundSHINE Bot"
    log "Serveur: $SERVER_HOST"
    log "Utilisateur: $SERVER_USER"
    log "Chemin: $SERVER_PATH"
    
    # Vérifications
    check_prerequisites
    
    # Déploiement
    build_image
    backup_database
    deploy_to_server
    verify_deployment
    
    # Calcul du temps
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    success "Déploiement terminé en ${duration} secondes"
    
    # Notification de succès
    notify_discord "success" "✅ Déploiement réussi en ${duration}s"
    
    log "🎉 Le bot soundSHINE est maintenant en ligne !"
}

# Gestion des erreurs
trap 'error "Déploiement interrompu"' INT TERM

# Exécution
main "$@" 