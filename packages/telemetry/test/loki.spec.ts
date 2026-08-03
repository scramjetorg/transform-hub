import test, { ExecutionContext } from "ava";
import { TelemetryAdaptersConfig } from "@scramjet/api-types";
import LokiAdapter from "../src/adapters/loki";

const config: TelemetryAdaptersConfig = {
    loki: {
        host: "http://127.0.0.1:1",
        replaceTimestamp: false,
        interval: 0.001,
        labels: { service: "telemetry-test" }
    }
};

type LokiTransport = {
    batcher: {
        close(): void;
        options: {
            host: string;
            replaceTimestamp: boolean;
            onConnectionError?: (error: Error) => void;
        };
    };
};

const createAdapter = (t: ExecutionContext) => {
    const adapter = new LokiAdapter(config);
    const transport = adapter.winstonLogger.transports[0] as unknown as LokiTransport;

    t.teardown(() => transport.batcher.close());

    return { adapter, transport };
};

test("constructs a Loki transport with the supplied host and timestamp replacement", t => {
    const { adapter, transport } = createAdapter(t);

    t.is(adapter.config, config.loki);
    t.is(transport.batcher.options.host, config.loki!.host);
    t.true(transport.batcher.options.replaceTimestamp);
});

test("push forwards the payload to the requested Winston log level", t => {
    const { adapter } = createAdapter(t);
    const calls: unknown[][] = [];

    adapter.winstonLogger = {
        info: (...args: unknown[]) => calls.push(args)
    } as unknown as typeof adapter.winstonLogger;

    adapter.push("info", { message: "sequence started", labels: { sequence: "example" } });

    t.deepEqual(calls, [[{ message: "sequence started", labels: { sequence: "example" } }]]);
});

test("connection errors are forwarded to the adapter logger", t => {
    const { adapter, transport } = createAdapter(t);
    const calls: unknown[][] = [];
    const error = new Error("Loki unavailable");

    adapter.logger.error = (...args: unknown[]) => calls.push(args);
    transport.batcher.options.onConnectionError!(error);

    t.deepEqual(calls, [["Telemetry connection error", error]]);
});
