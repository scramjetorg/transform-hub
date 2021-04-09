const path = require("path");
const tar = require("tar");
const { createWriteStream } = require("fs");

class Pack {
    PACKAGES_DIR = "packages";

    constructor(options) {
        this.options = options || {};

        if (!this.options.outDir) {
            throw new Error("No output folder specified");
        }

        this.currDir = process.cwd();
        this.rootDir = path.resolve(__dirname, "../..");
        this.currDirDist = path.join(this.currDir, "dist");
        this.rootDistPackPath = this.currDir.replace(this.PACKAGES_DIR, this.options.outDir);

    }

    async pack(){
        const outputTar = this.currDir+".tar.gz";
        const sourceDir = this.currDirDist;
        // tar -zcvf transform-sequence-3.tar.gz  dist/reference-apps/transform-sequence-3
        
        tar.c( 
            {
              gzip: true
            },
            [sourceDir]
          ).pipe(createWriteStream(outputTar));
    }
}

module.exports = Pack;
