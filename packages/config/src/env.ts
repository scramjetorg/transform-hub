export function development(env: NodeJS.ProcessEnv = process.env): boolean {
    return !env.PRODUCTION && !!(env.DEVELOPMENT || env.SCRAMJET_DEVELOPMENT);
}
