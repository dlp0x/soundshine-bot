import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const args = process.argv.slice(2);
const outputMarkdown = args.includes('--md') || args.includes('--markdown');
const includeFull = args.includes('--full');

const IGNORED = [
  'node_modules',
  '.git',
  'logs',
  'coverage',
  '.vscode',
  'suggestions.sqlite',
  'z_contexte.txt'
];

const config = {
  projectName: 'soundshine-bot',
  description: 'Bot Discord modulaire pour une webradio communautaire.',
  criticalFiles: [
    'src/index.js',
    'src/bot/config.js',
    'src/bot/events/interactionCreate.js',
    'src/core/services/AppState.js',
    'src/utils/shared/retry.js',
    'src/utils/shared/secureLogger.js'
  ],
  envFiles: ['.env', '.env.dev', '.env.prod'],
  stack: {
    runtime: 'Node.js',
    framework: 'discord.js',
    database: 'better-sqlite3',
    logger: 'custom logger + secure logger',
    validation: 'zod',
    tests: ['vitest'],
    devops: ['eslint', 'github actions']
  }
};

function getTree (dir, depth = 0) {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !IGNORED.includes(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  return entries.flatMap((entry) => {
    const prefix = '  '.repeat(depth);
    const name = entry.isDirectory() ? `[${entry.name}]` : entry.name;
    const fullPath = path.join(dir, entry.name);
    const line = `${prefix}${name}`;

    return entry.isDirectory()
      ? [line, ...getTree(fullPath, depth + 1)]
      : [line];
  });
}

function getStats (root) {
  let totalSize = 0;
  let fileCount = 0;
  let jsCount = 0;
  let tsCount = 0;

  function scan (dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED.includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else {
        const size = fs.statSync(fullPath).size;
        totalSize += size;
        fileCount++;
        if (fullPath.endsWith('.js')) jsCount++;
        if (fullPath.endsWith('.ts')) tsCount++;
      }
    }
  }

  scan(root);

  return {
    fileCount,
    totalSizeKb: (totalSize / 1024).toFixed(2),
    avgSizeKb: fileCount === 0 ? '0.00' : (totalSize / fileCount / 1024).toFixed(2),
    jsCount,
    tsCount
  };
}

function readIfExists (file) {
  const filePath = path.join(projectRoot, file);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
}

function findConfigFiles (fileNames) {
  return fileNames.filter((fileName) => fs.existsSync(path.join(projectRoot, fileName)));
}

function generateContext () {
  const treeOutput = getTree(projectRoot).join('\n');
  const stats = getStats(projectRoot);

  const context = {
    ...config,
    architecture: {
      style: 'modulaire',
      entryPoint: 'src/index.js',
      handlers: ['commands', 'events', 'tasks', 'services', 'api'],
      api: {
        type: 'Express.js',
        routes: ['REST', 'secured middleware']
      },
      appState: 'src/core/services/AppState.js'
    },
    env: {
      envFiles: config.envFiles,
      currentEnv: process.env.NODE_ENV || 'undefined'
    },
    projectTree: treeOutput,
    stats,
    dependencies: {},
    scripts: {},
    configFiles: {}
  };

  const pkg = readIfExists('package.json');
  if (pkg) {
    const parsed = JSON.parse(pkg);
    context.dependencies = parsed.dependencies || {};
    context.devDependencies = parsed.devDependencies || {};
    context.scripts = parsed.scripts || {};
  }

  const configFiles = findConfigFiles([
    'src/config/eslint.config.js',
    'src/config/vitest.config.js',
    '.github/workflows/ci-cd.yml'
  ]);

  configFiles.forEach((file) => {
    const content = readIfExists(file);
    context.configFiles[file] = includeFull && content ? content : '[present]';
  });

  const jsonPath = path.join(projectRoot, 'chatgpt-project-context.json');
  fs.writeFileSync(jsonPath, JSON.stringify(context, null, 2));
  console.log('Export JSON: chatgpt-project-context.json');

  if (outputMarkdown) {
    const markdownPath = path.join(projectRoot, 'chatgpt-project-context.md');
    fs.writeFileSync(markdownPath, generateMarkdown(context));
    console.log('Export Markdown: chatgpt-project-context.md');
  }
}

function generateMarkdown (context) {
  return `# ${context.projectName}

> ${context.description}

## Stack
${Object.entries(context.stack).map(([key, value]) => `- **${key}**: ${Array.isArray(value) ? value.join(', ') : value}`).join('\n')}

## Arborescence
\`\`\`
${context.projectTree}
\`\`\`

## Stats
- Fichiers : ${context.stats.fileCount}
- JS : ${context.stats.jsCount}, TS : ${context.stats.tsCount}
- Taille totale : ${context.stats.totalSizeKb} Ko
- Taille moyenne/fichier : ${context.stats.avgSizeKb} Ko
`;
}

generateContext();
