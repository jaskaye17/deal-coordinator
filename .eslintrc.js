module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': 'error',
  },
  overrides: [
    {
      files: ['apps/api/**/*.ts'],
      rules: {
        // Nest constructor DI uses emitDecoratorMetadata; `import type` for injectable
        // classes strips runtime references and breaks provider resolution.
        '@typescript-eslint/consistent-type-imports': 'off',
      },
    },
  ],
  ignorePatterns: ['dist', 'node_modules', '.next', '.turbo', '*.js', '!.eslintrc.js'],
};
