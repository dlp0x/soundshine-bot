#!/bin/bash

# ========================================
# scripts/setup-user.sh
# Script de création d'utilisateur dédié pour soundSHINE Bot
# ========================================

set -e

USERNAME="soundshine"
GROUP_NAME="soundshine"
HOME_DIR="/home/$USERNAME"
PROJECT_DIR="$HOME_DIR/soundshine-bot"

echo "🚀 Configuration de l'utilisateur dédié pour soundSHINE Bot"
echo "=================================================="

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root (sudo)"
    echo "   Usage: sudo bash scripts/setup-user.sh"
    exit 1
fi

# 1. Créer l'utilisateur et le groupe
echo "👤 Création de l'utilisateur $USERNAME..."

if id "$USERNAME" &>/dev/null; then
    echo "⚠️  L'utilisateur $USERNAME existe déjà"
else
    useradd -m -s /bin/bash -d "$HOME_DIR" "$USERNAME"
    echo "✅ Utilisateur $USERNAME créé"
fi

# 2. Créer le groupe si nécessaire
if getent group "$GROUP_NAME" >/dev/null 2>&1; then
    echo "⚠️  Le groupe $GROUP_NAME existe déjà"
else
    groupadd "$GROUP_NAME"
    echo "✅ Groupe $GROUP_NAME créé"
fi

# 3. Ajouter l'utilisateur aux groupes nécessaires
echo "🔧 Configuration des groupes..."

# Groupe docker
if getent group docker >/dev/null 2>&1; then
    usermod -aG docker "$USERNAME"
    echo "✅ Utilisateur ajouté au groupe docker"
else
    echo "⚠️  Le groupe docker n'existe pas (Docker non installé ?)"
fi

# Groupe soundshine
usermod -aG "$GROUP_NAME" "$USERNAME"
echo "✅ Utilisateur ajouté au groupe $GROUP_NAME"

# 4. Créer les répertoires nécessaires
echo "📁 Création des répertoires..."

mkdir -p "$PROJECT_DIR"
mkdir -p "$HOME_DIR/logs"
mkdir -p "$HOME_DIR/data"
mkdir -p "$HOME_DIR/backups"

# 5. Définir les permissions
echo "🔐 Configuration des permissions..."

chown -R "$USERNAME:$GROUP_NAME" "$HOME_DIR"
chmod 755 "$HOME_DIR"
chmod 755 "$PROJECT_DIR"
chmod 755 "$HOME_DIR/logs"
chmod 755 "$HOME_DIR/data"
chmod 700 "$HOME_DIR/backups"

# 6. Créer le fichier .env template
ENV_FILE="$PROJECT_DIR/.env.example"
if [ ! -f "$ENV_FILE" ]; then
    cat > "$ENV_FILE" << EOF
# ========================================
# Configuration soundSHINE Bot
# ========================================

# Discord Configuration
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here

# API Configuration
API_TOKEN=your_api_token_here
ADMIN_API_KEY=your_admin_api_key_here

# Discord Channels
VOICE_CHANNEL_ID=your_voice_channel_id_here
PLAYLIST_CHANNEL_ID=your_playlist_channel_id_here

# External Services
UNSPLASH_ACCESS_KEY=your_unsplash_key_here
STREAM_URL=your_stream_url_here
JSON_URL=your_json_url_here

# Bot Configuration
BOT_ROLE_NAME=soundSHINE
DEV_GUILD_ID=your_dev_guild_id_here

# Server Configuration
API_PORT=3000
NODE_ENV=production
LOG_LEVEL=info
EOF
    echo "✅ Fichier .env.example créé"
fi

# 7. Créer le script de démarrage
STARTUP_SCRIPT="$HOME_DIR/start-bot.sh"
cat > "$STARTUP_SCRIPT" << 'EOF'
#!/bin/bash

# Script de démarrage du bot soundSHINE
cd /home/soundshine/soundshine-bot

# Vérifications de sécurité
npm run security:check

