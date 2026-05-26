const reportFileName = new Date().toISOString().replace(new RegExp(/[:\\.]/g), "_") + "_report.html";
const report = process.env.TEST_REPORT
    ? [ "--format @cucumber/pretty-formatter", "--format html:reports/" + reportFileName ]
    : [ "--format progress" ];

const common = [
    "--require step-definitions/**/*.ts",
    "--require-module ts-node/register",
    "--publish-quiet",
    "--exit",
    "--tags \"not @ignore\"",
    ...report
].join(" ");

module.exports = {
    default: common
};
