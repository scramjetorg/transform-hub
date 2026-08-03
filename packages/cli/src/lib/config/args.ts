export type ConfigSelection = {
    kind: "path" | "readonly-path";
    value: string;
};

/**
 * Read root-level configuration flags without mistaking child-command flags
 * (for example `si seq send -c`) for CLI configuration selection.
 */
export function parseConfigSelection(args: string[]): ConfigSelection | undefined {
    for (let index = 0; index < args.length; index++) {
        const arg = args[index];

        if (!arg.startsWith("-")) break;

        if (arg === "-c" || arg === "--config" || arg === "--config-path") {
            const value = args[index + 1];

            if (!value || value.startsWith("-")) {
                throw new Error(`${arg} argument missing`);
            }

            return {
                kind: arg === "--config-path" ? "readonly-path" : "path",
                value
            };
        }

        const separator = arg.indexOf("=");

        if (separator > 0) {
            const name = arg.slice(0, separator);

            if (name === "-c" || name === "--config" || name === "--config-path") {
                const value = arg.slice(separator + 1);

                if (!value) throw new Error(`${name} argument missing`);

                return {
                    kind: name === "--config-path" ? "readonly-path" : "path",
                    value
                };
            }
        }
    }

    return undefined;
}
