import path = require("path");
import { spawn, ChildProcess } from "child_process";
import { strict as assert } from "assert";
import { ClientUtils } from "@scramjet/client-utils";
import { prettyPrint } from "@scramjet/obj-logger";
import { StringStream } from "scramjet";
import { Readable } from "stream";

async function requestGet(apiBase: string, apiEndpoint: string): Promise<{[key: string]: any}> {
    const utils = new ClientUtils(apiBase);

    return await utils.get<any>(apiEndpoint);
}

async function requestPost(
    apiBase: string, apiEndpoint: string, body: string | {[key: string]: any}
): Promise<{[key: string]: any}> {
    const utils = new ClientUtils(apiBase);
    const parsedBody = body.length > 0 ? JSON.parse(body as string) : body;

    return await utils.post<any>(apiEndpoint, parsedBody, {}, { json: true, parse: "json" });
}

function getExecutableCmd(packageName: string): string[] {
    const sourcePath = `../packages/${ packageName }/src/bin/start.ts`;
    const builtPath = `../dist/${ packageName }/bin/start.js`;

    return process.env.SCRAMJET_SPAWN_TS
        ? ["npx", "ts-node", path.resolve(process.cwd(), sourcePath)]
        : ["node", path.resolve(process.cwd(), builtPath)];
}

function spawnProcess(
    command: string[],
    options: {[key: string]: any},
    waitMS = 0,
    stdoutDoneMatch?: string
): Promise<ChildProcess> {
    return new Promise((resolve) => {
        const fullCommand = [...command];

        for (const [name, value] of Object.entries(options)) {
            fullCommand.push(name, value);
        }

        const cmdProcess = spawn("/usr/bin/env", fullCommand, { detached: false });

        if (stdoutDoneMatch) {
            const onStdout = (data: any) => {
                if (data.toString().includes(stdoutDoneMatch)) {
                    cmdProcess.stdout.off("data", onStdout);

                    setTimeout(() => {
                        resolve(cmdProcess);
                    }, waitMS);
                }
            };

            cmdProcess.stdout.on("data", onStdout);
        } else {
            setTimeout(() => {
                resolve(cmdProcess);
            }, waitMS);
        }

        cmdProcess.stdout?.pipe(process.stdout);
        cmdProcess.stderr?.pipe(process.stderr);
    });
}

function stopProcess(childProcess: ChildProcess): Promise<void> {
    return new Promise((resolve) => {
        if (childProcess && childProcess.pid !== undefined) {
            childProcess.once("exit", () => resolve());
            childProcess.kill("SIGTERM");
        } else {
            resolve();
        }
    });
}

function parseOptions(options: string): {[key: string]: any} {
    return options
        .split("--")
        .filter(optionStr => optionStr.length > 0)
        .map(optionStr => optionStr.split(" "))
        .reduce((result: {[key: string]: any}, optionArr) => {
            result[`--${optionArr[0].trim()}`] = optionArr[1].trim();
            return result;
        }, {});
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

function parseExpectedData(data: string) {
    const expectedData: { data: {[key: string]: any}, fields: string[]} = {
        data: {},
        fields: []
    };

    if (data.startsWith("{") && data.endsWith("}")) {
        expectedData.data = JSON.parse(data) as {[key: string]: any};
    } else if (data.startsWith("[")) {
        expectedData.data = JSON.parse(data.slice(1, -1)) as {[key: string]: any};
    } else {
        expectedData.fields = data.split(",");
    }

    return expectedData;
}

function assertResponseData(response: {[key: string]: any}, expectedResponse: string) {
    const expectedData = parseExpectedData(expectedResponse);

    if (expectedData.fields.length === 0) {
        Object.entries(expectedData.data).forEach(entry => {
            if (!(response[entry[0]] && response[entry[0]] === entry[1])) {
                assert.fail(
                    `Response does not contain expected data of "${entry[0]}: ${[entry[1]]}". ` +
                    `But contains "${entry[0]}: ${response[entry[0]]}" instead.`);
            }
        });
    } else {
        expectedData.fields.forEach(field => {
            if (response[field] === undefined) {
                assert.fail(`Response does not contain field "${field}".`);
            }
        });
    }
}

function displayColorLogs(resp: Readable) {
    const parser = prettyPrint({ colors: true });

    StringStream.from(resp)
        .lines()
        .parse(x => {
            try {
                return JSON.parse(x);
            } catch {
                return undefined;
            }
        })
        .stringify(parser)
        .pipe(process.stdout);
}

export {
    displayColorLogs,
    requestGet,
    requestPost,
    getExecutableCmd,
    spawnProcess,
    stopProcess,
    parseOptions,
    sleep,
    assertResponseData
};
