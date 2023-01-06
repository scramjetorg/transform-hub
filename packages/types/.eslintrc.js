module.exports = {
    ignorePatterns: [".eslintrc.js", "scripts/*"],
    parserOptions:{
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname
    }
};
