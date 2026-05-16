import nextVitals from 'eslint-config-next/core-web-vitals'

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'build/**',
      'next-env.d.ts',
      'node_modules/**',
      'out/**',
    ],
  },
  ...nextVitals,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
    },
  },
]

export default eslintConfig
