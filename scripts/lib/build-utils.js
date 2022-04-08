const { existsSync } = require("fs");
const path = require("path");

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

module.exports = { findClosestPackageJSONLocation, readClosestPackageJSON };
