import { ObjLogger } from "@scramjet/obj-logger";
import { IObjectLogger, ReadableStream, WritableStream } from "@scramjet/runtime-types";
import { MRestAPI } from "@scramjet/api-types";
import { Readable } from "stream";
import {
    ActorRole,
    ActorType,
    ActorStreamType,
    IServiceDiscovery,
    ISTHController,
    ITopicActor,
    Topic,
} from "./types/from-types";
import { TypedEmitter } from "@scramjet/utility";

type TopicActorEvents = {
    update: () => void;
    error: (e: any) => void;
};

export class TopicActor<T extends ActorType, R extends ActorRole>
    extends TypedEmitter<TopicActorEvents>
    implements ITopicActor<T, R> {
    topic: string;
    contentType: string;
    type!: T;
    role!: R;
    stream?: ActorStreamType<R>;
    host: T extends ActorType.HOST ? ISTHController : undefined;
    logger: IObjectLogger;
    handled: boolean = false;
    retired: boolean = false;

    constructor(
        topic: string,
        role: R,
        type: T,
        contentType: string,
        host: T extends ActorType.HOST ? ISTHController : undefined
    ) {
        super();
        this.logger = new ObjLogger("ManagerSD Topic Actor", { id: `${topic}-${role}-${type}${host ? host.id : ""}` });
        this.topic = topic;
        this.type = type;
        this.role = role;
        this.contentType = contentType;
        this.host = host;
    }

    addStream(stream: ActorStreamType<R>): this["stream"] {
        this.stream = stream;

        this.stream
            .on("error", (_error: Error) => {
                this.logger.error("Actor Stream error", this.role, this.type, this.host?.id);
                this.retired = true;
                this.emit("update");
            })
            .on("close", () => {
                this.logger.warn("Actor Stream close", this.role, this.type, this.host?.id);

                if (this.role === ActorRole.PROVIDER) {
                    const readable = this.stream as Readable;

                    if (!readable?.readableEnded) {
                        readable?.once("drain", () => {
                            readable?.unpipe();
                        });
                    }
                }

                this.retired = true;
                this.emit("update");
            });

        return this.stream;
    }

    /**
     * Connects Actor to topic Consumer.
     *
     * @param targetActor target Actor.
     */
    async connectoTo(targetActor: TopicActor<ActorType, ActorRole.CONSUMER>): Promise<void> {
        if (this.type === "host" && targetActor.type === "host" && this.host!.id === targetActor.host!.id) {
            this.logger.trace("Won't connect host to it self");
            return;
        }

        if (this.type === "host" && !this.stream) {
            if (this.role === ActorRole.CONSUMER) {
                const consumerActor = this as TopicActor<ActorType.HOST, ActorRole.CONSUMER>;

                consumerActor.addStream(
                    await this.host!.createDownstreamTopicRequest(targetActor.topic, this.contentType)
                );
            } else {
                const providerActor = this as TopicActor<ActorType.HOST, ActorRole.PROVIDER>;

                providerActor.addStream(
                    await this.host!.createUpstreamTopicRequest(targetActor.topic, this.contentType)
                );
            }
        }

        if (targetActor.type === "host" && !targetActor.stream) {
            if (targetActor.role === ActorRole.CONSUMER) {
                targetActor.addStream(
                    await targetActor.host!.createDownstreamTopicRequest(targetActor.topic, targetActor.contentType)
                );
            } else {
                const targetProvider = targetActor as unknown as TopicActor<ActorType.HOST, ActorRole.PROVIDER>;

                targetProvider.addStream(
                    await targetActor.host!.createUpstreamTopicRequest(targetActor.topic, targetActor.contentType)
                );
            }
        }

        if (this.stream && targetActor.stream) {
            this.logger.debug(
                "Piping",
                this.role, this.type, this.host?.id,
                "...to",
                targetActor.role, targetActor.type, targetActor.host?.id
            );

            let disconnected = false;
            const disconnect = () => {
                this.handled = false;

                if (disconnected) return;

                disconnected = true;
                this.logger.trace(
                    "Disconnecting",
                    this.role, this.type, this.host?.id,
                    "...from",
                    targetActor.role, targetActor.type, targetActor.host?.id
                );
                (this.stream as ReadableStream<any>).unpipe(targetActor.stream as WritableStream<any>);
            };

            targetActor.stream.on("close", () => {
                disconnect();
                targetActor.retired = true;
                this.emit("update");
            });

            this.stream.pipe(targetActor.stream as WritableStream<any>);
        } else {
            this.logger.error("Can't connect", this.role, this.type, this.host?.id);
            this.logger.error("...to", targetActor.role, targetActor.type, targetActor.host?.id);
            this.logger.error("stream present [p, c]", !!this.stream, !!targetActor.stream);
        }
    }
}

export class ServiceDiscovery implements IServiceDiscovery {
    topics = new Map<string, Topic>();
    logger = new ObjLogger("ManagerSD");

    exists(topicName: string) {
        return this.topics.has(topicName);
    }

    /**
     * Manager-owned topic multiplexer.
     *
     * Topic actors are live providers and consumers. The Manager does not cache,
     * replay, or otherwise persist topic payloads; it only wires every active
     * provider stream to every active consumer stream while the actors remain
     * connected. Host actors lazily open the required STH topic stream when a
     * matching peer appears.
     */

