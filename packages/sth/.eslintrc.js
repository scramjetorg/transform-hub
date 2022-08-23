module.exports = {
    ignorePatterns: [".eslintrc.js", "postinstall.js"],
    parserOptions:{
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
    }
};
