#!/usr/bin/env node
/* eslint-disable no-loop-func */

/* eslint-disable no-return-assign */

const { exec: _exec } = require("child_process");
const { readFile } = require("fs/promises");
const { glob } = require("glob");
const { resolve, dirname } = require("path");
const { DataStream } = require("scramjet");
const { promisify } = require("util");
const cwd = resolve(__dirname, "../dist/");
const pkgs = glob.sync("./*/package.json", {
    cwd,
    ignore: "**/node_modules/**"
});
const exec = promisify(_exec);
const repo = process.env.SCRAMJET_PUBLISH_REPO;
const dryRun = process.argv.includes("-n");
const force = process.argv.includes("-f");
const skip = process.argv.includes("-s");
const main = process.argv.includes("-p");
const local = process.argv.includes("-l");

if (main === local || process.argv.includes("-h")) {
    console.error(`Usage: ${process.argv[1]} -p|-l [-nf] <cmd> [...args]`);
    console.error("");
    console.error("Runs a specified scripts in the order of the resolved dependency tree");
    console.error("Repo needs to be specified in SCRAMJET_PUBLISH_REPO env var unless going public");
    console.error("");
    console.error(" -n dry run");
    console.error(" -f ignore errors");
    console.error(" -s skip already published");
    console.error(" -p go public");
    console.error(" -l publish local");
    process.exitCode = 11;
    process.exit();
}

if (!repo && !main) {
    console.error("Repo needs to be specified in SCRAMJET_PUBLISH_REPO env var");
    process.exitCode = 12;
    process.exit();
}

const checkIfPublished = async (repoSwitch, opts, item) => {
    try {
        const out = await exec(`npm view ${repoSwitch} --json ${item.name}@${item.version}`, opts);

        return out.stdout.length > 0;
    } catch (e) {
        return true;
    }
};

// eslint-disable-next-line complexity
(async () => {
    const files = await DataStream.from(pkgs)
        .map(async (x) => [await readFile(x, "utf-8"), x])
        .map(([contents, file]) => ({ file, package: JSON.parse(contents) }))
        .map(({ file, package: { name, version, dependencies } }) => ({
            dependencies,
            version,
            name,
            fullFile: resolve(cwd, file),
            dir: dirname(file)
        }))
        .toArray()
    ;
    const packages = files.map(x => x.name);
    const filesWithDeps = files.map(({ dependencies, ...x }) => ({
        ...x,
        visits: 0,
        deps: dependencies
            ? Object.keys(dependencies).filter(z => packages.includes(z))
            : []
    }));
    const deps = filesWithDeps.reduce((acc, x) => {
        x.deps?.forEach(n => acc[n] = (acc[n] || 0) + 1);
        return acc;
    }, {});

    Object.entries(deps).forEach(([p, v]) => {
        filesWithDeps.find(x => x.name === p).visits = v;
    });
    filesWithDeps.sort((a, b) => {
        if (a.deps.includes(b.name)) return 1;
        if (b.deps.includes(a.name)) return -1;
        return b.visits - a.visits - (a.deps.length - b.deps.length) / 1e6;
    });

    for (const item of filesWithDeps) {
        try {
            const opts = { cwd: dirname(item.fullFile) };
            const repoSwitch = local
                ? `--repository="${repo.replace("\"", "\"'\"'\"")}"`
                : "";

            if (skip && await checkIfPublished(repoSwitch, opts, item)) {
                console.error(" ---> Found in npm: ", item.name, item.version);
                continue;
            }

            console.error(" -=> Publishing", item.name);
            await exec(`npm i --package-lock-only ${repoSwitch}`, opts);
            console.error(" `-> created package-lock.");
            if (dryRun)
                await exec("echo would publish...", opts);
            else {
                await exec(`npm publish ${repoSwitch}`, opts);
                console.error(" ... waiting until new package visible");
                let tries = 120;

                while (--tries > 0) {
                    if (await checkIfPublished(repoSwitch, opts, item)) {
                        break;
                    }
                    process.stderr.write(`\r ... still waiting, tries left: ${tries}`);
                    await new Promise(res => setTimeout(res, 5000));
                }
                console.error("");
                if (!tries)
                    throw new Error("Package still not available after 600 secs");
            }
            console.error(" `-> ops done, waiting until new package visible");
        } catch (e) {
            if (!force)
                throw e;
            else
                console.error(" `-> !!!!!! ops failed for ", item.name);
        }
    }
})()
    .catch(e => {
        console.error(e.stack);
        process.exitCode = e.exitCode || 10;
        process.exit();
    });
