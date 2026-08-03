import { cmd, type CommandDescriptor } from "@scramjet/config";
import { createWriteStream, lstatSync } from "fs";
import { displayEntity, displayMessage, displayObject } from "../output";
import { HostClient } from "@scramjet/api-client";
import { getHostClient, getReadStreamFromFile } from "../common";
import { getPackagePath, getSequenceId, profileManager, sessionConfig } from "../config";

import { PassThrough, Writable } from "stream";

import { resolve } from "path";
import { sequenceDelete, sequencePack, sequenceParseArgs, sequenceParseConfig, sequenceSendPackage, sequenceStart } from "../helpers/sequence";
import { ClientError } from "@scramjet/client-utils";
import { AppConfig, DeepPartial } from "@scramjet/runtime-types";
import { isStartSequenceEndpointPayloadDTO, merge } from "@scramjet/utility";
import { SequenceDeployArgs } from "../../types/params";
import { getNativeCapabilities } from "../capabilities";
import { configControlCommands } from "./configControls";

type NativeSequenceOperation = {
    result?: { sequence?: { id?: string }; instance?: { id?: string } };
};

function setNativeSequenceId(result: NativeSequenceOperation) {
    const id = result.result?.sequence?.id;
    if (!id) throw new Error("Native sequence upload did not return a sequence id");
    sessionConfig.setLastSequenceId(id);
    return id;
}

function validateStartupConfig(config: DeepPartial<SequenceDeployArgs>) {
    return isStartSequenceEndpointPayloadDTO(config);
}

/**
 * Handles the `seq prune` action.
 *
 * Clears session state (lastSequenceId, lastInstanceId) only after confirming
 * the sequence list is empty — never before a failed deletion/re-list.
 *
 * @param options - Command options (force flag).
 * @param hostClient - Host client for API calls (injectable for testing).
 */
export async function handlePruneAction(options: Record<string, unknown>, hostClient: HostClient): Promise<void> {
    const force = options.force as boolean;

    let seqs = await hostClient.listSequences();

    if (!seqs.length) {
        // Early-already-empty: clear stale session state.
        sessionConfig.setLastSequenceId("");
        sessionConfig.setLastInstanceId("");
        displayMessage("Sequence list is empty, nothing to delete.");
        return;
    }

    // Attempt deletions sequentially (no fail-fast) to prevent adapter/shared-package cleanup races.
    // Every sequence is attempted regardless of prior failures; per-ID/reason diagnostics are retained.
    const deletionResults: PromiseSettledResult<void>[] = [];

    for (const seq of seqs) {
        try {
            await hostClient.deleteSequence(seq.id, { force });
            deletionResults.push({ status: "fulfilled", value: undefined });
        } catch (reason) {
            deletionResults.push({ status: "rejected", reason });
        }
    }

    // Extract rejection diagnostics for actionable error reporting.
    const failures: { id: string; reason: unknown }[] = [];

    for (let i = 0; i < deletionResults.length; i++) {
        if (deletionResults[i].status === "rejected") {
            failures.push({ id: seqs[i].id, reason: (deletionResults[i] as PromiseRejectedResult).reason });
        }
    }

    // Re-list after all deletions complete.
    seqs = await hostClient.listSequences();

    if (seqs.length) {
        // Sequences remain — preserve the failure with full diagnostics.
        const remainingIds = seqs.map((s) => s.id).join(", ");
        const attempted = deletionResults.length;

        let message = `Some Sequences may have not been deleted. Attempted ${attempted} deletion(s).`;

        if (failures.length > 0) {
            message += ` Failed: [${failures.map(
                (f) => `${f.id} (${f.reason instanceof Error ? f.reason.message : String(f.reason)})`
            ).join("; ")}].`;
        }

        message += ` Remaining: [${remainingIds}].`;

        if (process.env.NODE_ENV === "development") {
            for (const f of failures) {
                if (f.reason instanceof Error && f.reason.stack) {
                    displayMessage(`Deletion error for ${f.id}:`, f.reason.stack);
                } else {
                    displayMessage(`Deletion error for ${f.id}:`, String(f.reason));
                }
            }
        }

        throw new Error(message);
    }

    // Only clear session state after confirmed empty re-list.
    sessionConfig.setLastSequenceId("");
    sessionConfig.setLastInstanceId("");

    displayMessage("Sequences removed successfully.");
}

