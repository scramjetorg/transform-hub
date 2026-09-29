import type { CommandDescriptor } from "@scramjet/config";
import { cmd } from "@scramjet/config";
import { isDevelopment } from "../../utils/envs";
import { generateSiIdentity, installSiIdentity } from "../si-identity-enrollment";

/** Build descriptors only after CLI configuration has selected the active profile. */
export async function getCommandDescriptors(): Promise<CommandDescriptor[]> {
    const [
        { configCommand },
        { scopeCommand },
        { spaceCommand },
        { hubCommand },
        { sequenceCommand },
        { instanceCommand },
        { topicCommand },
        { initCommand, scaffoldCommand },
        { storeCommand },
        { utilCommand },
        { apiCommand },
        { logCommand }
    ] = await Promise.all([
        import("./config"),
        import("./scope"),
        import("./space"),
        import("./hub"),
        import("./sequence"),
        import("./instance"),
        import("./topic"),
        import("./init"),
        import("./store"),
        import("./util"),
        import("./api"),
        import("./log")
    ]);
    const stringOption = (name: string, description: string) => ({ name, flag: name, type: "string" as const, required: true, description });
    const identityCommand = cmd("identity", b => b.desc("Manage the local si identity").children(
        cmd("enroll", e => e.desc("Offline csr/v2 identity enrollment").children(
            cmd("generate", c => c.option(stringOption("identity-dir", "Local identity directory")).option(stringOption("registrations", "Exact broker registration set JSON")).option(stringOption("output", "Request output file")).action(generateSiIdentity)),
            cmd("install", c => c.option(stringOption("identity-dir", "Local identity directory")).option(stringOption("request", "csr/v2 request file")).option(stringOption("certificate", "Signed certificate PEM file")).option(stringOption("ca-file", "Pinned Manager CA certificate")).option(stringOption("ca-fingerprint", "Pinned Manager CA SHA-256 fingerprint")).action(installSiIdentity))
        ))
    ).build());
    const descriptors = [configCommand, scopeCommand, spaceCommand, hubCommand, sequenceCommand, instanceCommand, topicCommand, initCommand, scaffoldCommand, storeCommand, utilCommand, apiCommand, logCommand, identityCommand];

    descriptors.push((await import("./completion")).completionCommand);
    if (isDevelopment()) descriptors.push((await import("./developerTools")).developerToolsCommand);
    return descriptors;
}
