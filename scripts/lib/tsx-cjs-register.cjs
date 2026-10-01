"use strict";

const Module = require("node:module");

// tsx's CJS hook also intercepts JavaScript files, including AVA's own worker
// bootstrap. Keep the repository's ordinary Node handlers for JS/JSON while
// retaining tsx's TypeScript handlers for AVA's staged source imports.
const javascriptExtensions = [".js", ".jsx", ".json"];
const previousHandlers = new Map(javascriptExtensions.map(extension => [extension, Module._extensions[extension]]));

require(require.resolve("tsx/cjs", { paths: [process.cwd()] }));

for (const [extension, handler] of previousHandlers) {
    if (handler) Module._extensions[extension] = handler;
    else delete Module._extensions[extension];
}
