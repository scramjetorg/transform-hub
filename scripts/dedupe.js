#!/usr/bin/env node

const Command = require("@lerna/command");
const { join } = require("path");
const semver = require("semver");

class PJCommand extends Command {
    async initialize() {
        // console.log(this.packageGraph.entries());
    }
    execute() {}
}

function pushDep(deps, result, package, prefix = "") {
    const key = `${prefix}${result.name}`;

    (deps[key] || (deps[key] = [])).push({
        name: package.name,
        location: package.location,
        raw: result.raw,
        spec: result.rawSpec
    });
}

new Promise((res, onRejected) => {
    const out = new PJCommand({
        onResolved() {
            res(out.packageGraph);
        },
        onRejected
    });
}).then(
    (graph) => {
        return Array.from(graph.entries())
            .map(([name, value]) => ({
                name,
                location: value.location,
                deps: Array.from(value.externalDependencies.entries())
                    .map(([, x]) => x),
                package: require(join(value.location, "package.json"))
            }));
    })
    .then((entries) => {
        const deps = {};
        const Oh = Object.prototype.hasOwnProperty;

        for (let package of entries) {
            for (let result of package.deps) {
                const devDependencies = package.package.devDependencies &&
                    Oh.call(package.package.devDependencies, result.name);
                const dependencies = package.package.dependencies &&
                    Oh.call(package.package.dependencies, result.name);
                const peerDependencies = package.package.peerDependencies &&
                    Oh.call(package.package.peerDependencies, result.name);

                if (dependencies) pushDep(deps, result, package);
                if (devDependencies) pushDep(deps, result, package, "-D;");
                if (peerDependencies) pushDep(deps, result, package, "-P;");
            }
        }

        return deps;
    })
    .then((deps) => {
        const dupedDeps = Object.entries(deps)
            .filter(([, x]) =>
                x.length > 1 &&
                new Set(x.map(y => y.raw)).size > 1
            ).map(
                ([package, versions]) => {
                    return {
                        package,
                        versions: Array.from(new Set(versions.map(x => x.spec))),
                        dependents: Array.from(new Set(versions.map(x => [x.spec, x.name]))),
                    };
                }
            );

        for (const { package, versions, dependents } of dupedDeps) {
            process.exitCode = 10;

            const newest = versions
                .map(x => x.replace(/^[^\d]+/, ""))
                .sort(semver.compare)
                .reverse()[0];
            const scopes = dependents
                .filter(([x]) => x !== newest)
                .map(([, x]) => `--scope=${x}`).join(" ");
            const parts = package.split(";");
            const dev = parts.length > 1 ? parts.shift() : "";

            console.log(`# Update ${package}`);
            console.log(`lerna ${scopes} --concurrency=1 exec -- yarn add ${parts[0]}@${newest} ${dev}`);
            console.log("");
        }
    });

