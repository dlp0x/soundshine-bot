// core/bootstrap/appInfo.js
//
// Tiny shared helper used by every entrypoint (the monolith `src/index.js`
// as well as the split `src/bot/main.js` / `src/api/main.js`) so they all
// read package.json and log a consistent startup banner the same way.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.resolve(__dirname, '../../../package.json');

export const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

/**
 * @param {{ info: Function }} logger
 * @param {{ NODE_ENV: string }} config
 * @param {string} processName - human-readable name of the running process
 */
export function logStartupBanner (logger, config, processName) {
  logger.info(`Processus: ${processName}`);
  logger.info(`Version: ${pkg.version}`);
  logger.info(`Node.js: ${process.version}`);
  logger.info(`Environnement: ${config.NODE_ENV}`);
}
