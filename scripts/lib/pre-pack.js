const fse = require("fs-extra"),
    path = require("path");

class PrePack {
    build() {
        this.currDir = process.cwd();
        this.folderName = this.currDir.split(path.sep).pop();
        this.rootDir = path.join(__dirname, "../../");
        this.rootDist = path.join(this.rootDir, "/dist");
        this.currDirDist = path.join(this.currDir, "/dist");
        this.license = path.join(this.currDir, "/LICENSE");
        this.rootDistPackPath = path.join(this.rootDist, this.folderName);

        this.readJson()
            .then(this.writeJson.bind(this))
            .then(this.handleDistFiles.bind(this))
            .catch(message => console.log(message));
    }
    handleDistFiles() {
        return new Promise((resolve, reject) => {
            this.copyFiles(this.license, this.currDirDist)
                .then(this.copyFiles.bind(this, this.currDirDist, this.rootDistPackPath))
                .then(resolve)
                .catch(reject);
        });
    }
    copyFiles(input, output) {
        console.log(`Copy files form ${input} to ${output}`);
        return new Promise((resolve, reject) => {
            fse.copy(input, output, err => {
                if (err) reject(`Unable to copy files form ${input} to ${output}, error code: ${err.code}`);
                else resolve();
            });
            resolve();
        });
    }
    readJson() {
        return new Promise((resolve, reject) => {
            fse.readJson(`${this.currDir}/package.json`, (err, content) => {
                if (err) reject(`Unable to read package.json, error code: ${err.code}`);
                else {
                    try {
                        content.scripts = {};
                        content.devDependencies = {};
                        this.jsonFile = content;
                        resolve();
                    } catch (e) {
                        reject("Unable to parse file projects.json to JSON format");
                    }
                }
            });
        });
    }
    writeJson() {
        console.log(`Add package.json to ${this.currDir}`);
        return new Promise((resolve, reject) => {
            fse.writeJson(path.join(this.currDirDist, 'package.json'), this.jsonFile, {spaces: 2}, err => {
                if (err) reject(`Unable to overwrite ${this.jsonFile} package.json`);
                else resolve();
            });
        });
    }
}

module.exports = new PrePack();