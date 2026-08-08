#!/usr/bin/env node

import { getDatabase, disconnectDatabase } from '../../src/utils/bot/database.js';

async function main () {
  await getDatabase();
  await disconnectDatabase();
  console.log('Base SQLite initialisee avec succes.');
}

main().catch((error) => {
  console.error('Echec de l\'initialisation de la base:', error);
  process.exit(1);
});
