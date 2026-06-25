//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default [
  ...tanstackConfig,
  {
    plugins: {
      'react-hooks': reactHooks,
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
      // Allow single-letter type params (e.g. Combobox<V>) alongside the
      // default T-prefixed names — matches the production app.
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'typeParameter',
          format: null,
          custom: {
            regex: '^([A-Z]|T[A-Z][A-Za-z]+|Args)$',
            match: true,
          },
        },
      ],
    },
  },
  {
    ignores: ['eslint.config.js', 'prettier.config.js'],
  },
]
