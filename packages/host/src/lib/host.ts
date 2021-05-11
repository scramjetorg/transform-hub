import { APIExpose } from "@scramjet/types";

export class Host {
    apiServer: APIExpose;
    csiControllers: { [key: string]: string } = {} // temp: the value type in the map will be a CSI Controller object

    constructor(apiServer: APIExpose) {
        this.apiServer = apiServer;
    }

    main() {
    }
}
