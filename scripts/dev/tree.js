// scripts/tree.js
import fs from 'fs';
import path from 'path';

const IGNORED = [
  'node_modules',
  '.git',
  'logs',
  'coverage',
  '.vscode',
  'suggestions.sqlite',
  'z_contexte.txt'
];

const CONTEXTUAL_FILES = [
  'index.js',
  'core/startup.js',
  'core/bot.js',
  'core/lifecycle.js',
  'api/server.js',
  'api/routes.js',
  'utils/logger.js',
  'utils/errorHandler.js',
  'core/loadFiles.js'
];

const OUTPUT_FILE = 'z_contexte.txt';

function printTree (dirPath, prefix = '') {
  const entries = fs.readdirSync(dirPath).filter(e => !IGNORED.includes(e)).sort();

  let tree = '';
  for (let i = 0; i < entries.length; i++) {
    const name = entries[i];
    const fullPath = path.join(dirPath, name);
    const isLast = i === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    tree += `${prefix}${connector}${name}\n`;

    if (fs.statSync(fullPath).isDirectory()) {
      const extension = isLast ? '    ' : '│   ';
      tree += printTree(fullPath, prefix + extension);
    }
  }

  return tree;
}

function buildContextualSection () {
  let section = '\n\n📂 **Fichiers recommandés pour comprendre le projet**\n';
  section += '──────────────────────────────────────────────\n';

  CONTEXTUAL_FILES.forEach(file => {
    if (fs.existsSync(file)) {
      section += `✅ ${file}\n`;
    } else {
      section += `❌ (manquant) ${file}\n`;
    }
  });

  return section;
}

function run () {
  const rootPath = process.cwd();
  let output = '🧠 Structure du projet :\n───────────────────────────\n';
  output += printTree(rootPath);
  output += buildContextualSection();

  fs.writeFileSync(path.join(rootPath, OUTPUT_FILE), output);
  console.log(`✅ Fichier ${OUTPUT_FILE} généré avec succès.`);
}

run();
