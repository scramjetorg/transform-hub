import { STHRestAPI } from "@scramjet/types";
import { getInstance } from "../common";
import { getInstanceId, sessionConfig } from "../config";

/**
 * Wraper for kill instance method with config safety checks.
 * 
 * @param id Id of instance or '-' for last used
 * @param removeImmediately If true, Instance lifetime extension delay will be bypassed.
 * @param lastInstanceId Id of last used instance in session
 * @returns Promise resolving to kill Instance result.
 */
export const instanceKill = async (
    id: string,
    removeImmediately: boolean = false,
    lastInstanceId = sessionConfig.getConfig().lastInstanceId
): Promise<STHRestAPI.SendKillInstanceResponse> => {
    const instanceId = getInstanceId(id);
    const instanseKillResponse = await getInstance(instanceId).kill({ removeImmediately });

    if (lastInstanceId === instanceId) {
        sessionConfig.setLastInstanceId("");
    }
    return instanseKillResponse;
};
