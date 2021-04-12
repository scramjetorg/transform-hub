const path = require("path");
const tar = require("tar");
const { createWriteStream, readdirSync } = require("fs");

class Pack {
    PACKAGES_DIR = "packages";

    constructor(options) {
        this.options = options || {};

        if (!this.options.outDir) {
            throw new Error("No output folder specified");
        }

        this.currDir = process.cwd();
        this.rootDistPackPath = this.currDir.replace(this.PACKAGES_DIR, this.options.outDir);
    }

    async pack() {
        const outputTar = this.currDir + ".tar.gz";

        tar.c(
            {
                gzip: true,
                cwd: this.rootDistPackPath
            }, readdirSync(this.rootDistPackPath)
        ).pipe(createWriteStream(outputTar));
    }
}

module.exports = Pack;
