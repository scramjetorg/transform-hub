const
    fse = require("fs-extra"),
    glob = require("glob"),
    path = require("path"),
    { exec } = require("child_process");

class PrePack {
    LICENSE_FILENAME = "LICENSE";
    PACKAGES_DIR = "packages";

    constructor(options) {
        this.options = options || {};

        if (!this.options.outDir) {
            throw new Error("No output folder specified");
        }

        this.currDir = process.cwd();
        this.rootDir = path.resolve(__dirname, "../..");
        this.currDirDist = path.join(this.currDir, "dist");
        this.rootDistPackPath = this.currDir.replace(this.PACKAGES_DIR, this.options.outDir);

        this.rootPackageJson = "";
        this.packagesMap = null;
    }

    /**
     * @returns {string[]} found package paths
     */
    async findPackages() {
        const cwd = path.join(this.rootDir, this.PACKAGES_DIR);

        return new Promise((res, rej) => {
            glob("!(node_modules)/package.json", { cwd }, (err, packages) => {
                if (err) {
                    rej(err);
                } else {
                    res(packages.map(found => path.join(cwd, found)));
                }
            });
        });
    }

    async readRootPackage() {
        this.rootPackageJson = await fse.readJson(path.join(this.currDir, "package.json"));
    }

    async makePackagesMap() {
        const res = await this.findPackages();

        const packages = await Promise.all(res.map(async packageJson => {
            try {
                const contents = await fse.readJSON(packageJson);
                return [contents.name, path.basename(path.dirname(packageJson))];
            } catch (e) {
                console.warn(`Can't read package.json (${packageJson}) `);
                return null;
            }
        }));

        this.packagesMap = new Map();
        for (let [k, v] of packages) {
            this.packagesMap.set(k, v);
        }
    }

    async build() {
        try {
            await this.readRootPackage();
            await this.makePackagesMap();
            await this.copyFiles();

            await this.saveJson(await this.transformPackageJson());

            if (!this.options.noInstall) {
                await this.install();
            }

        } catch (message) {
            console.error(message);
            process.exitCode = 1;
        }
    }

    async install() {
        return new Promise((res, rej) =>
            exec(`cd ${this.rootDistPackPath} && npm i`)
                .on("exit", (err) => err ? rej(err) : res())
                .stderr.pipe(process.stderr)
        );
    }

    async copyFiles() {
        // we should copy these from packages if exist.
        return this.copy(
            path.join(this.rootDir, this.LICENSE_FILENAME),
            path.join(this.rootDistPackPath, this.LICENSE_FILENAME)
        ).then(() =>
            this.copy(this.currDirDist, this.rootDistPackPath)
        );
    }

    async copy(input, output) {
        console.log(`Copy files form ${input} to ${output}`);

        return fse.copy(input, output, { recursive: true })
            .catch(err => {
                throw new Error(`Unable to copy file(s) form ${input} to ${output}, error code: ${err}`);
            });
    }

    async readPackageJson() {
        try {
            return await fse.readJson(path.join(this.currDir, "package.json"));
        } catch (err) {
            throw new Error(`Unable to read ${this.currDir}, error code: ${err}`);
        }
    }

    localizeDependencies(dependencies) {
        if (!dependencies) return null;

        if (this.options.localPkgs) {
            const ret = {};
            for (let [dependency, version] of Object.entries(dependencies)) {
                ret[dependency] = this.packagesMap.has(dependency)
                    ? `file:../${this.packagesMap.get(dependency)}`
                    : version
                ;
            }

            return ret;
        }

        return { ...dependencies };
    }

    async transformPackageJson() {
        const content = await this.readPackageJson();
        content.dependencies = content.dependencies || {};

        const dependencies = this.localizeDependencies(content.dependencies);

        const {
            bin: _bin, main: _main,
            name, version, description, keywords, homepage, bugs,
            license, author, contributors, funding, files, browser,
            man, directories, repository, config, peerDependencies,
            peerDependenciesMeta, bundledDependencies, optionalDependencies,
            engines, os, cpu, private: priv, publishConfig
        } = { ...this.rootPackageJson, ...content };

        const srcRe = str => str.replace(/^(?:\.\/)?src\//, "./").replace(/.ts$/, "");

        const main = srcRe(_main);
        console.log(main);
        const bin = _bin && (typeof _bin === "string"
            ? srcRe(_bin)
            // eslint-disable-next-line no-return-assign,no-sequences
            : Object.entries(_bin).map().reduce(acc, ([k, v]) => (acc[k] = v, acc), {})
        );

        return {
            name, version, description, keywords, homepage, bugs,
            license, author, contributors, funding, files, main, browser,
            bin, man, directories, repository, config, dependencies,
            peerDependencies, peerDependenciesMeta, bundledDependencies, optionalDependencies,
            engines, os, cpu, private: priv, publishConfig
        };
    }

    async saveJson(content) {
        console.log(`Add package.json to ${this.rootDistPackPath}`);

        return fse.outputJSON(path.join(this.rootDistPackPath, "package.json"), content, { spaces: 2 })
            .catch(err => {
                throw new Error(`Unable to write package.json, error code: ${err}`);
            });
    }
}

module.exports = PrePack;
