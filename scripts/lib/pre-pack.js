const fse = require("fs-extra");
const glob = require("glob");
const path = require("path");
const { exec } = require("child_process");
const { promises: { access }, constants } = require("fs");
const { chmod, readFile, writeFile } = require("fs/promises");

class PrePack {
    LICENSE_FILENAME = "LICENSE";
    PACKAGES_DIR = process.env.PACKAGES_DIR || "packages";

    constructor(options) {
        this.options = options || {};

        if (!this.options.outDir) {
            throw new Error("No output folder specified");
        }

        this.currDir = process.cwd();
        this.rootDir = path.resolve(__dirname, "../..");
        this.currDirDist = path.join(this.currDir, "dist");

        if (this.options.localCopy) {
            this.rootDistPackPath = this.currDirDist;
        } else {
            this.rootDistPackPath = this.currDir.replace(this.PACKAGES_DIR, this.options.outDir);
        }

        if (this.options.distPackDir) {
            this.rootDistPackPath = this.options.distPackDir + "/" + this.currDir.split("/").pop();
        }

        this.rootPackageJson = null;
        this.currPackageJson = null;
        this.packagesMap = null;

        console.log(this.options, {
            currDir: this.currDir,
            rootDir: this.rootDir,
            currDirDist: this.currDirDist,
            rootDistPackPath: this.rootDistPackPath
        });
    }

    async build() {
        try {
            await this.readPackageJson();
            if (this.options.flatPkgs) {
                if (!this.currPackageJson.name)
                    throw new Error("Package has no name!");

                this.rootDistPackPath = path.join(this.rootDir, "dist", this.currPackageJson.name.replace(/[^\w\d]+/g, "-").replace(/^\-|\-$/, ""));
                console.log(this.rootDistPackPath);
            }

            await this.readRootPackage();
            await this.makePackagesMap();

            if (!this.options.localCopy) {
                await this.copyFiles();
            }

            await this.copyAssets();

            await this.savePkgJson(await this.transformPackageJson());

            if (!this.options.noInstall) {
                await this.install();
            }
        } catch (message) {
            console.error(message);
            process.exitCode = 1;
        }
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
        try {
            this.rootPackageJson = await fse.readJson(path.join(this.rootDir, "package.json"));
        } catch (err) {
            throw new Error(`Unable to read package.json in ${this.rootDir}, error code: ${err}`);
        }
    }

    async readPackageJson() {
        try {
            this.currPackageJson = await fse.readJson(path.join(this.currDir, "package.json"));
        } catch (err) {
            throw new Error(`Unable to read package.json in ${this.currDir}, error code: ${err}`);
        }
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
        for (const [k, v] of packages) {
            this.packagesMap.set(k, v);
        }
    }

    async copyAssets() {
        const assets = Array.isArray(this.currPackageJson.assets) ? [...this.currPackageJson.assets] : [];

        if (!assets.length) return;

        // TODO: what about package.json/files?

        await Promise.all(assets.map(
            asset => this.copyToDist(this.currDir, asset)
        ));
    }

    async install() {
        return new Promise((res, rej) =>
            exec(`cd ${this.rootDistPackPath} && npm i`)
                .on("exit", (err) => err ? rej(err) : res())
                .stderr.pipe(process.stderr)
        );
    }

    async isReadable(file) {
        return access(file, constants.R_OK).then(() => true, () => false);
    }

    async copyFiles() {
        // we should copy these from packages if exist.
        const copies = [
            this.copyToDist(this.rootDir, this.LICENSE_FILENAME)
        ];

        if (await this.isReadable(path.join(this.currDir, "README.md"))) {
            copies.push(this.copyToDist(this.currDir, "README.md"));
        }
        await Promise.all(copies);
        await this.copy(this.currDirDist, this.rootDistPackPath);
    }

    async copyToDist(src, filename) {
        return this.copy(path.join(src, filename), path.join(this.rootDistPackPath, filename));
    }

