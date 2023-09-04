import { sessionConfig } from "../config";
import { displayMessage } from "../output";
import { getMiddlewareClient } from "../platform";

export async function getInfo() {
    const { lastSpaceId: space, lastHubId: id } = sessionConfig.get();
    const managerClient = getMiddlewareClient().getManagerClient(space);
    const hosts = await managerClient.getHosts();
    const host = hosts.find((h: any) => h.id === id);

    return { managerClient, host, hosts };
}

export async function setDefaultHub(): Promise<void> {
    const info = await getInfo();
    const hosts = info.hosts;

    if (!info.host && hosts.length) {
        const nativeHub = hosts.find((element) => {
            return element.selfHosted === false && element.healthy === true;
        });

        if (nativeHub) {
            sessionConfig.setLastHubId(nativeHub.id);
            displayMessage(`Set default hub to ${nativeHub.id} because deleted hub was set as default in cli`);
        }
    }
}
