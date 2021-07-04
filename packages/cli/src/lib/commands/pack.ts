import { readdir, access } from "fs/promises";
import { PathLike, createReadStream, createWriteStream } from "fs";
import { CommandDefinition } from "../../types";
import { c } from "tar";
import { resolve } from "path";
import { R_OK, F_OK } from "constants";
import { StringStream } from "scramjet";
import { filter as mmfilter } from "minimatch";

const getIgnoreFunction = async (file: PathLike) => {
    try {
        await access(file, R_OK);
    } catch {
        return () => true;
    }

    const rules: ReturnType<typeof mmfilter>[] =
        await StringStream.from(createReadStream(file))
            .lines()
            .filter((line:string) => line.substr(0, line.indexOf("#")).trim() === "")
            .parse((line: string) => mmfilter(line))
            .catch(() => undefined)
            .toArray()
        ;
    const fakeArr: string[] = [];

    return (f: string) => !rules.find(x => x(f, 0, fakeArr));
};

export const pack: CommandDefinition = (program) => {
    const packProgram = program
        .command("pack <directory>")
        .option("-c, --stdout", "output to stdout (ignores -o)")
        .option("-o, --output <file.tar.gz>", "output path - defaults to dirname");

    packProgram.action(async (directory, { stdout, output }) => {
        const cwd = resolve(process.cwd(), directory);
        const target = stdout ? process.stdout : createWriteStream(output
            ? resolve(process.cwd(), output)
            : `${cwd}.tar.gz`);
        const packageLocation = resolve(cwd, "package.json");
        const ignoreLocation = resolve(cwd, ".siignore");

        await access(packageLocation, F_OK | R_OK);
        // TODO: error handling?
        // TODO: check package contents?

        const filter = await getIgnoreFunction(ignoreLocation);
        const out = c(
            {
                gzip: true,
                cwd,
                filter
            },
            await readdir(directory)
        )
            .pipe(target);

        await new Promise((res, rej) => {
            out.on("finish", res);
            out.on("error", rej);
        });
    });
};
