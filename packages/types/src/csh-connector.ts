import { MaybePromise } from "./utils";
import { ICommunicationHandler } from "./communication-handler";
import { IComponent } from "./component";

export interface ICSHClient extends IComponent {
    /**
     * ICSHClient is the interface used by the LifeCycle Controller (LCC)
     * to communicate with the Cloud Server Host (CSH).
     */

    /**
     * Initializes the client
     */
    init(id: string): MaybePromise<void>;

    /**
     * Create array of streams on LCC demand than hook streams.
     * @param communicationHandler
     * Temporary log streams to the console.
     */
    hookCommunicationHandler(communicationHandler: ICommunicationHandler): MaybePromise<void>;

    /**
     * Disconnects from a host server.
     */
    disconnect(): Promise<void>;

}
