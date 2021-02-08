// cucumber.js configuration
let common = [
    "features/**/*.feature",
    "--require step-definitions/*.ts",
    "--format html:" + new Date().toISOString().replace(new RegExp(/[:\\.]/g), "_") + "_report.html"
].join(" ");

module.exports = {
    default: common
};