/**
 * Builds the `sequence` command descriptor tree.
 */
export const sequenceCommand: CommandDescriptor = cmd("sequence", (b) => {
    b
        .alias("seq")
        .usage("[command] [options...]")
        .desc("Operations on a Sequence package, consisting of one or more functions executed one after another")
        .children(
            cmd("list", (c) => {
                c
                    .alias("ls")
                    .desc("List all Sequences available on Hub")
                    .option("-n, --name <sequence-name>", "list id's of sequences with a given name")
                    .action(async (options: Record<string, unknown>) => {
                        const name = options.name as string;

                        const native = getNativeCapabilities();
                        if (native) return await displayEntity(native.json("GET", "/api/v2/sequences"), profileManager.getProfileConfig().format);
                        if (name) return await displayEntity(await getHostClient().getSequenceId(name), profileManager.getProfileConfig().format);
                        return await displayEntity(getHostClient().listSequences(), profileManager.getProfileConfig().format);
                    });
            }),
            cmd("use", (c) => {
                c
                    .alias("select")
                    .desc("Select the Sequence to communicate with by using '-' alias instead of Sequence id")
                    .argument("<id>", "Sequence id")
                    .action(async (id: string) => {
                        try {
                            const native = getNativeCapabilities();
                            if (native) await native.json("GET", `/api/v2/sequences/${encodeURIComponent(id)}`);
                            else await getHostClient().getSequence(id);
                        } catch (error) {
                            if (error instanceof ClientError && error.code === "NOT_FOUND") {
                                error.message = `Unable to find sequence ${id}`;
                            }
                            throw error;
                        }

                        sessionConfig.setLastSequenceId(id);
                    });
            }),
            cmd("info", (c) => {
                c
                    .argument("<id>", "Sequence id to start or '-' for the last uploaded")
                    .desc("Display a basic information about the Sequence")
                    .action(async (id: string) => { const native = getNativeCapabilities(); return displayEntity(native ? native.json("GET", `/api/v2/sequences/${encodeURIComponent(getSequenceId(id))}`) : getHostClient().getSequence(getSequenceId(id)), profileManager.getProfileConfig().format); });
            }),
            cmd("pack", (c) => {
                c
                    .argument("<path>")
                    .option("-c, --stdout", "Output to stdout (ignores -o)")
                    .option("-o, --output <file.tar.gz>", "Output path - defaults to dirname")
                    .desc("Create archived file (package) with the Sequence for later use")
                    .completer({ path: "filenames", output: "dirnames" })
                    .action((path: string, options: Record<string, unknown>) => {
                        const stdout = options.stdout as boolean;
                        const fileoutput = options.output as string;
                        const outputPath: string = fileoutput ? resolve(fileoutput) : `${resolve(path)}.tar.gz`;
                        const output: Writable = stdout ? process.stdout : createWriteStream(outputPath);

                        if (!stdout)
                            sessionConfig.setLastPackagePath(outputPath);

                        return sequencePack(path, { output });
                    });
            }),
            cmd("send", (c) => {
                c
                    .argument("<package>", "The file or directory to upload or '-' to use the last packed. If directory, it will be packed and sent.")
                    .desc("Send the Sequence package to the Hub")
                    .completer({ package: "filenames" })
                    .action(
                        async (sequencePackage: string) => {
                            const native = getNativeCapabilities();
                            const sequenceClient = native
                                ? await native.upload<NativeSequenceOperation>("POST", "/api/v2/sequences", await getReadStreamFromFile(getPackagePath(sequencePackage)))
                                : await sequenceSendPackage(sequencePackage, {}, false, { progress: undefined });
                            // Note: --progress is a global option on root command

                            if (native) setNativeSequenceId(sequenceClient as NativeSequenceOperation);
                            displayObject(sequenceClient, profileManager.getProfileConfig().format);
                        }
                    );
            }),
            cmd("update", (c) => {
                c
                    .argument("<query>", "Sequence id to be overwritten")
                    .argument("<package>", "The file to upload")
                    .desc("Update Sequence with given name")
                    .completer({ package: "filenames" })
                    .action(
                        async (query: string, sequencePackage: string) => {
                            const native = getNativeCapabilities();
                            const sequenceClient = native
                                ? await native.upload<NativeSequenceOperation>("PUT", `/api/v2/sequences/${encodeURIComponent(getSequenceId(query))}`, await getReadStreamFromFile(getPackagePath(sequencePackage)))
                                : await sequenceSendPackage(sequencePackage, { id: query }, true);

                            if (native) setNativeSequenceId(sequenceClient as NativeSequenceOperation);
                            displayObject(sequenceClient, profileManager.getProfileConfig().format);
                        }
                    );
            }),
            cmd("start", (c) => {
                c
                    .argument("<id>", "Sequence id to start or '-' for the last uploaded")
                    .option("-f, --config-file <path-to-file>", "Path to configuration file in JSON or YAML format to be passed to the Instance context")
                    .option("-s, --config-string <json-string>", "Configuration in JSON format to be passed to the Instance context")
                    .option("--inst-id <string>", "Start Sequence with a custom Instance Id. Should consist of 36 characters")
                    .option("--output-topic <string>", "Topic to which the output stream should be routed")
                    .option("--input-topic <string>", "Topic to which the input stream should be routed")
                    .option("--args <json-string>", "Arguments to be passed to the first function in the Sequence")
                    .option("--startup-config <path-to-config>", "Path to startup config (JSON or YAML)")
                    .option("--limits <json-string>", "Instance limits")
                    .desc("Start the Sequence with or without given arguments")
                    .completer({ configFile: "filenames" })
                    .action(async (id: string, options: Record<string, unknown>) => {
                        const startupConfig = options.startupConfig as DeepPartial<SequenceDeployArgs> | undefined;
                        const configFile = options.configFile as string;
                        const configString = options.configString as string;
                        const outputTopic = options.outputTopic as string;
                        const inputTopic = options.inputTopic as string;
                        const argsStr = options.args as string;
                        const limitsStr = options.limits as string;
                        const instanceId = options.instId as string;

                        const args = argsStr ? sequenceParseArgs(argsStr) : undefined;
                        const appConfig = await sequenceParseConfig(configFile, configString);
                        const limits = limitsStr ? JSON.parse(limitsStr) : {};

                        const mergedConfig: DeepPartial<SequenceDeployArgs> = startupConfig || {};

                        merge(mergedConfig, {
                            appConfig,
                            args,
                            instanceId,
                            inputTopic,
                            outputTopic,
                            limits
                        });

                        if (!validateStartupConfig(mergedConfig)) {
                            throw new Error("Invalid startup config");
                        }
                        const native = getNativeCapabilities();
                        const startPayload = { args: mergedConfig.args, config: { ...mergedConfig, args: undefined } };
                        const instanceClient = native ? await native.json("POST", `/api/v2/sequences/${encodeURIComponent(getSequenceId(id))}/instances`, startPayload) : await sequenceStart(id, {
                            appConfig: mergedConfig.appConfig as AppConfig,
                            args: mergedConfig.args,
                            limits: mergedConfig.limits,
                            instanceId: mergedConfig.instanceId,
                            instanceName: mergedConfig.instanceName,
                            sequenceName: mergedConfig.sequenceName,
                            outputTopic: mergedConfig.outputTopic,
                            inputTopic: mergedConfig.inputTopic
                        });

                        if (native && (instanceClient as NativeSequenceOperation).result?.instance?.id) sessionConfig.setLastInstanceId((instanceClient as NativeSequenceOperation).result!.instance!.id!);
                        displayObject(instanceClient, profileManager.getProfileConfig().format);
                    });
            }),
            cmd("deploy", (c) => {
                c
                    .alias("run")
                    .argument("<path>")
                    .option("-o, --output <file.tar.gz>", "Output path - defaults to dirname")
                    .option("-f, --config-file <path-to-file>", "Path to configuration file in JSON or YAML format to be passed to the Instance context")
                    .option("-s, --config-string <json-string>", "Configuration in JSON format to be passed to the Instance context")
                    .option("--inst-id <string>", "Start Sequence with a custom Instance Id. Should consist of 36 characters")
                    .option("--output-topic <string>", "Topic to which the output stream should be routed")
                    .option("--input-topic <string>", "Topic to which the input stream should be routed")
                    .option("--args <json-string>", "Arguments to be passed to the first function in the Sequence")
                    .option("--startup-config <path-to-config>", "Path to startup config (JSON or YAML)")
                    .option("--limits <json-string>", "Instance limits")
                    .desc("Pack (if needed), send and start the Sequence")
                    .completer({ path: "dirnames", output: "dirnames", configFile: "filenames" })
                    .action(async (path: string, options: Record<string, unknown>) => {
                        const startupConfig = options.startupConfig as DeepPartial<SequenceDeployArgs> | undefined;
                        const output = options.output as string;
                        const configFile = options.configFile as string;
                        const configString = options.configString as string;
                        const outputTopic = options.outputTopic as string;
                        const inputTopic = options.inputTopic as string;
                        const argsStr = options.args as string;
                        const limitsStr = options.limits as string;
                        const instId = options.instId as string;

                        const args = argsStr ? sequenceParseArgs(argsStr) : undefined;
                        const appConfig = await sequenceParseConfig(configFile, configString);
                        const limits = limitsStr ? JSON.parse(limitsStr) : {};

                        const mergedConfig: DeepPartial<SequenceDeployArgs> = startupConfig || {};

                        merge(mergedConfig, {
                            output,
                            appConfig,
                            args,
                            instanceId: instId,
                            inputTopic,
                            outputTopic,
                            limits
                        });

                        if (!validateStartupConfig(mergedConfig)) {
                            throw new Error("Invalid startup config");
                        }

                        const compressedPackageStream = new PassThrough();

                        if (mergedConfig.output) {
                            const outputPath = mergedConfig.output ? resolve(mergedConfig.output) : `${resolve(path)}.tar.gz`;

                            compressedPackageStream.pipe(createWriteStream(outputPath));
                            sessionConfig.setLastPackagePath(outputPath);
                        }
                        const format = profileManager.getProfileConfig().format;

                        const native = getNativeCapabilities();
                        if (lstatSync(path).isDirectory()) {
                            const sendSeqPromise = native
                                ? native.upload<NativeSequenceOperation>("POST", "/api/v2/sequences", compressedPackageStream).then(setNativeSequenceId)
                                : getHostClient().sendSequence(compressedPackageStream).then(seq => {
                                    sessionConfig.setLastSequenceId(seq.id);
                                });

                            await sequencePack(path, { output: compressedPackageStream });
                            await sendSeqPromise;
                        } else {
                            const sequenceClient = native
                                ? await native.upload<NativeSequenceOperation>("POST", "/api/v2/sequences", await getReadStreamFromFile(getPackagePath(path)))
                                : await sequenceSendPackage(path, {}, false, { progress: undefined });
                            // Note: --progress is a global option on root command

                            if (native) setNativeSequenceId(sequenceClient as NativeSequenceOperation);
                            displayObject(sequenceClient, format);
                        }

                        const startPayload = { args: mergedConfig.args, config: { ...mergedConfig, args: undefined } };
                        const instanceClient = native
                            ? await native.json("POST", `/api/v2/sequences/${encodeURIComponent(getSequenceId("-"))}/instances`, startPayload)
                            : await sequenceStart("-", {
                                appConfig: mergedConfig.appConfig as AppConfig,
                                args: mergedConfig.args,
                                limits: mergedConfig.limits,
                                instanceId: mergedConfig.instanceId,
                                instanceName: mergedConfig.instanceName,
                                sequenceName: mergedConfig.sequenceName,
                                outputTopic: mergedConfig.outputTopic,
                                inputTopic: mergedConfig.inputTopic
                            });

                        if (native && (instanceClient as NativeSequenceOperation).result?.instance?.id) sessionConfig.setLastInstanceId((instanceClient as NativeSequenceOperation).result!.instance!.id!);
                        displayObject(instanceClient, format);
                    });
            }),
            cmd("delete", (c) => {
                c
                    .alias("rm")
                    .argument("<id>", "The Sequence id to remove or '-' for the last uploaded")
                    .option("-f, --force", "Forcefully removes The Sequence by killing its Instances")
                    .desc("Removes the Sequence from the Hub")
                    .action(async (id: string, options: Record<string, unknown>) => {
                        const force = options.force as boolean;

                        const native = getNativeCapabilities();
                        const sequenceId = getSequenceId(id);
                        const deletion = native ? native.json("DELETE", `/api/v2/sequences/${encodeURIComponent(sequenceId)}`, undefined, force ? { "x-seq-kill-inst": "true" } : {}) : sequenceDelete(id, { force });
                        const result = await deletion;
                        if (native && sessionConfig.lastSequenceId === sequenceId) sessionConfig.setLastSequenceId("");
                        displayObject(result, profileManager.getProfileConfig().format);
                    });
            }),
            cmd("prune", (c) => {
                c
                    .option("-f, --force", "Removes also active Sequences (with its running Instances)")
                    .desc("Remove all Sequences from the Hub (use with caution)")
                    .action(async (options: Record<string, unknown>) => {
                        const native = getNativeCapabilities();
                        if (!native) return await handlePruneAction(options, getHostClient());
                        const force = options.force as boolean;
                        const listed = await native.json<{ items: { id: string }[] }>("GET", "/api/v2/sequences");
                        if (!listed.items.length) {
                            sessionConfig.setLastSequenceId("");
                            sessionConfig.setLastInstanceId("");
                            displayMessage("Sequence list is empty, nothing to delete.");
                            return;
                        }
                        const failures: { id: string; reason: unknown }[] = [];
                        for (const sequence of listed.items) {
                            try {
                                await native.json("DELETE", `/api/v2/sequences/${encodeURIComponent(sequence.id)}`, undefined, force ? { "x-seq-kill-inst": "true" } : {});
                            } catch (reason) {
                                failures.push({ id: sequence.id, reason });
                            }
                        }
                        const remaining = await native.json<{ items: { id: string }[] }>("GET", "/api/v2/sequences");
                        if (remaining.items.length) {
                            const failed = failures.map(({ id, reason }) => `${id} (${reason instanceof Error ? reason.message : String(reason)})`).join("; ");
                            throw new Error(`Some Sequences may have not been deleted. Attempted ${listed.items.length} deletion(s).${failed ? ` Failed: [${failed}].` : ""} Remaining: [${remaining.items.map(sequence => sequence.id).join(", ")}].`);
                        }
                        sessionConfig.setLastSequenceId("");
                        sessionConfig.setLastInstanceId("");
                        displayMessage("Sequences removed successfully.");
                    });
            }),
            configControlCommands("sequence")
        );
});
