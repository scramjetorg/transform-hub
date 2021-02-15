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
            .then(() => this.saveJson())
            .then(() => this.handleDistFiles())
            .catch(message => console.log(message));
    }

    handleDistFiles() {
        const licenseFilename = "LICENSE";

        return new Promise((resolve, reject) => {
            this.copyFiles(
                path.join(this.rootDir, licenseFilename),
                path.join(this.rootDistPackPath, licenseFilename))
                .then(() => this.copyFiles(this.currDirDist, this.rootDistPackPath))
                .then(resolve)
                .catch(reject);
        });
    }

    copyFiles(input, output) {
        console.log(`Copy files form ${input} to ${output}`);
        return fse.copy(input, output)
            .then(() => console.log("Success"))
            .catch(err => {
                console.error(`Unable to copy file(s) form ${input} to ${output}, error code: ${err}`);
            });
    }

    changeJson() {
        return fse.readJson(path.join(this.currDir, "package.json"))
            .then(content => {
                content.scripts = {};
                content.devDependencies = {};
                this.jsonFile = content;
            })
            .catch(err => {
                console.error(`Unable to read package.json, error code: ${err}`);
            });
    }

    saveJson() {
        console.log(`Add package.json to ${this.rootDistPackPath}`);
        return fse.outputJSON(path.join(this.rootDistPackPath, "package.json"), this.jsonFile, { spaces: 2 })
            .then(() => console.log("Success"))
            .catch(err => {
                console.error(`Unable to write package.json, error code: ${err}`);
            });
    }
}

module.exports = new PrePack();
