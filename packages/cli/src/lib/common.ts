import { InstanceClient, HostClient } from "@scramjet/api-client";
import { Command } from "commander";
import { access, readdir } from "fs/promises";
import { createReadStream, createWriteStream, constants, PathLike } from "fs";
import { resolve } from "path";
import { displayEntity } from "./output";
import { c } from "tar";
import { StringStream } from "scramjet";
import { filter as mmfilter } from "minimatch";

const { F_OK, R_OK } = constants;

let hostClient: HostClient;

export const getHostClient = (program: Command) => {
    if (hostClient) return hostClient;

    hostClient = new HostClient(program.opts().apiUrl);

    if (program.opts().log)
        hostClient.client.addLogger({
            ok(result) {
                const {
                    status, statusText, url
                } = result;

                // eslint-disable-next-line no-console
                console.error("Request ok:", url, `status: ${status} ${statusText}`);
            },
            error(error) {
                const { code, reason: result } = error;
                const { message } = result || {};

                // eslint-disable-next-line no-console
                console.error(`Request failed with code "${code}" status: ${message}`);
            }
        });
    return hostClient;
};
export const getInstance = (program: Command, id: string) => InstanceClient.from(id, getHostClient(program));
export const attachStdio = (program: Command, instance: InstanceClient) => {
    return displayEntity(
        program,
        Promise.all([
            instance.sendStdin(process.stdin),
            instance.getStream("stdout").then(out => out.data?.pipe(process.stdout)),
            instance.getStream("stderr").then(err => err.data?.pipe(process.stderr))
        ]).then(() => undefined)
    );
};
export const getIgnoreFunction = async (file: PathLike) => {
    try {
        await access(file, R_OK);
    } catch {
        return () => true;
    }

    const rules: ReturnType<typeof mmfilter>[] =
        await StringStream.from(createReadStream(file))
            .lines()
            .filter((line: string) => line.substr(0, line.indexOf("#")).trim() === "")
            .parse((line: string) => mmfilter(line))
            .catch(() => undefined)
            .toArray()
        ;
    const fakeArr: string[] = [];

    return (f: string) => !rules.find(x => x(f, 0, fakeArr));
};
export const packAction = async (directory: string, { stdout, output }: { stdout: boolean, output: string }) => {
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
};
