const fse = require("fs-extra"),
    path = require("path");

class PrePack {
    build() {
        this.currDir = process.cwd();
        this.rootDir = path.join(__dirname, "..", "..");
        this.currDirDist = path.join(this.currDir, "dist");
        this.folderName = this.currDir.split(path.sep).pop();
        this.rootDistPackPath = path.join(this.rootDir, "dist", this.folderName);

        this.changeJson()
            .then(this.saveJson.bind(this))
            .then(this.handleDistFiles.bind(this))
            .catch(message => console.log(message));
    }

    handleDistFiles() {
        const licenseFilename = "LICENSE";

        return new Promise((resolve, reject) => {
            this.copyFiles(
                path.join(this.rootDir, licenseFilename),
                path.join(this.rootDistPackPath, licenseFilename))
                .then(this.copyFiles(this.currDirDist, this.rootDistPackPath))
                .then(resolve)
                .catch(reject);
        });
    }

    copyFiles(input, output) {
        console.log(`Copy files form ${input} to ${output}`);
        return new Promise((resolve, reject) => {
            fse.copy(input, output, err => {
                if (err) reject(`Unable to copy file(s) form ${input} to ${output}, error code: ${err.code}`);
                else resolve();
            });
            resolve();
        });
    }

    changeJson() {
        return new Promise((resolve, reject) => {
            fse.readJson(path.join(this.currDir, "package.json"), (err, content) => {
                if (err) reject(`Unable to read package.json, error code: ${err.code}`);
                else {
                    content.scripts = {};
                    content.devDependencies = {};
                    this.jsonFile = content;
                    resolve();
                }
            });
        });
    }

    saveJson() {
        console.log(`Add package.json to ${this.rootDistPackPath}`);
        return new Promise((resolve, reject) => {
            fse.outputJSON(path.join(this.rootDistPackPath, "package.json"), this.jsonFile, { spaces: 2 }, err => {
                if (err) reject(`Unable to write package.json, error code: ${err.code}`);
                else resolve();
            });
        });
    }
}

module.exports = new PrePack();