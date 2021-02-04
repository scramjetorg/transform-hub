import { StringStream } from "scramjet";

enum MessageCode {
    PONG = 3000,
    ACKNOWLEDGE = 3004,
    PING = 4000,
    STOP = 4001,
    KILL = 4002,
    MONITORING_RATE = 4003,
    ALIVE = 3010 // temporary message code
}

type Payload = [
    MessageCode,
    object
];

class Runner {
    private readonly LOGGER_INTERVAL = 5000;

    private readonly MOCK_MESSAGE: Payload = [
        MessageCode.ALIVE,
        {
            healthy: true
        }
    ]

    private statusIntervalHandle: any;

    stream(): void {
        StringStream.from(process.stdin)
            .lines()
            .map((input: string) => this.getPayload(input))
            .map((payload: Payload) => this.readPayload(payload))
            .append("\n")
            .pipe(process.stdout);
    }

    getPayload(line: string): Payload {
        let data: Payload = [0, {}];

        try {
            data = JSON.parse(line);
        } catch (ignore) { /**/ }

        return data;
    }

    readPayload(payload: Payload): string {
        let response: Payload = [
            MessageCode.ACKNOWLEDGE,
            { received: payload[0] || "unknown message" }
        ];

        if (payload[0] === MessageCode.KILL) {
            this.handleKillRequest();
        }

        if (payload[0] === MessageCode.PING) {
            response = [
                MessageCode.PONG,
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
        clearInterval(this.statusIntervalHandle);
        process.exit(0);
    }

    start(): void {
        this.stream();
        this.statusIntervalHandle = setInterval(
            this.logger.bind(this),
            this.LOGGER_INTERVAL
        );
    }
}

export { Runner, MessageCode, Payload };
