/**
 * Sequence adapter interface.
 *
 * Simplified structural copy from the old types package/sequence-adapter.ts.
 */

export interface ISequenceAdapter {
    name: string;
    init(): Promise<void>;
    list(): Promise<any[]>;
    identify(stream: any, id: string, override?: boolean): Promise<any>;
    remove(config: any): Promise<void>;
    logger: any;
}