# Démarrage du bot
if [ "$1" = "dev" ]; then
    echo "🚀 Démarrage en mode développement..."
    npm run dev
else
    echo "🚀 Démarrage en mode production..."
    npm start
fi
EOF

chmod +x "$STARTUP_SCRIPT"
chown "$USERNAME:$GROUP_NAME" "$STARTUP_SCRIPT"
echo "✅ Script de démarrage créé: $STARTUP_SCRIPT"

# 7.5. Configurer les alias pratiques
echo "🔧 Configuration des alias pratiques..."
BASH_RC="$HOME_DIR/.bashrc"

cat >> "$BASH_RC" << 'EOF'

# ========================================
# ALIAS PRATIQUES - soundSHINE Bot
# ========================================

# Démarrer le bot
function start-bot() {
    cd /home/soundshine/soundshine-bot
    ./start-bot.sh "$@"
}

# Démarrer en mode développement
function start-bot-dev() {
    start-bot dev
}

# Arrêter le bot
function stop-bot() {
    cd /home/soundshine/soundshine-bot
    docker-compose down || pkill -f "node.*index.js" || echo "Bot arrêté"
}

# Voir les logs
function bot-logs() {
    cd /home/soundshine/soundshine-bot
    docker-compose logs -f || tail -f logs/app.log
}

# Redémarrer le bot
function restart-bot() {
    stop-bot
    sleep 2
    start-bot
}

# Vérifier le statut
function bot-status() {
    cd /home/soundshine/soundshine-bot
    docker-compose ps || ps aux | grep "node.*index.js" | grep -v grep
}

# Message de bienvenue
echo "🚀 soundSHINE Bot - Commandes disponibles :"
echo "   start-bot      - Démarrer le bot (production)"
echo "   start-bot-dev  - Démarrer le bot (développement)"
echo "   stop-bot       - Arrêter le bot"
echo "   restart-bot    - Redémarrer le bot"
echo "   bot-logs       - Voir les logs"
echo "   bot-status     - Vérifier le statut"
echo ""

EOF

echo "✅ Alias pratiques configurés"

# 8. Créer le service systemd (optionnel)
SERVICE_FILE="/etc/systemd/system/soundshine-bot.service"
if [ ! -f "$SERVICE_FILE" ]; then
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=soundSHINE Discord Bot
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=$USERNAME
Group=$GROUP_NAME
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

# Sécurité
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$PROJECT_DIR $HOME_DIR/logs $HOME_DIR/data

[Install]
WantedBy=multi-user.target
EOF
    echo "✅ Service systemd créé: $SERVICE_FILE"
    echo "   Pour activer: sudo systemctl enable soundshine-bot"
    echo "   Pour démarrer: sudo systemctl start soundshine-bot"
fi

# 9. Instructions finales
echo ""
echo "🎉 Configuration terminée !"
echo "=========================="
echo ""
echo "📋 Prochaines étapes:"
echo "1. Copiez le code du bot dans: $PROJECT_DIR"
echo "2. Configurez le fichier .env:"
echo "   cp $PROJECT_DIR/.env.example $PROJECT_DIR/.env"
echo "   nano $PROJECT_DIR/.env"
echo ""
echo "3. Installez les dépendances:"
echo "   sudo su - $USERNAME"
echo "   cd $PROJECT_DIR"
echo "   npm install"
echo ""
echo "4. Testez le démarrage:"
echo "   $STARTUP_SCRIPT"
echo ""
echo "5. Ou utilisez le service systemd:"
echo "   sudo systemctl enable soundshine-bot"
echo "   sudo systemctl start soundshine-bot"
echo ""
echo "🔒 Sécurité:"
echo "- L'utilisateur $USERNAME ne peut pas exécuter sudo"
echo "- Les fichiers sensibles sont protégés"
echo "- Le bot s'exécute avec des permissions minimales"
echo ""
echo "📞 Support:"
echo "- Logs: $HOME_DIR/logs/"
echo "- Données: $HOME_DIR/data/"
echo "- Sauvegardes: $HOME_DIR/backups/" 