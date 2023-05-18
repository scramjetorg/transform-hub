import { STHRestAPI } from "@scramjet/types";
import { getHostClient, getInstance } from "../common";
import { getInstanceId, sessionConfig } from "../config";
import { SequenceClient } from "@scramjet/api-client";
import { defer } from "@scramjet/utility";

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
    lastInstanceId = sessionConfig.lastInstanceId
): Promise<STHRestAPI.SendKillInstanceResponse> => {
    const instanceId = getInstanceId(id);
    const instanseKillResponse = await getInstance(instanceId).kill({ removeImmediately });

    if (lastInstanceId === instanceId) {
        sessionConfig.setLastInstanceId("");
    }
    return instanseKillResponse;
};
export const instanceRestart = async (
    instanceId: string
) => {
    const instanceInfo = await getInstance(instanceId).getInfo();
    const sequenceId = instanceInfo.sequence;
    const sequenceClient = SequenceClient.from(sequenceId, getHostClient());
    const { provides, requires, args } = instanceInfo;
    const appConfig = instanceInfo.appConfig || {};
    const killResponse: STHRestAPI.SendKillInstanceResponse = await instanceKill(instanceId, true);
    let seqStartResponse: STHRestAPI.StartSequenceResponse = { id: "" };
    let ready = false;

    while (!ready) {
        try {
            await getInstance(instanceId).getInfo();
            await defer(100);
        } catch (e:any) {
            if (e.status === "404") {
                ready = true;
                break;
            }
        }
    }

    if (typeof sequenceId === "string") {
        seqStartResponse = await sequenceClient.start({
            instanceId,
            appConfig,
            args,
            inputTopic: requires,
            outputTopic: provides
        });
    }

    return { killResponse, seqStartResponse };
};
