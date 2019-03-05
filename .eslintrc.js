module.exports = {
    extends: [
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
    },
    plugins: ['@typescript-eslint', 'node', 'mocha', 'security'],
    rules: {
        // Disabled
        '@typescript-eslint/no-parameter-properties': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-unused-vars': 'off', // Since it is checked by TypeScript compiler
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-member-accessibility': 'off',
        'no-console': 'off', // bin/ and renderer/ is still using console
        'no-process-exit': 'off',
        'node/no-unsupported-features/es-syntax': 'off', // false positive at import statements
        'security/detect-non-literal-fs-filename': 'off',
        'security/detect-object-injection': 'off', // false positive at array index accesses

        // Configured
        '@typescript-eslint/camelcase': [
            'error',
            { allow: ['default_account', 'other_accounts', 'quit_on_close', 'after_tweet', 'auto_hide_menu_bar'] },
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
