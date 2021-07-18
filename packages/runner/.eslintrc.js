module.exports = {
    ignorePatterns: [".eslintrc.js"],
    parserOptions:{
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname
    },
    rules: {
        "no-console": ["error", { allow: ["warn", "error"] }]
    }
};
