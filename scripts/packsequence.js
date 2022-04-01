#!/usr/bin/env node

const Pack = require("./lib/pack");
const packOptions = {
    outDir: process.env.OUT_DIR || "dist",
    localPkgs: process.env.LOCAL_PACKAGES,
    packagesDir: process.env.PACKAGES_DIR || "packages"
};
const pack = new Pack(packOptions);

pack.pack()
    .then(
        (name) => console.log(name)
    )
    .catch(e => {
        console.error(e.stack);
        process.exitCode = e.exitCode || 10;
    });
