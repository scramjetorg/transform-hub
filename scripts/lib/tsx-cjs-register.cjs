"use strict";

const Module = require("node:module");
const fs = require("node:fs");
const path = require("node:path");
const nodeResolveFilename = Module._resolveFilename;

// tsx's CJS hook also intercepts JavaScript files, including AVA's own worker
// bootstrap. Keep the repository's ordinary Node handlers for JS/JSON while
// retaining tsx's TypeScript handlers for AVA's staged source imports.
const javascriptExtensions = [".js", ".jsx", ".json"];
const previousHandlers = new Map(javascriptExtensions.map(extension => [extension, Module._extensions[extension]]));

require(require.resolve("tsx/cjs", { paths: [process.cwd()] }));

const tsxResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveStagedJavaScript(request, parent, isMain, options) {
	if (request.endsWith(".js") && parent?.filename) {
		const requestedJavaScript = path.isAbsolute(request) ? request : path.resolve(path.dirname(parent.filename), request);
		if (fs.existsSync(requestedJavaScript) && fs.statSync(requestedJavaScript).isFile()) {
			return nodeResolveFilename.call(this, requestedJavaScript, parent, isMain, options);
		}
	}

    if (parent?.filename?.includes(`${path.sep}.ava-`) && request.startsWith(".")) {
        const basePath = path.resolve(path.dirname(parent.filename), request);
        const sourceExtension = path.extname(basePath);
        const candidates = sourceExtension === ".ts" || sourceExtension === ".tsx"
            ? [basePath.replace(/\.tsx?$/, ".js")]
            : sourceExtension
                ? [basePath]
                : [`${basePath}.js`, path.join(basePath, "index.js")];
        const compiledPath = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        if (compiledPath) return nodeResolveFilename.call(this, compiledPath, parent, isMain, options);
    }

    return tsxResolveFilename.call(this, request, parent, isMain, options);
};

for (const [extension, handler] of previousHandlers) {
    if (handler) Module._extensions[extension] = handler;
    else delete Module._extensions[extension];
}
