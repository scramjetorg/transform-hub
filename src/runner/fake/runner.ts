import { StringStream } from "scramjet";
import { MonitoringResponse } from "../../types/runner";

enum MessageCode {
    PONG = 3000,
    PING = 4000,
    STOP = 4001,
    KILL = 4002,
    MONITORING_RATE = 4003
}

type Payload = {
    msgCode?: MessageCode;
}

class Runner {
    private readonly PREFIX = "Received: ";

    private readonly LOGGER_INTERVAL = 5000;

    private readonly MOCK_MESSAGE: MonitoringResponse = {
        healthy: true
    }

    private statusIntervalHandle: NodeJS.Timeout;

    private stream(): void {
        StringStream.from(process.stdin)
            .lines()
            .map((input: string) => this.getPayload(input))
            .map((payload: Payload) => this.readPayload(payload))
            .append("\n")
            .pipe(process.stdout);
    }

    private getPayload(line: string): Payload {
        let data: Payload = { };

        try {
            data = JSON.parse(line);
        } catch (ignore) { /**/ }

        return data;
    }

    private readPayload(payload: Payload) {
        let response: any = {
            received: this.PREFIX + payload.msgCode || "unknown message"
        };

        if (payload.msgCode === MessageCode.KILL) {
            this.handleKillRequest();
        }

        if (payload.msgCode === MessageCode.PING) {
            response = { msgCode: MessageCode.PONG };
        }

        return JSON.stringify({ response });
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

export { Runner, MessageCode, Payload };
