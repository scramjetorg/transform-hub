import type { CommandDescriptor } from "@scramjet/config";
import { isDevelopment } from "../../utils/envs";

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
        { initCommand },
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
    const descriptors = [configCommand, scopeCommand, spaceCommand, hubCommand, sequenceCommand, instanceCommand, topicCommand, initCommand, storeCommand, utilCommand, apiCommand, logCommand];

    descriptors.push((await import("./completion")).completionCommand);
    if (isDevelopment()) descriptors.push((await import("./developerTools")).developerToolsCommand);
    return descriptors;
}
