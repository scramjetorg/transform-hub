module.exports = {
    ignorePatterns: [".eslintrc.js", "types.ts"],
    parserOptions:{
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname
    }
};
