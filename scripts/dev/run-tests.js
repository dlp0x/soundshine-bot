#!/usr/bin/env node

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log (message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand (command, description) {
  log(`\n${description}...`, 'cyan');

  try {
    execSync(command, {
      cwd: projectRoot,
      stdio: 'inherit',
      encoding: 'utf8'
    });
    log(`${description} completed successfully`, 'green');
    return true;
  } catch {
    return false;
  }
}

function runTestSuite (suiteName, command, description) {
  log(`\n=== ${suiteName} ===`, 'magenta');
  return runCommand(command, description);
}

async function main () {
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';

  log('SoundShine Bot Test Runner', 'bright');
  log(`Running tests: ${testType}`, 'yellow');

  const results = {
    lint: false,
    unit: false,
    integration: false,
    performance: false,
    stress: false,
    coverage: false
  };

  try {
    if (testType === 'all' || testType === 'lint') {
      results.lint = runTestSuite('Linting', 'npm run lint', 'ESLint check');
    }

    if (testType === 'all' || testType === 'unit') {
      results.unit = runTestSuite('Unit Tests', 'npm test', 'Unit tests');
    }

    if (testType === 'all' || testType === 'integration') {
      results.integration = runTestSuite(
        'Integration Tests',
        'npm run test:integration',
        'Integration tests'
      );
    }

    if (testType === 'all' || testType === 'performance') {
      results.performance = runTestSuite(
        'Performance Tests',
        'npm run test:performance',
        'Performance tests'
      );
    }

    if (testType === 'all' || testType === 'stress') {
      results.stress = runTestSuite(
        'Stress Tests',
        'npm run test:stress',
        'Stress tests'
      );
    }

    if (testType === 'all' || testType === 'coverage') {
      results.coverage = runTestSuite(
        'Coverage Tests',
        'npm run test:coverage',
        'Coverage tests'
      );
    }

    if (testType === 'all' || testType === 'format') {
      log('\nFormat check skipped: no formatter script is configured.', 'yellow');
    }

    log('\nTest Results Summary:', 'cyan');

    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(Boolean).length;

    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? 'PASS' : 'FAIL';
      log(`${status} ${test}`, passed ? 'green' : 'red');
    });

    log(
      `\nOverall: ${passedTests}/${totalTests} test suites passed`,
      passedTests === totalTests ? 'green' : 'red'
    );

    if (passedTests === totalTests) {
      log('\nAll test suites passed.', 'green');
      process.exit(0);
    }

    log('\nSome test suites failed.', 'yellow');
    process.exit(1);
  } catch (error) {
    log(`\nTest runner encountered an error: ${error.message}`, 'red');
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  log('\nTest runner interrupted by user', 'yellow');
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('\nTest runner terminated', 'yellow');
  process.exit(1);
});

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log('SoundShine Bot Test Runner', 'bright');
  log('\nUsage: node scripts/dev/run-tests.js [test-type]', 'yellow');
  log('\nAvailable test types:', 'yellow');
  log('  all          - Run all tests (default)');
  log('  lint         - Run ESLint only');
  log('  unit         - Run unit tests only');
  log('  integration  - Run integration tests only');
  log('  performance  - Run performance tests only');
  log('  stress       - Run stress tests only');
  log('  coverage     - Run coverage tests only');
  log('  format       - Show formatter status');
  process.exit(0);
}

main().catch((error) => {
  log(`\nUnexpected error: ${error.message}`, 'red');
  process.exit(1);
});
