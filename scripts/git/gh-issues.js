#! /usr/bin/env node

import { spawn } from 'child_process';

const [, , title, body] = process.argv;

if (!title) {
  console.error('❌ Titre manquant.');
  process.exit(1);
}

if (!body) {
  console.error('❌ Description manquante.');
  process.exit(1);
}

const projectId = '15';
const owner = 'n3m01726';

function runCmd (cmd, args) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const child = spawn(cmd, args);

    child.stdout.on('data', (data) => (stdout += data.toString().trim()));
    child.stderr.on('data', (data) => (stderr += data.toString().trim()));

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(`Échec (code ${code}) : ${stderr}`);
      }
    });
  });
}

(async () => {
  try {
    console.log('→ Création de l\'issue sur GitHub…');

    // Crée l'issue et garde l'URL depuis la sortie standard
    const output = await runCmd('gh', [
      'issue',
      'create',
      '-t',
      title,
      '-b',
      body
    ]);
    // L'URL est généralement sur la dernière ligne de la sortie
    const lines = output
      .split('\n')
      .filter((l) => l.startsWith('https://github.com/'));
    if (lines.length === 0) {
      console.error('Impossible d’obtenir l’URL de l’issue.');
      process.exit(1);
    }
    const url = lines[lines.length - 1].trim();

    console.log(`✅ Issue créé : ${url}`);

    console.log('→ Association de l\'issue au projet…');

    await runCmd('gh', [
      'project',
      'item-add',
      projectId,
      '--url',
      url,
      '--owner',
      owner
    ]);
    console.log('✅ Issue ajouté au projet.');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
