import { ConnectedSTHInfoDetails, Pagination } from "./common";

export type GetListResponse = Pagination & {
      data: {
            id: string,
            info: ConnectedSTHInfoDetails,
            healthy: boolean,
            selfHosted: boolean,
            isConnectionActive: boolean,
            description?: string,
            tags?: string[],
            disconnectReason?: string,
            topics : string[],
            sequences: string[],
            instances: string[],
      }[]
}
