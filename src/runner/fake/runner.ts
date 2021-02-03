import { StringStream } from "scramjet";

type Payload = {
    message?: string
}

class Runner {
    private readonly PREFIX = "Received: ";

    private readonly LOGGER_INTERVAL = 5000;

    private readonly MOCK_MESSAGE: object = {
        healthy: true
    }

    private statusIntervalHandle: NodeJS.Timeout;

    private stream(): void {
        StringStream.from(process.stdin)
            .lines()
            .map((input: string) => {
                let data: Payload = { };

                try {
                    data = JSON.parse(input);
                } catch (ignore) { /**/ }

                return data;
            })
            .map((payload: Payload) => {
                let response = this.PREFIX + payload.message || "unknown message";

                if (payload.message === "kill") {
                    this.handleKillRequest();
                }

                if (payload.message === "ping") {
                    response = "pong";
                }

                return JSON.stringify({ response });
            })
            .append("\n")
            .pipe(process.stdout);
    }

    private logger(): void {
        process.stdout.write(
            JSON.stringify(this.MOCK_MESSAGE) + "\n",
            "utf8"
        );
    }

    private handleKillRequest(): void {
        clearInterval(this.statusIntervalHandle);
        process.exit(0);
    }

    public constructor() {
        this.stream();
        this.statusIntervalHandle = setInterval(
            () => this.logger(),
            this.LOGGER_INTERVAL
        );
    }
}

export { Runner };
