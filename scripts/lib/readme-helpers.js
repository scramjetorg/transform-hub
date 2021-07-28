const { readFile } = require("fs/promises");
const { resolve, dirname, relative } = require("path");
const files = {};

function rebaseLinks(chunk, cwd, newBase, oldBase = "") {
    return (chunk || "").replace(/\[([^\]]+)\]\((.*?)\)/g, (match, label, link) => {
        if (link.match(/([\w]+:)|\/\//))
            return match;
        return `[${label}](${newBase}${relative(cwd, resolve(oldBase, link))})`;
    });
}

function warn(txt) {
    console.warn(txt);
    return `<!-- ${txt} -->`;
}

async function docs(cwd, target, file, type) {
    const docfile = `docs/${file}`;
    const base = dirname(docfile);

    if (type === "&") {
        return `See the code documentation here: [scramjetorg/transform-hub/docs/${file}](${relative(dirname(target), docfile)})`;
    }

    const content = await readFile(resolve(cwd, docfile), "utf-8");
    const parts = content.split("## Table of contents\n");
    const outpart = rebaseLinks(parts[1], cwd, base);

    return `## Code documentation\n${outpart}`;
}

async function inject(cwd, source, target, line, lineNumber) {
    if (line[0] !== ">" || !"@!".includes(line[1]))
        return line;
    const cmd = line[1];
    const args = line.substr(2).split(" ");
    const name = args.shift();

    if (!name.match(/^\!?[\w-_\/]/i)) {
        return warn(`ERROR: Bad include: ${name} in ${lineNumber}`);
    }
    try {
        if (cmd === "!" && name === "docs") {
            return await docs(cwd, target, ...args);
        }
        if (cmd === "@") {
            if (!files[name]) {
                files[name] = await readFile(resolve(source, `${name}.md`), "utf-8");
            }
            return files[name];
        }
        return line;
    } catch (e) {
        return warn(`Error: ${e.message}`);
    }
}

module.exports = {
    rebaseLinks, warn, docs, inject
};
