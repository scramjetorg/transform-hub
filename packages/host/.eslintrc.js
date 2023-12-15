module.exports = {
    ignorePatterns: [".eslintrc.js", "jest.config.js"],
    parserOptions:{
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname
    }
};
