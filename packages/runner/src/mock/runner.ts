import { StringStream } from "scramjet";
import { RunnerOptions } from "@scramjet/types";
import { RunnerMessage, RunnerMessageCode } from "@scramjet/model";

class Runner {
    options: RunnerOptions;

    private readonly MOCK_MESSAGE: RunnerMessage = [
        RunnerMessageCode.ALIVE,
        {
            healthy: true
        }
    ]

    private statusIntervalHandle: any;

    constructor(options: RunnerOptions) {
        this.options = options;
    }

    stream(): void {
        StringStream.from(process.stdin)
            .lines()
            .map((input: string) => this.getPayload(input))
            .map((payload: RunnerMessage) => this.readPayload(payload))
            .append("\n")
            .pipe(process.stdout);
    }

    getPayload(line: string): RunnerMessage {
        let data: RunnerMessage = [0, {}];

        try {
            data = JSON.parse(line);
        } catch (ignore) { /**/ }

        return data;
    }

    readPayload(payload: RunnerMessage): string {
        let response: RunnerMessage = [
            RunnerMessageCode.ACKNOWLEDGE,
            { received: payload[0] || "unknown message" }
        ];

        if (payload[0] === RunnerMessageCode.KILL) {
            this.handleKillRequest();
        }

        if (payload[0] === RunnerMessageCode.PING) {
            response = [
                RunnerMessageCode.PONG,
                {}
            ];
        }

        return JSON.stringify(response);
    }

    logger(): void {
        process.stdout.write(
            JSON.stringify(this.MOCK_MESSAGE) + "\n",
            "utf8"
        );
    }

    handleKillRequest(): void {
        this.stopMonitoring();
        process.exit(0);
    }

    start(): void {
        this.stream();

        if (this.options.monitoringInterval) {
            this.startMonitoring();
        }
    }

    startMonitoring(): void {
        if (this.options.monitoringInterval) {
            this.statusIntervalHandle = setInterval(
                this.logger.bind(this),
                this.options.monitoringInterval
            );
        }
    }

    stopMonitoring(): void {
        clearInterval(this.statusIntervalHandle);
    }
}

export { Runner, RunnerMessageCode, RunnerMessage, RunnerOptions };
