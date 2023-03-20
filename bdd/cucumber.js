const common = [
    "--require step-definitions/**/*.ts",
    "--require-module ts-node/register",
    "--publish-quiet",
    "--exit",
    "--tags \"not @ignore\"",
    "--format @cucumber/pretty-formatter",
    // "--format html:reports/" + new Date().toISOString().replace(new RegExp(/[:\\.]/g), "_") + "_report.html"
].join(" ");

module.exports = {
    default: common
};
