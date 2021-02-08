import { StringStream } from "scramjet";

enum RunnerMessageCode {
    PONG = 3000,
    ACKNOWLEDGE = 3004,
    PING = 4000,
    STOP = 4001,
    KILL = 4002,
    MONITORING_RATE = 4003,
    ALIVE = 3010 // temporary message code
}

type RunnerMessage = [
    RunnerMessageCode,
    object
];

type RunnerOptions = {
    monitoringInterval?: number
}

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
