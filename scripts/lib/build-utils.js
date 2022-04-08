const { existsSync } = require("fs");
const path = require("path");
const { join, resolve } = require("path");
const glob = require("glob");

function getTSDirectoriesFromGlobs(cwd, globs, tsConfigName = 'tsconfig.json') {
    const packages = globs
        .map((pattern) => glob.sync(pattern, { cwd }))
        .flat()
        .filter(x => !["/node_modules/"].find(m => x.includes(m)))
        .map((x) => resolve(cwd, x))
        .filter((pkg) => existsSync(join(pkg, tsConfigName)));

    return packages;
}

function getTSDirectoriesFromPackage(_cwd, _dir, pkg, workspaceFilter) {
    const cwd = resolve(_cwd, _dir || '.');
    if (!pkg.workspaces) return [cwd];

    const workspaces = Array.isArray(pkg.workspaces) ? { "default": pkg.workspaces } : pkg.workspaces;
    const globs = Object.entries(workspaces)
        .flatMap(([key, entries]) => {
            if (workspaceFilter.length)
                if (!workspaceFilter.includes(key))
                    return [];

            return entries;
        });

    return getTSDirectoriesFromGlobs(cwd, globs);
}



const findClosestPackageJSONLocation = (_cwd) => {
    const cwd = path.resolve(process.cwd(), _cwd || ".");
    const pathParts = cwd.split(path.sep);

    while(pathParts.length) {
        const package = path.resolve(...pathParts, "package.json");
        if (existsSync(package)) {
            return package;
        }
        pathParts.pop();
    }
    throw new Error(`Cannot find package.json anywhere in path "${cwd}"`);
};

const readClosestPackageJSON = (cwd) => {;
    return require(findClosestPackageJSONLocation(cwd));
}

module.exports = {
    findClosestPackageJSONLocation,
    readClosestPackageJSON,
    getTSDirectoriesFromPackage,
    getTSDirectoriesFromGlobs
};
