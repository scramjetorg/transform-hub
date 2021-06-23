import { configService } from "./config-service";

const PRODUCTION: boolean = !!process.env.PRODUCTION;
const DEVELOPMENT: boolean = !!(process.env.DEVELOPMENT || process.env.SCRAMJET_DEVELOPMENT);

export function development() {
    return !PRODUCTION && DEVELOPMENT;
}

export async function config() {
    return configService.getConfig();
}

export { configService };
