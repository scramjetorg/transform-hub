#!/usr/bin/env node

const lernaList = require("@lerna/list")([]);

lernaList.initialize()
    .then(() => lernaList.result)
    .then(console.log)
;
