import { CeroRouter, Handler } from "../lib/definitions";

export function createCrudHandlers(router: CeroRouter): {
    create: Handler;
    read: Handler;
    update: Handler;
    delete: Handler;
} {
    return {
        create: router.post,
        read: router.get,
        update: router.put,
        delete: router.delete
    };
};