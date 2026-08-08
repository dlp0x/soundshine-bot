#!/bin/bash

# ========================================
# scripts/start-bot.sh
# Script de démarrage pour soundSHINE Bot
# ========================================

set -e

# Configuration
BOT_DIR="/home/soundshine/soundshine-bot"

# Couleurs pour les logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCÈS]${NC} $1"
}

# Vérification de l'environnement
check_environment() {
    log "🌍 Vérification de l'environnement..."
    
    # Vérifier que le répertoire existe
    if [ ! -d "$BOT_DIR" ]; then
        echo "❌ Répertoire du bot introuvable: $BOT_DIR"
        exit 1
    fi
    
    # Vérifier que le fichier .env existe
    if [ ! -f "$BOT_DIR/.env" ]; then
        echo "⚠️  Fichier .env manquant"
        echo "   Créez le fichier: cp $BOT_DIR/.env.example $BOT_DIR/.env"
        echo "   Puis configurez vos variables d'environnement"
        exit 1
    fi
    
    success "✅ Environnement OK"
}

# Vérification des dépendances
check_dependencies() {
    log "📦 Vérification des dépendances..."
    
    # Vérifier Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js n'est pas installé"
        exit 1
    fi
    
    # Vérifier npm
    if ! command -v npm &> /dev/null; then
        echo "❌ npm n'est pas installé"
        exit 1
    fi
    
    success "✅ Dépendances OK"
}

# Démarrage du bot
start_bot() {
    log "🚀 Démarrage du bot soundSHINE..."
    
    # Aller dans le répertoire du bot
    cd "$BOT_DIR"
    
    # Vérifier les dépendances npm
    if [ ! -d "node_modules" ]; then
        log "📦 Installation des dépendances..."
        npm install
    fi
    
    # Mode de démarrage
    if [ "$1" = "dev" ]; then
        log "🔧 Mode développement"
        npm run dev
    else
        log "🏭 Mode production"
        npm start
    fi
}

# Fonction principale
main() {
    echo "🚀 soundSHINE Bot - Démarrage"
    echo "============================="
    echo ""
    
    # Vérifications
    check_environment
    check_dependencies
    
    # Démarrage
    start_bot "$1"
}

# Gestion des erreurs
trap 'echo "❌ Démarrage interrompu"; exit 1' INT TERM

# Exécution
main "$@" 