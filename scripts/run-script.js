#!/usr/bin/env node

"use strict";

const {
    getPackagesInWorkspace,
    findClosestPackageJSONLocation
} = require("./lib/build-utils");
const minimist = require("minimist");

const { DataStream } = require("scramjet");
const { getDeepDeps } = require("./lib/get-deep-deps");
const { cwd, env } = require("process");
const { getDepTypes } = require("./lib/opts");
const { cpus } = require("os");

const runScript = require("@npmcli/run-script");
const { relative, resolve, join } = require("path");
const { readFile } = require("fs/promises");
const { exec } = require("child_process");

const opts = minimist(process.argv.slice(2), {
    alias: {
        list: "l",
        lax: "L",
        scope: "s",
        threads: "j",
        verbose: "v",
        help: ["h", "?"],
        workspace: "w",
        dependencies: "d",
        root: "r",
        exec: "e",
    },
    default: {
        root: env.WORKSPACE_ROOT || cwd(),
        verbose: !!env.SCRAMJET_VERBOSE,
        build: !env.NO_BUILD,
        dist: !env.NO_COPY_DIST,
        install: !env.NO_INSTALL,
        outdir: env.OUT_DIR || "dist",
        "link-packages": env.LOCAL_PACKAGES,
        "local-copy": env.LOCAL_COPY,
        "flat-packages": env.FLAT_PACKAGES,
        "make-public": env.MAKE_PUBLIC,
    },
    boolean: ["list", "lax", "verbose", "help", "exec"]
});

if (opts.help || !opts._.length && !opts.list) {
    const pName = relative(cwd(), process.argv[1]);
    const spaces = " ".repeat(pName.length);

    console.error("Runs scripts in workspaces");
    console.error(`Usage: ${pName} [options] <script> [...args]`);
    console.error(`       ${spaces} -v,--verbose - verbose output`);
    console.error(`       ${spaces} -L,--lax - succeeds and continues even if any of script fails`);
    console.error(`       ${spaces} -s,--scope <path|name> - run in specific package only`);
    console.error(`       ${spaces} -w,--workspace <name> - workspace filter - default all workspaces`);
    console.error(`       ${spaces} -d,-dependencies <package> - builds dependencies of a package`);
    console.error(`       ${spaces} -l,--list - prints list of dirs and exits`);
    console.error(`       ${spaces} -j,--jobs - how many jobs in parallel (default: cpu count)`);
    console.error(`       ${spaces} -r,--root <root> - main directory (default is cwd, env: WORKSPACE_ROOT)`);
    console.error(`       ${spaces} -e,--exec - treat <script> as a full command to exec, not a yarn script. `);

    process.exit(1);
}

const BUILD_NAME = "run-script";

console.time(BUILD_NAME);

let error = false;

function execCommand(path, command, verbose) {
    console.log(`> ${path}\n> ${command}\n`);

    return new Promise((res, reject) => {
        exec(command, { cwd: path, maxBuffer: 1 << 20 }, async (exception, stdout, stderr) => {
            const code = exception && exception.code || 0;

            if (code) {
                const err = new Error(`Command exited with code ${code}`);

                [err.code, err.stdout, err.stderr] = [code, stdout, stderr];
                [err.path, err.event, err.script] = [path, "exit", command];
                reject(err);
            } else {
                if (verbose) {
                    console.log(`CMD: ${command}\n---- stdout -----\n${stdout}\n---- stderr -----\n${stderr}\n---- exit: ${code} -----`);
                }
                res();
            }
        });
    });
}

// eslint-disable-next-line complexity
(async function() {
    const pkg = findClosestPackageJSONLocation(opts.root);
    const allPackages = getPackagesInWorkspace(pkg, [opts.workspace].flat().filter(x => x));
    let packages = allPackages;

    if (opts.scope) {
        const scopes = [opts.scope].flat();

        for (const _path of packages) {
            const path = resolve(opts.root, _path);

            if (scopes.includes(_path)) {
                packages = [_path];
                break;
            }

            const location = join(path, "package.json");
            const pkgc = JSON.parse(await readFile(location));

            if (scopes.includes(pkgc.name)) {
                packages = [_path];
                break;
            }
        }
    } else if (opts.dependencies) {
        packages = await getDeepDeps(opts.root, getDepTypes({ a: true }), [opts.dependencies].flat(), packages);
        // potentially is there reason not to build all dependency types?
    }

    if (opts.list) {
        console.log(packages.join("\n"));
        process.exit();
    }

    await DataStream.from(packages)
        .setOptions({ maxParallel: +opts.threads || cpus().length })
        .flatMap(async path => {
            if (!opts.lax && error)
                return Promise.reject(new Error("Fail fast..."));

            const runconfig = {
                stdioString: true,
                path
            };

            if (opts.exec) {
                if (opts._.slice(1).length)
                    console.error("Did you forget to quote the command? Got extra", opts._.slice(1));

                const command = opts._[0];

                const endPromise = execCommand(path, command, opts.verbose);

                return [
                    [Date.now(), await endPromise]
                ];
            }
            if (opts.verbose) runconfig.stdio = "inherit";

            const scriptName = opts._[0];
            const args = opts._.slice(1);

            return [
                [Date.now(), await runScript({ ...runconfig, event: `pre${scriptName}` })],
                [Date.now(), await runScript({ ...runconfig, args, event: scriptName })],
                [Date.now(), await runScript({ ...runconfig, event: `post${scriptName}` })]
            ];
        })
        .do(([ts, out]) => {
            const { path, event } = out;

            if (event)
                console.timeLog(BUILD_NAME, `${path}: script ${event} executed in ${Date.now() - ts}ms.`);
        })
        .catch(e => {
            if (!e.cause) return;

            const { code, stdout, stderr, path, event, script } = e.cause;

            if (!code) return;

            console.timeLog(BUILD_NAME, `${path}: script ${event} failed with code=${code}!`);
            console.error(`${path}: command was: "${script}"`);

            if (!opts.verbose) {
                console.log(`---- stdout -----\n${stdout}\n---- stderr -----\n${stderr}\n---- exit: ${code} -----`);
            }

            error = true;
        })
        .run()
    ;
})()
    .then(() => {
        if (!opts.lax && error) {
            console.timeLog(BUILD_NAME, "One or more scripts failed.");
            process.exitCode = 11;
        }
    })
    .catch(e => {
        console.timeLog(BUILD_NAME, "Error occured.");
        console.error(e.stack);
        process.exitCode = e.exitCode || 10;
    });
