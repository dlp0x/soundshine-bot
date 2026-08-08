#!/usr/bin/env node

// ========================================
// scripts/security-check.js
// Vérifications de sécurité pour le déploiement
// ========================================

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔒 Vérifications de sécurité...\n');

let hasErrors = false;

// 1. Vérifier que l'utilisateur n'est pas root
function checkUser () {
  try {
    const user = process.env.USER || process.env.USERNAME;
    const uid = process.getuid ? process.getuid() : null;

    console.log('👤 Vérification de l\'utilisateur courant (détails masqués pour la sécurité)...');

    if (uid === 0) {
      console.error(
        '❌ ERREUR: Vous ne devez PAS exécuter ce bot en tant que root !'
      );
      console.error('   Créez un utilisateur dédié:');
      console.error('   sudo adduser soundshine');
      console.error('   sudo usermod -aG docker soundshine');
      console.error('   sudo su - soundshine');
      hasErrors = true;
      return false;
    }

    if (user === 'root' || user === 'administrator') {
      console.error('❌ ERREUR: Utilisateur système détecté !');
      console.error('   Utilisez un utilisateur dédié pour le bot.');
      hasErrors = true;
      return false;
    }

    console.log('✅ Utilisateur non-root détecté');
    return true;
  } catch (error) {
    console.error(
      '❌ Erreur lors de la vérification utilisateur:',
      error.message
    );
    hasErrors = true;
    return false;
  }
}

// 2. Vérifier les permissions des fichiers sensibles
function checkFilePermissions () {
  const sensitiveFiles = ['.env', 'config.json', 'data/', 'logs/'];

  console.log('\n📁 Vérification des permissions des fichiers...');

  for (const file of sensitiveFiles) {
    if (fs.existsSync(file)) {
      try {
        const stats = fs.statSync(file);
        const mode = stats.mode.toString(8);

        // Vérifier que les fichiers ne sont pas trop permissifs
        if (mode.endsWith('777') || mode.endsWith('666')) {
          console.warn(`⚠️  Fichier trop permissif: ${file} (${mode})`);
          console.warn(`   Recommandé: chmod 600 ${file}`);
        } else {
          console.log(`✅ ${file} - Permissions OK (${mode})`);
        }
      } catch (error) {
        console.error(`❌ Erreur lecture ${file}:`, error.message);
      }
    }
  }
}

// 3. Vérifier la présence de Docker
function checkDocker () {
  try {
    console.log('\n🐳 Vérification de Docker...');

    // Vérifier si Docker est installé
    execSync('docker --version', { stdio: 'pipe' });
    console.log('✅ Docker installé');

    // Vérifier si l'utilisateur est dans le groupe docker
    try {
      execSync('docker ps', { stdio: 'pipe' });
      console.log('✅ Utilisateur dans le groupe docker');
    } catch {
      // Intentionally empty: error handled silently
      console.warn('⚠️  Utilisateur pas dans le groupe docker');
      console.warn(
        '   Ajoutez l\'utilisateur au groupe: sudo usermod -aG docker $USER'
      );
      console.warn('   Puis reconnectez-vous ou exécutez: newgrp docker');
    }
  } catch {
    // Intentionally empty: error handled silently
    console.error('❌ Docker non installé ou non accessible');
    console.error('   Installez Docker: https://docs.docker.com/get-docker/');
    hasErrors = true;
  }
}

// 4. Vérifier les variables d'environnement
function checkEnvironment () {
  console.log('\n🌍 Vérification des variables d\'environnement...');

  const requiredVars = ['BOT_TOKEN', 'CLIENT_ID', 'API_TOKEN'];

  const missing = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    } else {
      console.log(`✅ ${varName} configuré`);
    }
  }

  if (missing.length > 0) {
    console.warn(`⚠️  Variables manquantes: ${missing.join(', ')}`);
    console.warn('   Créez un fichier .env avec ces variables');
  }
}

// 5. Vérifier la structure du projet
function checkProjectStructure () {
  console.log('\n📂 Vérification de la structure du projet...');

  const requiredDirs = ['commands', 'events', 'utils', 'api'];

  for (const dir of requiredDirs) {
    if (fs.existsSync(dir)) {
      console.log(`✅ ${dir}/ existe`);
    } else {
      console.error(`❌ ${dir}/ manquant`);
      hasErrors = true;
    }
  }
}

// 6. Recommandations de sécurité
function showSecurityRecommendations () {
  console.log('\n🔐 Recommandations de sécurité:');
  console.log('   1. Utilisez un utilisateur dédié (ex: soundshine)');
  console.log('   2. Limitez les permissions des fichiers sensibles');
  console.log('   3. Utilisez des secrets pour les tokens');
  console.log('   4. Activez le firewall (ufw/iptables)');
  console.log('   5. Mettez à jour régulièrement le système');
  console.log('   6. Surveillez les logs pour détecter les intrusions');
  console.log('   7. Faites des sauvegardes régulières');
}

// Exécution des vérifications
function main () {
  console.log('🚀 soundSHINE Bot - Vérifications de sécurité\n');

  checkUser();
  checkFilePermissions();
  checkDocker();
  checkEnvironment();
  checkProjectStructure();
  showSecurityRecommendations();

  console.log(`\n${'='.repeat(50)}`);

  if (hasErrors) {
    console.error(
      '❌ Vérifications échouées ! Corrigez les erreurs avant de continuer.'
    );
    process.exit(1);
  } else {
    console.log('✅ Toutes les vérifications de sécurité sont passées !');
    console.log('   Vous pouvez maintenant démarrer le bot en toute sécurité.');
  }
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as securityCheck };

