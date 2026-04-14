import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // SECURITY: Ban dangerouslySetInnerHTML to enforce React's built-in
      // JSX escaping as the sole XSS defense. If HTML rendering is ever
      // needed, use DOMPurify and disable this rule per-line with justification.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message:
            'SECURITY: dangerouslySetInnerHTML is banned. React JSX escaping is the primary XSS defense. Use DOMPurify if raw HTML rendering is absolutely required.',
        },
      ],
    },
  },
])
