module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:node/recommended',
        'plugin:security/recommended',
        'prettier',
        'prettier/@typescript-eslint',
    ],
    env: {
        es6: true,
        node: true,
        browser: true,
        mocha: true,
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module', // Avoid 'Parsing error: ImportDeclaration should appear when the mode is ES6 and in the module context'
    },
    plugins: ['@typescript-eslint', 'node', 'mocha', 'security', 'prettier'],
    rules: {
        // Enabled
        '@typescript-eslint/prefer-for-of': 'error',
        '@typescript-eslint/prefer-string-starts-ends-with': 'error',
        'prettier/prettier': 'error',

        // Disabled
        '@typescript-eslint/no-parameter-properties': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-unused-vars': 'off', // Since it is checked by TypeScript compiler
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-object-literal-type-assertion': 'off', // https://github.com/typescript-eslint/typescript-eslint/issues/166
        '@typescript-eslint/no-empty-function': 'off',
        'no-console': 'off', // bin/ and renderer/ is still using console
        'no-process-exit': 'off',
        'node/no-unsupported-features/es-syntax': 'off', // false positive at import statements
        'node/no-unpublished-import': 'off', // false positive? at spectron and jsdom packages
        'security/detect-non-literal-fs-filename': 'off',
        'security/detect-object-injection': 'off', // false positive at array index accesses
        'node/shebang': 'off', // It complains bin/cli.ts

        // Configured
        '@typescript-eslint/camelcase': [
            'error',
            {
                allow: [
                    // Keys in config.json
                    'default_account',
                    'other_accounts',
                    'quit_on_close',
                    'after_tweet',
                    'auto_hide_menu_bar',
                    'visible_on_all_workspaces',
                ],
            },
        ],

        // Enabled
        'mocha/handle-done-callback': 'error',
        'mocha/no-exclusive-tests': 'error',
        'mocha/no-global-tests': 'error',
        'mocha/no-top-level-hooks': 'error',
        'mocha/no-identical-title': 'error',
        'mocha/no-mocha-arrows': 'error',
        'mocha/no-pending-tests': 'error',
        'mocha/no-skipped-tests': 'error',
        'mocha/no-return-and-callback': 'error',
        'mocha/no-async-describe': 'error',
    },
};
