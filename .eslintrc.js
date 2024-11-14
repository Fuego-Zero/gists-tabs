module.exports = {
  extends: [require.resolve('@yfsdk/configs/src/reactTSX')],
  ignorePatterns: ['tailwind.config.cjs'],
  rules: {
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    'global-require': 0,
  },
  globals: {
    chrome: 'readonly',
  },
};