    /**
     * Creates topic with provided name and content type.
     *
     * @param {string} topicName Topic name
     * @param opts Topic options
     */
    createTopic(topicName: string, opts: { contentType: string }) {
        this.logger.debug("CREATING TOPIC", topicName);
        this.topics.set(topicName, {
            contentType: opts.contentType,
            actors: [],
        });
    }

    /**
     * Finds actors for specified role in topic.
     *
     * @param {ActorRole} role Actor role
     * @param {string} topicName Topic name
     * @returns {TopicActor[]} Actors fulfilling provided criteria
     */
    findRole<R extends ActorRole>(role: R, topicName: string): TopicActor<ActorType, R>[] {
        const topic = this.topics.get(topicName)!;

        return (topic ? topic.actors.filter((a: any) => a.role === role) : []) as TopicActor<ActorType, R>[];
    }

    private updatedTopics: Set<string> = new Set();
    private topicUpdateRunning = false;
    /**
     * Dispatcher: Connects unconnected topic Actors or cleans up connected ones.
     *
     * @param {string} topicName Topic actor to register
     */
    onTopicUpdate(topicName: string) {
        if (!this.updatedTopics.has(topicName))
            this.updatedTopics.add(topicName);

        this.runTopicUpdate();
    }

    private runTopicUpdate() {
        if (this.topicUpdateRunning || this.updatedTopics.size === 0)
            return;

        this.topicUpdateRunning = true;
        const topics = this.updatedTopics;

        this.updatedTopics = new Set();

        Promise.resolve()
            .then(async () => {
                for (const topic of topics) {
                    try {
                        await this.onTopicUpdateWorker(topic);
                    } catch (e) {
                        this.logger.error("Topic update failed", e);
                    }
                }
            })
            .finally(() => {
                this.topicUpdateRunning = false;
                this.runTopicUpdate();
            })
            .catch((e) => {
                this.logger.error("Topic update chain error", e);
            });
    }

    /**
     * Worker: Connects unconnected topic Actors or cleans up connected ones.
     *
     * @param {string} topicName Topic actor to register
     */
    async onTopicUpdateWorker(topicName: string) {
        this.logger.trace("On topic update", topicName);

        if (!this.exists(topicName)) {
            this.logger.warn("Topic to be updated not found.", topicName);
            return;
        }

        const topic = this.topics.get(topicName);

        if (!topic) {
            return;
        }

        topic.actors = topic.actors.filter((actor: any) => {
            if (actor.retired) {
                this.logger.debug("Dropping out actor", actor.role, actor.type, actor.host?.id);
            }

            return !actor.retired;
        });

        if (!topic.actors.length) {
            this.logger.debug("Topic deleted", topicName);
            this.topics.delete(topicName);
            return;
        }

        this.logger.debug("on topic update");

        const providers = this.findRole(ActorRole.PROVIDER, topicName);
        const consumers = this.findRole(ActorRole.CONSUMER, topicName);

        await Promise.all(providers.map(async (provider) => {
            await Promise.all(consumers.map(async (consumer) => {
                if (provider.handled && consumer.handled) {
                    return;
                }

                consumer.handled = true;

                await provider.connectoTo(consumer);
            }));

            provider.handled = true;
        }));
    }

    onUpdate(reason: string) {
        this.logger.info("Updating, reason", reason);
        for (const key of this.topics.keys())
            this.onTopicUpdate(key);
    }

    /**
     * Registers Actor for a given topic.
     *
     * @param {TopicActor} actor Topic actor to register
     * @param opts Topic options
     */
    register(
        actor: TopicActor<ActorType, ActorRole>,
        opts: { contentType: string } = { contentType: "application/json" }
    ) {
        this.logger.debug("Registering topic actor.", {
            topic: actor.topic,
            role: actor.role,
            type: actor.type,
            hostId: actor.host?.id,
            exists: this.exists(actor.topic),
            contentType: actor.contentType || opts.contentType
        });

        if (!this.exists(actor.topic)) {
            this.createTopic(actor.topic, {
                contentType: actor.contentType || opts.contentType
            });
        }

        actor.on("update", () => {
            this.onUpdate("actor onUpdate");
            this.logger.debug("Actor requested an update", {
                topic: actor.topic,
                role: actor.role,
                type: actor.type,
                hostId: actor.host?.id,
                exists: this.exists(actor.topic),
            });
        });

        const hostRegisteredForRole = this.findRole(actor.role, actor.topic).find((a) => {
            return actor.type === "host" && actor.type === a.type && actor.host!.id === a.host!.id;
        });

        this.logger.debug("Host registered for role?", actor.role, actor.topic, !!hostRegisteredForRole);

        if (!hostRegisteredForRole) {
            this.topics.get(actor.topic)!.actors.push(actor);

            actor.logger.pipe(this.logger);
        } else {
            this.logger.warn(
                "Host is already registered for this role in topic.",
                actor.role,
                actor.topic,
                actor.host?.id
            );
        }

        this.onTopicUpdate(actor.topic);
    }

    unregister(
        actor: ITopicActor<ActorType, ActorRole>
    ) {
        actor.retired = true;
        this.onTopicUpdate(actor.topic);
    }

    list(): MRestAPI.GetTopicsResponse {
        return Array.from(this.topics, ([topicName, topic]) => ({
            name: topicName,
            contentType: topic.contentType,
            actors: topic.actors.map((actor: any) => ({
                role: actor.role,
                type: actor.type,
                stream: !!actor.stream,
                hostId: actor.host?.id,
                retired: actor.retired,
            })),
        }));
    }
}
