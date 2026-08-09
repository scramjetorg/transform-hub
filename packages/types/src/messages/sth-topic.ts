type Status = "add" | "remove";

type BaseSTHTopicEventData = {
    status: Status;
    topicName: string;
}

export type AddSTHTopicEventData = BaseSTHTopicEventData & {
    contentType: string;
    localProvider?: string;
    status: "add";
} & (
    { requires: string; provides?: never }
    | { provides: string; requires?: never }
    | { requires?: never; provides?: never }
);

export type RemoveSTHTopicEventData = BaseSTHTopicEventData & {
    status: "remove";
}

export type STHTopicEventData = AddSTHTopicEventData | RemoveSTHTopicEventData;
