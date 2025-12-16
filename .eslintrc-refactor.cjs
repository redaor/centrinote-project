module.exports = {
  extends: ['./.eslintrc.json'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-unused-expressions': 'off',
    'prefer-const': 'off',
    'no-useless-escape': 'off',
    'react-hooks/exhaustive-deps': 'warn'
  }
};
