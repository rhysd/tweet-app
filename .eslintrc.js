module.exports = {
    extends: ['plugin:@typescript-eslint/recommended', 'prettier', 'prettier/@typescript-eslint'],
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
    plugins: ['@typescript-eslint'],
    rules: {
        '@typescript-eslint/no-parameter-properties': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/camelcase': [
            'error',
            { allow: ['default_account', 'other_accounts', 'quit_on_close', 'after_tweet', 'auto_hide_menu_bar'] },
        ],
        '@typescript-eslint/no-unused-vars': 'off', // Since it is checked by TypeScript compiler
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-member-accessibility': 'off',
        'no-console': 'off', // bin/ and renderer/ is still using console
    },
};
