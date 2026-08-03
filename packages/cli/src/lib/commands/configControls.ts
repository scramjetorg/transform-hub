import { cmd, type CommandDescriptor } from "@scramjet/config";
import { CapabilityUnavailableError, getNativeCapabilities } from "../capabilities";
import { profileManager } from "../config";
import { displayEntity } from "../output";

/**
 * Registers the intentionally unsupported v2 config-control surface.  These
 * leaves reserve the approved command paths without silently using v1 HTTP.
 */
export function configControlCommands(resource: string): CommandDescriptor {
    const unavailable = (operation: string) => () => {
        throw new CapabilityUnavailableError(`${resource} config ${operation} (native v2 has no config operation)`);
    };
    const get = () => {
        if (resource !== "hub") return unavailable("get")();
        const native = getNativeCapabilities();
        if (!native) return unavailable("get")();
        return displayEntity(native.json("GET", "/api/v2/config"), profileManager.getProfileConfig().format);
    };

    return cmd("config", config => config
        .desc(`Configuration control for the ${resource}`)
        .children(
            cmd("get", getCommand => getCommand.desc(`Get ${resource} configuration`).action(get)),
            cmd("set", set => set.argument("<patch>", "JSON configuration patch").desc(`Set ${resource} configuration`).action(unavailable("set"))),
            cmd("reload", reload => reload.desc(`Reload ${resource} configuration`).action(unavailable("reload")))
        ));
}
