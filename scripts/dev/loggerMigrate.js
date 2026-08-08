// ========================================
// utils/loggerMigration.js - Migration vers le système unifié
// ========================================
import logger from '../../utils/logger.js';

// Redirection des anciens imports pour compatibilité
export const { logInfo } = logger;
export const { logError } = logger;
export const { logWarn } = logger;
export const { logDebug } = logger;

// Redirection des helpers console
export const { sectionStart } = logger;
export const { summary } = logger;
export const { custom } = logger;
export const success = logger.logSuccess;
export const infocmd = logger.logCommand;
export const warn = logger.logWarn;
export const error = logger.logError;

// Export par défaut pour compatibilité
export default logger;

// Message de migration
console.log('\n🔄 Migration vers le système de logging centralisé');
console.log('📝 Les anciens imports continuent de fonctionner');
console.log('🎯 Utilisez maintenant: import logger from "./utils/logger.js"\n');

