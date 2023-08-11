import { ConnectedSTHInfoDetails } from "./common";

export type GetListResponse = {
      id: string,
      info: ConnectedSTHInfoDetails,
      healthy: boolean,
      selfHosted: boolean,
      isConnectionActive: boolean,
      description?: string,
      tags?: Array<string>,
      disconnectReason?: string,
      topics : string[],
      sequences: string[],
      instances: string[],
}[]
