const reportFileName = new Date().toISOString().replace(new RegExp(/[:\\.]/g), "_") + "_report.html";
const report = process.env.TEST_REPORT
    ? [ "--format @cucumber/pretty-formatter", "--format html:reports/" + reportFileName ]
    : [ "--format progress" ];
const includeHarnessSelftest = ["1", "true"].includes(String(process.env.BDD_INCLUDE_HARNESS_SELFTEST).toLowerCase());
const tags = includeHarnessSelftest
    ? "not @ignore"
    : "not @ignore and not @harness-selftest";

const common = [
    "--require step-definitions/**/*.ts",
    "--require-module ts-node/register",
    "--publish-quiet",
    "--exit",
    `--tags "${tags}"`,
    ...report
].join(" ");

module.exports = {
    default: common
};
