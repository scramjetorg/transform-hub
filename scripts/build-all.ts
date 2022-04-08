import { join, resolve } from "path";
import { createSolutionBuilderHost, sys } from "typescript";
import glob from "glob";
import { createSolutionBuilder } from "typescript";
import { existsSync } from "fs";

const findPackageJSON = () => {
    return require("../package.json")
}

/**
 * @type {typeof import("../package.json")}
 */
const pkg = findPackageJSON(
    // process.argv.length > 2 ? resolve(process.cwd(), process.argv[2]) : process.cwd()
);

const nodeSystem = createSolutionBuilderHost(
    sys
);

const cwd = resolve(__dirname, '..');

const packages: string[] = pkg.workspaces.packages
    .map((pattern: string) => glob.sync(pattern, {cwd}))
    .flat()
    .filter((pkg: string) => !pkg.includes("/reference-apps/") || pkg === 'bdd')
    .map((x: string) => resolve(cwd, x))
    .filter((pkg: string) => existsSync(join(pkg, 'tsconfig.json')))
;

packages.forEach(packageDir => {
    if (packageDir) {
        nodeSystem.readDirectory!(packageDir)
    }
})

const solution = createSolutionBuilder(nodeSystem, packages, {
    dry: false,
    incremental: true,
    verbose: false
});

solution.build();


