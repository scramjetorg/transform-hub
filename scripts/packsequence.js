#!/usr/bin/env node

const Pack = require("./lib/pack");
const pack = new Pack({
    outDir: process.env.OUT_DIR || "dist",
    localPkgs: process.env.LOCAL_PACKAGES,
});

pack.pack()
    .then(
        (name) => console.log(name)
    )
    .catch(e => {
        console.error(e.stack);
        process.exitCode = e.exitCode || 10;
    });