    async copy(input, output) {
        console.log(`Copy files form ${input} to ${output}`);

        return fse.copy(input, output, { recursive: true })
            .catch(err => {
                throw new Error(`Unable to copy file(s) form ${input} to ${output}, error code: ${err}`);
            });
    }

    localizeDependencies(dependencies) {
        if (!dependencies) return undefined;
        if (Object.keys(dependencies).length === 0) return undefined;

        if (this.options.localPkgs) {
            const ret = {};

            for (const [dependency, version] of Object.entries(dependencies)) {
                ret[dependency] = this.packagesMap.has(dependency)
                    ? `file:../${this.packagesMap.get(dependency)}`
                    : version
                    ;
            }

            return ret;
        }

        return { ...dependencies };
    }

    // eslint-disable-next-line complexity
    async transformPackageJson() {
        const content = this.currPackageJson;

        content.dependencies = content.dependencies || {};

        const dependencies = this.localizeDependencies(content.dependencies);
        const {
            bin: _bin, main: _main, browser: _browser,
            name, version, description, keywords,
            files = this.rootPackageJson.files,
            license = this.rootPackageJson.license,
            author = this.rootPackageJson.author,
            contributors = this.rootPackageJson.contributors,
            funding = this.rootPackageJson.funding,
            homepage = this.rootPackageJson.homepage,
            bugs = this.rootPackageJson.bugs,
            repository = this.rootPackageJson.repository,
            engines = this.rootPackageJson.engines,
            os = this.rootPackageJson.os,
            cpu = this.rootPackageJson.cpu,
            publishConfig = this.rootPackageJson.publishConfig,
            man, directories, config, peerDependencies, scramjet,
            peerDependenciesMeta, bundledDependencies, optionalDependencies
        } = content;
        const priv = !this.options.public && this.rootPackageJson.private;
        const srcRe = (str, rp = ".js") => str.replace(/^(?:\.\/)?src\//, "./").replace(/.ts$/, rp);
        const main = srcRe(_main);
        const browser = _browser && srcRe(_browser);
        const bin = _bin && (typeof _bin === "string"
            ? srcRe(_bin)
            : Object.entries(_bin)
                .map(([k, v]) => [k, srcRe(v)])
                // eslint-disable-next-line no-return-assign,no-sequences
                .reduce((acc, [k, v]) => (acc[k] = srcRe(v), acc), {})
        );
        const types = content.types || !_main || !_main.endsWith(".ts")
            ? content.types
            : srcRe(_main, ".d.ts")
            ;

        if (typeof bin === "object") await this.fixShebang(bin);

        return {
            name, version, description, keywords, homepage, bugs,
            license, author, contributors, funding, files, main, types,
            bin, man, directories, repository, config, browser,
            dependencies, peerDependencies, peerDependenciesMeta,
            bundledDependencies, optionalDependencies,
            engines, os, cpu, private: priv, publishConfig, scramjet
        };
    }

    async fixShebang(assets) {
        const entries = Object.entries(assets);

        if (!entries.length) return;

        // TODO: what about package.json/files?

        await Promise.all(entries.map(
            async ([, relative]) => {
                const file = path.resolve(this.rootDistPackPath, relative);
                const contents = await readFile(file, "utf-8");

                if (!contents.match(/^\s*#!\/usr\/bin\/env ts-node/)) return;

                console.log(`Replacing shebang in ${file}`);
                await writeFile(file, contents.replace(/^\s*#!\/usr\/bin\/env ts-node/, "#!/usr/bin/env node"));
                await chmod(file, 0o755);
            }
        ));
    }

    async savePkgJson(content) {
        console.log(`Add package.json to ${this.rootDistPackPath}`);

        return fse.outputJSON(path.join(this.rootDistPackPath, "package.json"), content, { spaces: 2 })
            .catch(err => {
                throw new Error(`Unable to write package.json, error code: ${err}`);
            });
    }
}

module.exports = PrePack;
