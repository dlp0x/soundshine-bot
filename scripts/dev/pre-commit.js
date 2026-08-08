#!/usr/bin/env node

import { execSync } from 'child_process';
import chalk from 'chalk';

// Configuration des variables d'environnement de test
const testEnv = {
  NODE_ENV: 'test',
  DISCORD_TOKEN: 'test-token',
  CLIENT_ID: 'test-client-id',
  API_PORT: '3000',
  BOT_TOKEN: 'test-bot-token',
  UNSPLASH_ACCESS_KEY: 'test-unsplash-key',
  STREAM_URL: 'test-stream-url',
  JSON_URL: 'test-json-url',
  ADMIN_ROLE_ID: 'test-admin-role',
  VOICE_CHANNEL_ID: 'test-voice-channel',
  PLAYLIST_CHANNEL_ID: 'test-playlist-channel',
  API_TOKEN: 'test-api-token',
  BOT_ROLE_NAME: 'soundSHINE',
  DEV_GUILD_ID: 'test-dev-guild'
};

// Fonction pour exécuter une commande avec gestion d'erreur
function runCommand (command, description, env = {}) {
  console.log(chalk.blue(`🔧 ${description}...`));

  try {
    const fullEnv = { ...process.env, ...env };
    execSync(command, {
      stdio: 'inherit',
      env: fullEnv,
      encoding: 'utf8'
    });
    console.log(chalk.green(`✅ ${description}`));
    return true;
  } catch {
    // Intentionally empty: error handled silently
  }
}

// Fonction principale du pre-commit
async function preCommit () {
  console.log(
    chalk.bold.cyan('\n🚀 Pre-commit Hook - Vérifications automatiques')
  );
  console.log(chalk.gray('='.repeat(50)));

  let allChecksPassed = true;

  // Vérifications rapides (pas de tests complets pour le pre-commit)

  // 1. Linting
  if (!runCommand('npm run lint', 'Linting')) {
    allChecksPassed = false;
  }

  // 2. Formatage
  if (!runCommand('npm run format:check', 'Vérification formatage')) {
    allChecksPassed = false;
  }

  // 3. Tests unitaires rapides (sans couverture)
  if (!runCommand('npm run test', 'Tests unitaires', testEnv)) {
    allChecksPassed = false;
  }

  // Résultats
  if (allChecksPassed) {
    console.log(chalk.bold.green('\n🎉 Pre-commit réussi ! Commit autorisé.'));
    process.exit(0);
  } else {
    console.log(chalk.bold.red('\n💥 Pre-commit échoué ! Commit refusé.'));
    console.log(chalk.yellow('Corrigez les erreurs et recommencez.'));
    process.exit(1);
  }
}

// Gestion des erreurs
process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('\n❌ Erreur pre-commit:'), reason);
  process.exit(1);
});

// Exécution
preCommit().catch((error) => {
  console.error(chalk.red('\n❌ Erreur fatale pre-commit:'), error);
  process.exit(1);
});

