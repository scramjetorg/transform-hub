const
    fse = require("fs-extra"),
    glob = require("glob"),
    path = require("path"),
    { exec } = require("child_process");

class PrePack {
    LICENSE_FILENAME = "LICENSE";
    PACKAGES_DIR = "packages";
    DIST_DIR = "dist";

    constructor() {
        this.currDir = process.cwd();
        this.rootDir = path.join(__dirname, "..", "..");
        this.currDirDist = path.join(this.currDir, this.DIST_DIR);
        this.rootDistPackPath = this.currDir.replace(this.PACKAGES_DIR, this.DIST_DIR);
    }

    findPackages() {
        return new Promise((res, rej) => {
            glob(`../../${this.PACKAGES_DIR}/!(node_modules)/package.json`, (err, packages) => {
                if (err) {
                    rej(err);
                } else {
                    res(packages);
                }
            });
        });
    }

    getPackagesMap() {
        return this.findPackages()
            .then((res) => Promise.all(
                res.map(
                    packageJson =>
                        fse.readJSON(packageJson)
                            .then(contents => [contents.name, packageJson.replace(`../../${this.PACKAGES_DIR}/`, "").replace("/package.json", "")])
                            .catch(() => {
                                console.warn(`Can't read package.json (${packageJson}): `);
                            })
                )
            )).then((packagesMap) => { this.packagesMap = packagesMap; });
    }

    build() {
        this.getPackagesMap().then(
            () => Promise.all([
                this.transformPackageJson().then(content => this.saveJson(content)),
                this.copyFiles()
            ])
        )
            .then(this.install.bind(this))
            .catch(message => console.error(message));
    }

    install() {
        exec(`cd ${this.rootDistPackPath} && npm i`).stderr.pipe(process.stdout);
    }

    copyFiles() {
        this.copy(
            path.join(this.rootDir, this.LICENSE_FILENAME),
            path.join(this.rootDistPackPath, this.LICENSE_FILENAME)
        ).then(() =>
            this.copy(this.currDirDist, this.rootDistPackPath)
        );
    }

    copy(input, output) {
        console.log(`Copy files form ${input} to ${output}`);

        return fse.copy(input, output)
            .catch(err => {
                console.error(`Unable to copy file(s) form ${input} to ${output}, error code: ${err}`);
            });
    }

    transformPackageJson() {
        return fse.readJson(path.join(this.currDir, "package.json"))
            .then(content => new Promise((res) => {
                content.dependencies = content.dependencies || {};

                Object.keys(content.dependencies).forEach((dependency) => {
                    let pkg = this.packagesMap.find(p => Array.isArray(p) && p[0] === dependency);

                    if (pkg) {
                        content.dependencies[dependency] = `file:../${pkg[1]}`;
                    }
                });

                delete content.devDependencies;

                res(content);
            }))
            .catch(err => {
                console.error(`Unable to read package.json in ${this.currDir}, error code: ${err}`);
            });
    }

    saveJson(content) {
        console.log(`Add package.json to ${this.rootDistPackPath}`);

        return fse.outputJSON(path.join(this.rootDistPackPath, "package.json"), content, { spaces: 2 })
            .catch(err => {
                console.error(`Unable to write package.json, error code: ${err}`);
            });
    }
}

module.exports = PrePack;
