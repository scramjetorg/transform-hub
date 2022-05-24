const { existsSync } = require("fs");
const path = require("path");
const { join, resolve } = require("path");
const glob = require("glob");
const { exec } = require("child_process");

const { access } = require("fs/promises");

function getTSDirectoriesFromGlobs(cwd, globs, tsConfigName = "tsconfig.json") {
    const packages = globs
        .map((pattern) => glob.sync(pattern, { cwd }))
        .flat()
        .filter(x => !["/node_modules/"].find(m => x.includes(m)))
        .map((x) => resolve(cwd, x))
        .filter((pkg) => existsSync(join(pkg, tsConfigName)));

    return packages;
}

const exists = async (name) => {
    try {
        await access(name);
        return true;
    } catch {
        return false;
    }
};

function getTSDirectoriesFromPackage(_cwd, _dir, pkg, workspaceFilter, tsConfigName = "tsconfig.json") {
    const cwd = resolve(_cwd, _dir || ".");

    if (!pkg.workspaces) return [cwd];

    const workspaces = Array.isArray(pkg.workspaces) ? { default: pkg.workspaces } : pkg.workspaces;
    const globs = Object.entries(workspaces)
        .flatMap(([key, entries]) => {
            if (workspaceFilter.length)
                if (!workspaceFilter.includes(key))
                    return [];

            return entries;
        });

    return getTSDirectoriesFromGlobs(cwd, globs, tsConfigName);
}

const findClosestPackageJSONLocation = (_cwd) => {
    const cwd = path.resolve(process.cwd(), _cwd || ".");
    const pathParts = cwd.split(path.sep);

    while (pathParts.length) {
        const pkg = path.resolve(...pathParts, "package.json");

        if (existsSync(pkg)) {
            return pkg;
        }
        pathParts.pop();
    }
    throw new Error(`Cannot find package.json anywhere in path "${cwd}"`);
};

const readClosestPackageJSON = (cwd) => {
    // eslint-disable-next-line import/no-dynamic-require
    return require(findClosestPackageJSONLocation(cwd));
};

function getPackageList(pkg, configName, opts) {
    const workspaceFilter = opts._.slice(1);

    let packages;

    if (opts.config) {
        packages = getTSDirectoriesFromPackage(process.cwd(), dirname(opts.config), pkg, workspaceFilter, configName);
    } else if (opts.dirs) {
        packages = getTSDirectoriesFromGlobs(process.cwd(), opts._, configName);
    } else {
        packages = getTSDirectoriesFromPackage(process.cwd(), opts._[0], pkg, workspaceFilter, configName);
    }
    return packages;
}

async function runCommand(cmd, verbose) {
    const stack = new Error().stack.split("\n").slice(2).join("\n");

    await new Promise((res, rej) => {
        const proc = exec(cmd)
            .on("exit", (err) => err ? rej(new Error(`Command exited with code ${err}, caused by call\n${stack}\n---`)) : res());

        if (verbose) {
            console.error("Started command:", cmd);
            proc.stderr.pipe(process.stderr);
            proc.stdout.pipe(process.stdout);
        }
    });
}

module.exports = {
    runCommand,
    exists,
    getPackageList,
    findClosestPackageJSONLocation,
    readClosestPackageJSON,
    getTSDirectoriesFromPackage,
    getTSDirectoriesFromGlobs
};
