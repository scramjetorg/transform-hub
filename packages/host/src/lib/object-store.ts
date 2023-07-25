// eslint-disable-next-line no-use-before-define
export interface JsonMap { [member: string]: string | number | boolean | null | JsonArray | JsonMap }
export interface JsonArray extends Array<string | number | boolean | null | JsonArray | JsonMap> {}
export type Json = JsonMap | JsonArray | string | number | boolean | null;

export interface IDataStore<ValueType> {
    put(key: string, value: ValueType): ValueType | void;
    get(key: string): ValueType | undefined;

    dump(): Iterable<string>;
    restore(value: string): void;
}

export class ObjectDataStore<ValueType extends Json> implements IDataStore<ValueType> {
    private store: Map<string, ValueType> = new Map();

    put(key: string, value: ValueType) {
        const prevValue = this.store.has(key) ? this.store.get(key) : undefined;

        this.store.set(key, value);

        return prevValue;
    }

    get(key: string) {
        return this.store.get(key);
    }

    restore(value: Iterable<string>): void {
        let lastPart = "";

        for (const chunk of value) {
            const lines = `${lastPart + chunk}`.split("\n");

            lastPart = lines.pop() as string; // empty string on last nl.
            for (const line of lines) this.store.set(...(JSON.parse(line) as [string, ValueType]));
        }
    }

    dump() {
        const entries = this.store.entries();

        return (function* () {
            for (const item of entries)
                yield `${JSON.stringify(item)}\n`;
        })();
    }

    serialize([k, o]: [string, ValueType]): string {
        return JSON.stringify([k, o]);
    }

    deserialize(i: string): [string, ValueType] {
        return JSON.parse(i) as [string, ValueType];
    }
}

/**
 * Object storing Instance controllers.
 */
export const LocalObjectStore: { [key: string]: IDataStore<Json> } = {};

