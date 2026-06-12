import type { IObjectLogger, ReadableStream, WritableStream } from "../index";
import type { ISTHController } from "./sth-connection-store";
import { ActorRole, ActorType } from "./service-discovery-symbols";

export type ActorStreamType<R> = R extends ActorRole.PROVIDER ? ReadableStream<any> : WritableStream<any>;

export interface ITopicActor<T extends ActorType, R extends ActorRole> {
    topic: string;
    type: T;
    role: R;
    stream?: ActorStreamType<ActorRole>;
    host?: ISTHController;
    retired: boolean;
}

/**
 * Topic information.
 */
export type Topic = {
    contentType: string;
    actors: ITopicActor<ActorType, ActorRole>[];
};

export interface IServiceDiscovery {
    logger: IObjectLogger;

    /**
     * Registers new Topic actor.
     *
     * @param {ITopicActor<ActorType, ActorRole>} actor
     * @param opts topic options
     */
    register(actor: ITopicActor<ActorType, ActorRole>, opts: { contentType: string }): void;
}
