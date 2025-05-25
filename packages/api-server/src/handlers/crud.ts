import { CeroRouter, Handler } from "../lib/definitions";

export function createCrudHandlers(router: CeroRouter): {
    create: Handler;
    read: Handler;
    update: Handler;
    delete: Handler;
    all: Handler;
    head: Handler;
    patch: Handler;
    options: Handler;
    connect: Handler;
    trace: Handler;
} {
    return {
        create: router.post,
        read: router.get,
        update: router.put,
        delete: router.delete,
        all: router.all,
        head: router.head,
        patch: router.patch,
        options: router.options,
        connect: router.connect,
        trace: router.trace,
    };
}
