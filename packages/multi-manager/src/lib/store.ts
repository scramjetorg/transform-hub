export class Store<TYPE> {
    private items = new Map<string, TYPE>();

    add(id: string, item: TYPE) {
        this.items.set(id, item);
    }

    remove(id: string) {
        this.items.delete(id);
    }

    list(): TYPE[] {
        return Array.from(this.items.values());
    }

    getById(id: string): TYPE | undefined {
        return this.items.get(id);
    }

    get size(): number {
        return this.items.size;
    }
}
