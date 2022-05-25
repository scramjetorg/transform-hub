const tar = require("tar");
const { createWriteStream, readdirSync } = require("fs");

class Pack {
    constructor(options) {
        this.options = options || {};

        if (!this.options.outDir) {
            throw new Error("No output folder specified");
        }

        if (!this.options.packagesDir) {
            throw new Error("No base folder specified");
        }

        this.currDir = process.cwd();
        this.packagesDir = options.packagesDir || this.packagesDir;
        this.rootDistPackPath = this.currDir.replace(this.packagesDir, this.options.outDir);

        console.log(`Packing ${this.rootDistPackPath} in ${options.packagesDir}`);
    }

    async pack() {
        const outputTar = this.currDir + ".tar.gz";
        /** @type {import("stream").Writable} */
        const out =
            tar.c(
                {
                    gzip: true,
                    cwd: this.rootDistPackPath
                }, readdirSync(this.rootDistPackPath)
            ).pipe(createWriteStream(outputTar));

        await new Promise((res, rej) => {
            out.on("finish", res);
            out.on("error", rej);
        });

        return outputTar;
    }
}

module.exports = Pack;
