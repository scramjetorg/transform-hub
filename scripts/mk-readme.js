#!/usr/bin/env node
/* eslint-disable no-return-assign */

const { createReadStream, createWriteStream, readFileSync } = require("fs");
const glob = require("glob");
const { resolve, dirname, relative, } = require("path");
const { DataStream, StringStream } = require("scramjet");
const { rebaseLinks, inject } = require("./lib/readme-helpers");
const pattern = process.argv[2] || "**/src/readme.mtpl";
const cwd = resolve(__dirname, "../");
const source = process.argv[3] ? resolve(process.cwd(), process.argv[3]) : resolve(cwd, "conf/readme-parts");
const pkg = JSON.parse(readFileSync(resolve(cwd, "package.json")));

DataStream.from(async function() {
    const out = new DataStream();
    const g = new glob.Glob(
        pattern,
        { cwd, nodir: true, ignore: ["**/.git", "**/node_modules/**"] }
    );

    g.on("match", (match) => {
        if (match && !out.write(match)) {
            g.pause();
            out.once("drain", () => g.resume());
        }
    });
    g.on("end", () => out.end());

    return out;
})
    .map(file => {
        const src = resolve(cwd, file);
        const target = relative(cwd, resolve(file, "../../README.md"));
        const dest = resolve(cwd, target);

        return { file, target, src, dest };
    })
    .do(async ({ target, file, src, dest }) => {
        let num = 0;

        return new Promise((res, rej) =>
            StringStream
                .from(createReadStream(src, "utf-8"))
                .lines()
                .map(line => inject(cwd, source, target, line, `${file}:${++num}`))
                .append("\n")
                .lines()
                .map(x => rebaseLinks(x, cwd, pkg.repository.url.replace(/\.git$/, "/tree/HEAD/"), dirname(target)))
                .append("\n")
                .catch(rej)
                .pipe(createWriteStream(dest, "utf-8"))
                .on("error", rej)
                .on("finish", res)
        );
    })
    .do(({ file, target }) => console.error(`+ Processed ${file} -> ${target}`))
    .run()
    .catch(e => {
        console.error(e.stack);
        process.exitCode = 10;
    })
;

