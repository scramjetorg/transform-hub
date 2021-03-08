let common = [
    "features/**/*.feature",
    "--require step-definitions/**/*.ts",
    "--require-module ts-node/register",
    "--publish-quiet",
    "--exit",
    "--tags \"not @ignore\"",
    "--format html:" + new Date().toISOString().replace(new RegExp(/[:\\.]/g), "_") + "_report.html"
].join(" ");

module.exports = {
    default: common
};
