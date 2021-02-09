const fs = require("fs"),
    path = require("path");

class PrePack {
    build() {
        this.dir = process.cwd();
        this.rootDir = path.join(__dirname, "../../");
        this.distDir = path.join(this.dir, "/dist");
        this.copyLicense();
        this.handleJson();
    }
    copyLicense() {
        fs.copyFile(`${this.rootDir}/LICENSE`, `${this.distDir}/LICENSE`, (err) => {
            if (err) throw err;
            console.log(`Licence was copy form ${this.rootDir} to ${this.distDir}`);
        });
    }
    handleJson() {
        return new Promise((resolve, reject) => {
            this.readJson()
                .then(this.writeJson.bind(this))
                .then(resolve)
                .catch(reject);
        });
    }
    readJson() {
        return new Promise((resolve, reject) => {
            fs.readFile(`${this.dir}/package.json`, (err, content) => {
                if (err) reject(`Unable to read package.json error code: ${err.code}`);
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
        console.log(`Path: ${this.dir}. Editing package.json.`);
        this.jsonFile.scripts = {};
        this.jsonFile.devDependencies = {};
    }
    writeJson() {
        this.editJson();
        console.log(`Add package.json to ${this.dir}`);
        return new Promise((resolve, reject) => {
            fs.writeFile(`${this.distDir}/package.json`, JSON.stringify(this.jsonFile, null, 2), "utf8", (err) => {
                if (err) reject(`Unable to overwrite ${this.jsonFile} package.json`);
                else resolve();
            });
        });
    }
}

module.exports = new PrePack();