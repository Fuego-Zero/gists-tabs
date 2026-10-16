import react from '@fuego0/configs/react';

export default [
  {
    ignores: [
      '.output/**',
      '.wxt/**',
      'node_modules/**',
      'build/**',
      '.tmp/**',
      'src/data/mock/**',
      'src/storage/snapshotCache.test.ts',
      'src/storage/initialCanvas.test.ts',
    ],
  },
  ...react,
  {
    languageOptions: {
      globals: {
        chrome: 'readonly',
      },
    },
    rules: {
      // 预设按新代码收紧。下列规则与现有扩展实现冲突，这次迁移不改这些行为。
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
      'no-plusplus': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'default-case': 'off',
      'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'import-x/no-named-as-default-member': 'off',
      'no-await-in-loop': 'off',
      'no-empty-function': 'off',
      'prefer-destructuring': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-x/no-forward-ref': 'off',
    },
  },
];
