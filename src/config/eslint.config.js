import js from '@eslint/js';
import globals from 'globals';

export default [
  // Configuration de base pour tous les fichiers JavaScript
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly'
      }
    },
    rules: {
      // Règles de base ESLint
      ...js.configs.recommended.rules,

      // Variables et déclarations
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',

      // Objets et fonctions
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'arrow-spacing': 'error',
      'no-duplicate-imports': 'error',
      'no-useless-rename': 'error',
      'prefer-destructuring': [
        'error',
        {
          array: true,
          object: true
        }
      ],
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'no-useless-constructor': 'error',
      'no-useless-return': 'error',
      'consistent-return': 'off',

      // Contrôle de flux
      'default-case': 'error',
      'eqeqeq': ['error', 'always'],

      // Sécurité
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-throw-literal': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unused-expressions': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-escape': 'error',
      'radix': 'error',
      'yoda': 'error',

      // Nommage
      'camelcase': ['error', { properties: 'never' }],

      // Formatage
      'eol-last': 'error',
      'max-len': ['warn', { code: 120, ignoreUrls: true }],
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
      'no-trailing-spaces': 'error',
      'spaced-comment': ['error', 'always'],
      'unicode-bom': 'error',
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'comma-spacing': ['error', { before: false, after: true }],
      'comma-style': ['error', 'last'],
      'function-paren-newline': ['error', 'consistent'],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'keyword-spacing': ['error', { before: true, after: true }],
      'object-curly-spacing': ['error', 'always'],
      'object-property-newline': [
        'error',
        { allowAllPropertiesOnSameLine: true }
      ],
      'operator-linebreak': ['error', 'before'],
      'padded-blocks': ['error', 'never'],
      'space-before-blocks': 'error',
      'space-before-function-paren': ['error', 'always'],
      'space-in-parens': ['error', 'never'],
      'space-infix-ops': 'error',
      'space-unary-ops': ['error', { words: true, nonwords: false }],
      'wrap-regex': 'error'
    }
  },

  // Configuration spécifique pour les fichiers de test
  {
    files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: {
        ...globals.vitest
      }
    },
    rules: {
      'no-console': 'off',
      'max-len': 'off'
    }
  },

  // Configuration pour les scripts (plus permissive)
  {
    files: ['scripts/**/*.js'],
    rules: {
      'no-console': 'off',
      'max-len': 'off',
      'prefer-const': 'warn',
      'no-unused-vars': 'warn'
    }
  },

  // Fichiers à ignorer
  {
    ignores: [
      'node_modules/**',
      'logs/**',
      '*.log',
      '*.sqlite',
      '*.db',
      '.env*',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.tmp',
      '*.temp'
    ]
  }
];
