// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
// Local rules that enforce constitution Principle II (no hard-coded UI text), in templates and in tests.
const local = require('./eslint-local-rules');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    plugins: { local },
    rules: {
      'local/no-literal-ui-text': 'error',
      // The appText directive fills the element with managed text, so it counts as content.
      '@angular-eslint/template/elements-content': ['error', { allowList: ['appText'] }],
    },
  },
  {
    files: ['**/*.spec.ts', 'e2e/**/*.ts'],
    plugins: { local },
    rules: {
      'local/no-literal-text-in-tests': 'error',
    },
  },
]);
