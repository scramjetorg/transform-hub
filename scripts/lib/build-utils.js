const { sys, createSolutionBuilderHost, createSolutionBuilder } = require("typescript");
const { existsSync, readFileSync, statSync } = require("fs");
const path = require("path");
const { join, dirname } = require("path");
const glob = require("glob");
const { exec } = require("child_process");

const { access } = require("fs/promises");
const { cwd } = require("process");
const globrex = require("globrex");

function getDirectoriesFromGlobs(wd, globs, configName) {
    const matches = globs
        .map((pattern) => {
            try {
                return glob.sync(pattern, { cwd: wd });
            } catch (e) {
                e.message = `${e.message} [${pattern}]`;
                throw e;
            }
        })
        .flat()
    ;

    const packages = matches
        .filter((/** @type {string} x */ x) => !x.match(/(\/|^)node_modules\//))
        .filter((dir) => { try { return statSync(join(wd, dir)).isDirectory(); } catch { return false; } })
        .filter((pkg) => existsSync(join(wd, pkg, configName)))
    ;

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

function makeTypescriptSolutionForPackageList(packages, configName) {
    const nodeSystem = createSolutionBuilderHost(sys);

    packages.forEach(packageDir => {
        if (packageDir) {
            nodeSystem.readDirectory(packageDir);
        }
    });

    const rootnames = packages.map(x => join(x, configName));
    const solution = createSolutionBuilder(nodeSystem, rootnames, {
        dry: false,
        assumeChangesOnlyAffectDirectDependencies: true,
        incremental: true,
        verbose: true
    });

    return solution;
}

function getTSDirectoriesFromPackage(_cwd = ".", pkg, workspaceFilter = [], tsConfigName = "tsconfig.json") {
    if (!pkg.workspaces) return [_cwd];

    const workspaces = Array.isArray(pkg.workspaces) ? { default: pkg.workspaces } : pkg.workspaces;
    const globs = Object.entries(workspaces)
        .flatMap(([key, entries]) => {
            if (workspaceFilter.length)
                if (!workspaceFilter.includes(key))
                    return [];

            return entries;
        });

    return getDirectoriesFromGlobs(cwd(), globs, tsConfigName);
}

const findClosestPackageJSONLocation = (_cwd = ".") => {
    const wd = path.resolve(_cwd);
    const pathParts = wd.split(path.sep);

    while (pathParts.length) {
        const pkg = path.resolve(pathParts.join(path.sep), "package.json");

        if (existsSync(pkg)) {
            return pkg;
        }
        pathParts.pop();
    }
    throw new Error(`Cannot find package.json anywhere in path "${wd}"`);
};

const readClosestPackageJSON = (wd) => {
    // eslint-disable-next-line import/no-dynamic-require
    return require(findClosestPackageJSONLocation(wd));
};

function getPackageList(pkg, configName, opts) {
    const workspaceFilter = opts._.slice(1);

    let packages;

    if (opts.config) {
        packages = getTSDirectoriesFromPackage(dirname(opts.config), pkg, workspaceFilter, configName);
    } else if (opts.dirs) {
        packages = getDirectoriesFromGlobs(cwd(), opts._, configName);
    } else {
        packages = getTSDirectoriesFromPackage(opts._[0], pkg, workspaceFilter, configName);
    }
    return packages;
}

function getPackagesInWorkspace(pkgLocation, workspaces = []) {
    const pkg = JSON.parse(readFileSync(pkgLocation));
    const dir = dirname(pkgLocation);

    if (!workspaces.length) {
        workspaces.push(...Object.values(pkg.workspaces).flat());
    } else {
        const nre = [];
        const yre = [];

        workspaces.forEach(pt => {
            const not = pt.startsWith("!");
            const re = globrex(not ? pt.substr(1) : pt).regex;

            if (not)
                nre.push((x) => `${x}`.match(re));
            else
                yre.push((x) => `${x}`.match(re));
        });

        workspaces = Object.entries(pkg.workspaces)
            .filter(([x]) => {
                if (nre.some(re => re(x))) return false;

                if (!yre.length) return true;
                return yre.some(re => re(x));
            })
            .map(([, x]) => x)
            .flat();
    }

    return getDirectoriesFromGlobs(dir, workspaces, "package.json");
}

async function runCommand(cmd, verbose) {
    const stack = new Error().stack.split("\n").slice(2).join("\n");

    await new Promise((res, rej) => {
        const proc = exec(cmd)
            .on(
                "exit",
                (err) => err
                    ? rej(new Error(`Command exited with code ${err}, caused by call\n${stack}\n---`))
                    : res()
            );

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
    getPackagesInWorkspace,
    getTSDirectoriesFromPackage,
    getDirectoriesFromGlobs,
    makeTypescriptSolutionForPackageList
};
