module.exports = {
  extends: ['next/core-web-vitals'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/no-unescaped-entities': 'off',
    '@next/next/no-img-element': 'off',
    'react-hooks/exhaustive-deps': 'off',
  },
};
