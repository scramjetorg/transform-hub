import { HostError } from "@scramjet/model";
import { FileBuilder, isStartSequenceDTO } from "@scramjet/utility";
import { StartSequenceDTO } from "./types/from-types";

/** Load and validate the deliberately small, non-secret startup manifest. */
export function readStartupConfig(path: string): StartSequenceDTO[] {
    let config: any;

    try {
        config = FileBuilder(path).read();
    } catch {
        throw new HostError("SEQUENCE_STARTUP_CONFIG_READ_ERROR");
    }

    if (!config || !Array.isArray(config.sequences)) {
        throw new HostError("SEQUENCE_STARTUP_CONFIG_READ_ERROR", "Startup config doesn't contain array of sequences");
    }

    for (const sequence of config.sequences) {
        if (!isStartSequenceDTO(sequence)) {
            throw new HostError("SEQUENCE_STARTUP_CONFIG_READ_ERROR", "Startup config contains an invalid sequence entry");
        }
    }

    return config.sequences;
}
