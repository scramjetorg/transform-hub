import { DisconnectReason, ISTHConnectionStore, ISTHController, SthConnectionStoreErrors } from "@scramjet/platform-types";
import { DisconnectHubErrors } from "@scramjet/symbols";
import { MRestAPI } from "@scramjet/types";
import { ReasonPhrases } from "http-status-codes";

export function translateDeleteError(e: any) {
    switch (e.message) {
        case SthConnectionStoreErrors.CONFLICT:
            return {
                opStatus: ReasonPhrases.CONFLICT,
                error: "Conflict"
            };
        case SthConnectionStoreErrors.ID_NOT_FOUND:
            return {
                opStatus: ReasonPhrases.NOT_FOUND,
                error: "STH with a given ID was not found"
            };
        case SthConnectionStoreErrors.NATIVE_HUB:
            return {
                opStatus: ReasonPhrases.BAD_REQUEST,
                error: "Unable to delete native hub"
            };
        case SthConnectionStoreErrors.CONNECTED:
            return {
                opStatus: ReasonPhrases.CONFLICT,
                error: "Cannot delete selected hub as it is still connected"
            };
        case SthConnectionStoreErrors.ID_NOT_PROVIDED:
            return {
                opStatus: ReasonPhrases.BAD_REQUEST,
                error: "STH ID was not provided"
            };
        default:
            return {
                opStatus: ReasonPhrases.INTERNAL_SERVER_ERROR
            };
    }
}
export const validateDisconnectRequest = (
    payload: MRestAPI.PostDisconnectPayload,
    sthConnectionStore: ISTHConnectionStore): DisconnectHubErrors | undefined => {

    if (!Object.keys(payload).length) {
        return DisconnectHubErrors.BAD_REQUEST;
    }
    if (payload.id) {
        const sthController = sthConnectionStore.getById(payload.id);

        if (sthController === undefined) return DisconnectHubErrors.STH_NOT_FOUND;
        if (sthController && sthController.selfHosted === false) return DisconnectHubErrors.NATIVE_HUB;
        if (sthController.disconnected) return DisconnectHubErrors.ALREADY_DISCONNECTED;
    }
    if (payload.accessKey) {
        if (!sthConnectionStore.getByAccessKey(payload.accessKey).length) {
            return DisconnectHubErrors.KEY_NOT_FOUND;
        }
    }
    return undefined;
};

export function translateDisconnectError(error: DisconnectHubErrors): MRestAPI.PostDisconnectResponse {
    switch (error) {
        case DisconnectHubErrors.BAD_REQUEST:
            return {
                opStatus: ReasonPhrases.BAD_REQUEST,
                error: "Received empty request body"
            };
        case DisconnectHubErrors.STH_NOT_FOUND:
            return {
                opStatus: ReasonPhrases.NOT_FOUND,
                error: "Couldn't find STH with a given ID"
            };
        case DisconnectHubErrors.KEY_NOT_FOUND:
            return {
                opStatus: ReasonPhrases.NOT_FOUND,
                error: "Couldn't find any STH connected with that Access Key"
            };
        case DisconnectHubErrors.ALREADY_DISCONNECTED:
            return {
                opStatus: ReasonPhrases.CONFLICT,
                error: "STH with a given id is already disconnected"
            };
        case DisconnectHubErrors.NATIVE_HUB:
            return {
                opStatus: ReasonPhrases.BAD_REQUEST,
                error: "Unable to disconnect native hub"
            };
        default:
            return {
                opStatus: ReasonPhrases.INTERNAL_SERVER_ERROR,
                error: "Internal server error"
            };
    }
}
export function prepareDisconnectDroplist(
    payload: MRestAPI.PostDisconnectPayload,
    sthConnectionStore: ISTHConnectionStore) {
    const dropList: { sthController: ISTHController, reason: NonNullable<ISTHController["disconnectReason"]> }[] = [];

    if (payload.id) {
        const controller = sthConnectionStore.getById(payload.id);

        if (controller && controller.isConnectionActive && controller.selfHosted) {
            dropList.push({ sthController: controller, reason: "id_drop" });
        }
    }

    if (payload.accessKey) {
        dropList.push(
            ...sthConnectionStore.getByAccessKey(payload.accessKey)
                .filter((sthController) => sthController.isConnectionActive)
                .map(sthController => ({ sthController, reason: "key_revoked" as DisconnectReason }))
        );
    }

    if (payload.limit !== undefined) {
        dropList.push(
            ...sthConnectionStore.list()
                .filter((sthController) => sthController.isConnectionActive && sthController.selfHosted)
                .slice(payload.limit)
                .map(sthController => ({ sthController, reason: "limit_exceeded" as DisconnectReason }))
        );
    }
    return dropList;
}
