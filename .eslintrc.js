module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:node/recommended',
        'plugin:security/recommended',
        'prettier',
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
    plugins: ['@typescript-eslint', 'node', 'security'],
    rules: {
        // Enabled
        '@typescript-eslint/prefer-for-of': 'error',
        '@typescript-eslint/prefer-string-starts-ends-with': 'error',
        '@typescript-eslint/no-unnecessary-type-arguments': 'error',
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/no-empty-interface': 'error',
        '@typescript-eslint/restrict-plus-operands': 'error',
        '@typescript-eslint/no-extra-non-null-assertion': 'error',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/ban-ts-comment': [
            'error',
            {
                'ts-ignore': true,
                'ts-nocheck': true,
            },
        ],
        '@typescript-eslint/prefer-includes': 'error',
        '@typescript-eslint/prefer-for-of': 'error',
        '@typescript-eslint/prefer-string-starts-ends-with': 'error',
        '@typescript-eslint/prefer-readonly': 'error',
        '@typescript-eslint/prefer-ts-expect-error': 'error',
        '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
        '@typescript-eslint/switch-exhaustiveness-check': 'error',
        '@typescript-eslint/no-duplicate-imports': 'error',
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/no-confusing-void-expression': 'error',
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/no-import-type-side-effects': 'error',
        eqeqeq: 'error',

        // Disabled
        '@typescript-eslint/no-parameter-properties': 'off',
        '@typescript-eslint/no-unused-vars': 'off', // Since it is checked by TypeScript compiler
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-object-literal-type-assertion': 'off', // https://github.com/typescript-eslint/typescript-eslint/issues/166
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        'no-console': 'off', // bin/ and renderer/ is still using console
        'no-process-exit': 'off',
        'node/no-unsupported-features/es-syntax': 'off', // false positive at import statements
        'node/no-unpublished-import': 'off', // false positive? at spectron and jsdom packages
        'security/detect-non-literal-fs-filename': 'off',
        'security/detect-object-injection': 'off', // false positive at array index accesses
        'node/shebang': 'off', // It complains bin/cli.ts
        'no-unused-vars': 'off', // For @typescript-eslint/no-unused-vars
    },
    overrides: [
        {
            files: ['test/**/*.ts'],
            plugins: ['mocha'],
            extends: ['plugin:mocha/recommended'],
            rules: {
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
                '@typescript-eslint/no-var-requires': 'off',
                '@typescript-eslint/explicit-function-return-type': 'off',
                '@typescript-eslint/consistent-type-imports': 'off',
            },
        },
    ],
};
