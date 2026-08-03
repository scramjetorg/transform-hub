import { Manager } from "./manager";

export async function startManager() {
    const manager = new Manager();

    await manager.main();
}
