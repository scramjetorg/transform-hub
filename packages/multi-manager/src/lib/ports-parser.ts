import { InvalidOptionArgumentError } from "commander";

/**
 * Parses ports range in [0-9]-[0-9] format to array of numbers
 * @param value ports range in [0-9]-[0-9]
 * @returns Ports in array of numbers
 */
export function portsParser(value: string): [number, number] {
    const match = (/^([0-9]+)-([0-9]+)$/).exec(value);

    if (!match) {
        throw new InvalidOptionArgumentError("Ports range have to be in [0-9]-[0-9] format");
    }

    const ports = [match[1], match[2]].map(portStr => {
        const parsedPort = parseInt(portStr, 10);

        if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
            throw new InvalidOptionArgumentError("Port has to be a valid integer in range 1-65535");
        }

        return parsedPort;
    }) as [number, number];

    if (ports[0] > ports[1]) {
        throw new InvalidOptionArgumentError("Left hand side of ports range should be lower than right hand side");
    }

    return ports;
}
