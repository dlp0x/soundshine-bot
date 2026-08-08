#!/bin/bash

# ========================================
# scripts/setup-security-aliases.sh
# Configuration des alias de sécurité
# ========================================

set -e

BOT_USER="soundshine"
BOT_HOME="/home/$BOT_USER"
BASH_RC="$BOT_HOME/.bashrc"

echo "🔒 Configuration des alias de sécurité..."

# Créer les alias de sécurité
cat >> "$BASH_RC" << 'EOF'

# ========================================
# ALIAS DE SÉCURITÉ - soundSHINE Bot
# ========================================

# Empêcher l'exécution du bot en tant que root
function start-bot() {
    if [ "$EUID" -eq 0 ]; then
        echo "❌ ERREUR: Vous ne pouvez pas démarrer le bot en tant que root !"
        echo ""
        echo "🔐 ACTIONS REQUISES :"
        echo "1. Déconnectez-vous de root :"
        echo "   exit"
        echo ""
        echo "2. Connectez-vous en tant que soundshine :"
        echo "   sudo su - soundshine"
        echo ""
        echo "3. Puis démarrez le bot :"
        echo "   start-bot"
        return 1
    fi
    
    cd /home/soundshine/soundshine-bot
    ./start-bot.sh "$@"
}

# Alias pour le mode développement
function start-bot-dev() {
    start-bot dev
}

# Alias pour arrêter le bot
function stop-bot() {
    if [ "$EUID" -eq 0 ]; then
        echo "❌ ERREUR: Vous ne pouvez pas arrêter le bot en tant que root !"
        return 1
    fi
    
    cd /home/soundshine/soundshine-bot
    docker-compose down || pkill -f "node.*index.js" || echo "Bot arrêté"
}

# Alias pour voir les logs
function bot-logs() {
    if [ "$EUID" -eq 0 ]; then
        echo "❌ ERREUR: Vous ne pouvez pas voir les logs en tant que root !"
        return 1
    fi
    
    cd /home/soundshine/soundshine-bot
    docker-compose logs -f || tail -f logs/app.log
}

# Alias pour redémarrer le bot
function restart-bot() {
    if [ "$EUID" -eq 0 ]; then
        echo "❌ ERREUR: Vous ne pouvez pas redémarrer le bot en tant que root !"
        return 1
    fi
    
    stop-bot
    sleep 2
    start-bot
}

# Alias pour le statut du bot
function bot-status() {
    if [ "$EUID" -eq 0 ]; then
        echo "❌ ERREUR: Vous ne pouvez pas vérifier le statut en tant que root !"
        return 1
    fi
    
    cd /home/soundshine/soundshine-bot
    docker-compose ps || ps aux | grep "node.*index.js" | grep -v grep
}

# Message de bienvenue avec rappel de sécurité
echo "🔒 soundSHINE Bot - Commandes disponibles :"
echo "   start-bot      - Démarrer le bot (production)"
echo "   start-bot-dev  - Démarrer le bot (développement)"
echo "   stop-bot       - Arrêter le bot"
echo "   restart-bot    - Redémarrer le bot"
echo "   bot-logs       - Voir les logs"
echo "   bot-status     - Vérifier le statut"
echo ""

EOF

echo "✅ Alias de sécurité configurés dans $BASH_RC"
echo ""
echo "📋 Pour activer les alias :"
echo "   source $BASH_RC"
echo "   ou"
echo "   reconnectez-vous en tant que $BOT_USER"
echo ""
echo "🔒 Les alias empêchent l'exécution du bot en tant que root" 