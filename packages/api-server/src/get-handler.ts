import { SequentialCeroRouter } from "./definitions";
import { MonitoringMessageCode } from "@scramjet/types";
import { CommunicationHandler, MessageDataType } from "@scramjet/model";

export function createGetterHandler(router: SequentialCeroRouter) {
    return <T extends MonitoringMessageCode>(_path: string|RegExp, _op: T, _conn: CommunicationHandler): void => {
        let lastItem: MessageDataType<T>|null = null;

        _conn.addMonitoringHandler(_op, (data) => {
            lastItem = data[1];
            return data;
        });

        router.get(_path, (req, res) => {
            res.end(lastItem);
        });
    };
}
