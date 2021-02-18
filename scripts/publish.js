#!/usr/bin/env node

const PrePack = require("./lib/pre-pack");

prePack = new PrePack({ outDir: "dist", localPkgs: false });
prePack.build();
