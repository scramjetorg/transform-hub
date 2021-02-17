const
    fse = require("fs-extra"),
    path = require("path"),
    { exec } = require("child_process");

class PrePack {
    LICENSE_FILENAME = "LICENSE";
    PACKAGES_DIR = "packages";

    getPackagesNames() {
        return fse.readdir(path.join(this.rootDir, this.PACKAGES_DIR))
            .then((res) => Promise.all(
                res.map(
                    packageDir => fse.readJSON(path.join(this.rootDir, this.PACKAGES_DIR, packageDir, "package.json"))
                        .then(contents => [contents.name, packageDir])
                        .catch(() => {
                            console.warn(`Can't read package.json from sibling package (${packageDir}): `);
                        })
                )
            ));
    }

    cleanup(packages) {
        return Promise.resolve(packages.filter(x => x));
    }

    constructor() {
        this.currDir = process.cwd();
        this.rootDir = path.join(__dirname, "..", "..");
        this.currDirDist = path.join(this.currDir, "dist");
        this.folderName = this.currDir.split(path.sep).pop();
        this.rootDistPackPath = path.join(this.rootDir, "dist", this.folderName);
    }

    build() {
        this.getPackagesNames()
            .then(this.cleanup)
            .then(this.changeJson.bind(this))
            .then(this.saveJson.bind(this))
            .then(this.copyFiles.bind(this))
            .then(this.install.bind(this))
            .catch(message => console.error(message));
    }

    install() {
        exec(`cd ${this.rootDistPackPath} && npm i`).stderr.pipe(process.stdout);
    }

    copyFiles() {
        return Promise.all([
            this.copy(
                path.join(this.rootDir, this.LICENSE_FILENAME),
                path.join(this.rootDistPackPath, this.LICENSE_FILENAME)
            ),
            this.copy(this.currDirDist, this.rootDistPackPath)
        ]);
    }

    copy(input, output) {
        console.log(`Copy files form ${input} to ${output}`);

        return fse.copy(input, output)
            .catch(err => {
                console.error(`Unable to copy file(s) form ${input} to ${output}, error code: ${err}`);
            });
    }

    changeJson(packages) {
        return fse.readJson(path.join(this.currDir, "package.json"))
            .then(content => new Promise((res) => {
                content.dependencies = content.dependencies || {};

                Object.keys(content.dependencies).forEach((dependency) => {
                    let pkg = packages.find(p => Array.isArray(p) && p[0] === dependency);

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

module.exports = new PrePack();
