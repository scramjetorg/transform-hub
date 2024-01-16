import { GetInstanceResponse } from "../rest-api-sth";
import { Pagination } from "./common";

export type GetInstancesResponse = Pagination & { data: GetInstanceResponse[]};
