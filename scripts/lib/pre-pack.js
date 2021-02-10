const fs = require("fs"),
    fse = require("fs-extra"),
    path = require("path");

class PrePack {
    build() {
        this.currDir = process.cwd();
        this.folderName = this.currDir.split(path.sep).pop();
        this.rootDir = path.join(__dirname, "../../");
        this.rootDist = path.join(this.rootDir, "/dist");
        this.currDirDist = path.join(this.currDir, "/dist");

        this.readJson()
            .then(this.writeJson.bind(this))
            .then(this.handleDistFiles.bind(this))
            .catch(message => console.log(message));
    }
    handleDistFiles() {
        return new Promise((resolve, reject) => {
            this.copyFile(this.rootDir, this.currDirDist, "LICENSE")
                .then(this.copyFolder.bind(this, this.currDirDist, this.rootDist))
                .then(resolve)
                .catch(reject);
        });
    }
    copyFolder(input, output) {
        console.log(`Copy files form ${input} to ${output}`);
        return new Promise((resolve, reject) => {
            fse.copy(`${input}/`, `${output}/${this.folderName}`, (err) => {
                if (err) reject(`Unable to copy folder form ${input} to ${output}, error code: ${err.code}`);
                else resolve();
            });
        });
    }
    copyFile(input, output, fileName) {
        console.log(`Copy ${fileName} file form ${input} to ${output}`);
        return new Promise((resolve, reject) => {
            if (typeof fileName !== "string") reject(`${fileName} is invalid type name`);
            fs.copyFile(`${input}/${fileName}`, `${output}/${fileName}`, (err) => {
                if (err) reject(`Unable to copy ${fileName} form ${input} to ${output}, error code: ${err.code}`);
                else resolve();
            });
        });
    }
    readJson() {
        return new Promise((resolve, reject) => {
            fs.readFile(`${this.currDir}/package.json`, (err, content) => {
                if (err) reject(`Unable to read package.json, error code: ${err.code}`);
                else {
                    try {
                        this.jsonFile = JSON.parse(content);
                        resolve();
                    } catch (e) {
                        reject("Unable to parse file projects.json to JSON format");
                    }
                }
            });
        });
    }
    editJson() {
        console.log(`Path: ${this.currDir}. Editing package.json.`);
        this.jsonFile.scripts = {};
        this.jsonFile.devDependencies = {};
    }
    writeJson() {
        this.editJson();
        console.log(`Add package.json to ${this.currDir}`);
        return new Promise((resolve, reject) => {
            fs.writeFile(`${this.currDirDist}/package.json`, JSON.stringify(this.jsonFile, null, 2), "utf8", (err) => {
                if (err) reject(`Unable to overwrite ${this.jsonFile} package.json`);
                else resolve();
            });
        });
    }
}

module.exports = new PrePack();